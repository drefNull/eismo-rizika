import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import type { AccidentData, AccidentPoint } from '../types';

function yearColor(yr: number, allYears: number[]): string {
  const idx = allYears.indexOf(yr);
  const t = allYears.length > 1 ? idx / (allYears.length - 1) : 0.5;
  const hue = Math.round(220 - t * 220);
  return `hsl(${hue}, 78%, 50%)`;
}

type VisibleFeature =
  | Supercluster.PointFeature<AccidentPoint>
  | Supercluster.ClusterFeature<Supercluster.AnyProps>;

function isClusterFeature(feature: VisibleFeature): feature is Supercluster.ClusterFeature<Supercluster.AnyProps> {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
}

function clusterRadius(count: number) {
  if (count < 20) return 8;
  if (count < 80) return 11;
  if (count < 250) return 14;
  return 17;
}

function accidentTooltip(p: AccidentPoint, yr: number) {
  const sevClr =
    p.severity === 'fatal' ? '#d73027' :
    p.severity === 'injury' ? '#fc8d59' : '#6b7280';

  let subtype = '';
  if (p.schema1 && p.schema1 !== p.atype) {
    subtype = p.schema2 && p.schema2 !== p.schema1 ? `${p.schema1} > ${p.schema2}` : p.schema1;
  } else if (p.schema2 && p.schema2 !== p.atype) {
    subtype = p.schema2;
  }

  const rows: string[] = [];
  if (p.killed > 0) rows.push(`<tr><td class="t-k">Žuvo</td><td class="t-v">${p.killed}</td></tr>`);
  if (p.injured > 0) rows.push(`<tr><td class="t-k">Sužeistų</td><td class="t-v">${p.injured}</td></tr>`);
  if (!p.killed && !p.injured) rows.push(`<tr><td class="t-k">Nukentėjusių</td><td class="t-v">Nėra</td></tr>`);
  if (p.weather) rows.push(`<tr><td class="t-k">Orai</td><td class="t-v">${p.weather}</td></tr>`);
  if (p.surface) rows.push(`<tr><td class="t-k">Danga</td><td class="t-v">${p.surface}</td></tr>`);
  if (p.time_of_day) rows.push(`<tr><td class="t-k">Metas</td><td class="t-v">${p.time_of_day}</td></tr>`);
  if (p.culprit_ages.length > 0) rows.push(`<tr><td class="t-k">Kaltininkų amžius</td><td class="t-v">${p.culprit_ages.join(', ')}</td></tr>`);

  return `<div style="word-break:break-word;white-space:normal">
    <div class="tt-chip" style="background:${sevClr};color:#fff">${p.date || `${yr}`}</div>
    ${p.atype ? `<div class="tt-streets" style="margin-top:5px">${p.atype}</div>` : ''}
    ${subtype ? `<div style="font-size:12px;color:#5b6170;margin-bottom:4px;line-height:1.4">${subtype}</div>` : ''}
    ${p.drunk ? `<div style="font-size:11px;font-weight:700;color:#92400e;margin:4px 0;padding:2px 6px;background:#fef3c7;border-radius:3px">Neblaivus kaltininkas${p.culprit_bac.length > 0 ? ` Promilės: ${p.culprit_bac.join(', ')}` : ''}</div>` : ''}
    <table style="margin-top:5px"><tbody>${rows.join('')}</tbody></table>
  </div>`;
}

function clusterTooltip(count: number, yr: number, clr: string) {
  return `<div style="min-width:150px">
    <div class="tt-chip" style="background:${clr};color:#fff">Avarijos ${yr}</div>
    <div class="tt-streets" style="margin-top:5px">${count.toLocaleString('lt-LT')} įvykiai</div>
    <div style="margin-top:6px;color:#475569">Priartinkite, kad matytumėte pavienius taškus.</div>
  </div>`;
}

function AccidentLayers({
  accidents,
  activeYears,
  heatVisible,
  years,
}: {
  accidents: AccidentData | null;
  activeYears: Set<number>;
  heatVisible: boolean;
  years: number[];
}) {
  const map = useMap();
  const renderer = useRef(L.canvas({ padding: 0.5 })); // SVG chokes above ~5k points, canvas handles the density
  const yrLayers = useRef<Partial<Record<number, L.GeoJSON>>>({});
  const yrIndexes = useRef<Partial<Record<number, Supercluster<AccidentPoint>>>>({});
  const heatLayerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!accidents) {
      yrIndexes.current = {};
      return;
    }

    const next: Partial<Record<number, Supercluster<AccidentPoint>>> = {};

    years.forEach(yr => {
      const points: Supercluster.PointFeature<AccidentPoint>[] = (accidents.by_year[String(yr)] || []).map(pt => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] },
        properties: pt,
      }));

      next[yr] = new Supercluster<AccidentPoint>({
        radius: 56,
        minPoints: 6,
        maxZoom: 15,
      }).load(points);
    });

    yrIndexes.current = next;
  }, [accidents, years]);

  useEffect(() => {
    function removeYearLayers() {
      Object.keys(yrLayers.current).forEach(k => {
        const layer = yrLayers.current[Number(k)];
        if (layer && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
    }

    return removeYearLayers;
  }, [map]);

  useEffect(() => {
    if (!accidents) return;

    function getYearLayer(yr: number) {
      if (yrLayers.current[yr]) return yrLayers.current[yr]!;

      const clr = yearColor(yr, years);
      const layer = L.geoJSON(undefined, {
        renderer: renderer.current as unknown as L.Renderer,
        pointToLayer: (feat: GeoJSON.Feature, ll: L.LatLng) => {
          const visible = feat as VisibleFeature;

          if (isClusterFeature(visible)) {
            return L.circleMarker(ll, {
              radius: clusterRadius(visible.properties.point_count),
              fillColor: clr,
              color: '#ffffff',
              weight: 1.2,
              fillOpacity: 0.5,
            });
          }

          return L.circleMarker(ll, {
            radius: 4,
            fillColor: clr,
            color: 'rgba(255,255,255,0.45)',
            weight: 0.5,
            fillOpacity: 0.72,
          });
        },
        onEachFeature: (feat: GeoJSON.Feature, lyr: L.Layer) => {
          const visible = feat as VisibleFeature;

          if (isClusterFeature(visible)) {
            const { cluster_id: clusterId, point_count: count } = visible.properties;

            lyr.bindTooltip(clusterTooltip(count, yr, clr), { sticky: true, className: 'rr-tt' });
            lyr.on('click', () => {
              const index = yrIndexes.current[yr];
              if (!index) return;

              const targetZoom = Math.min(index.getClusterExpansionZoom(clusterId), map.getMaxZoom());
              const [lon, lat] = visible.geometry.coordinates;
              map.flyTo([lat, lon], targetZoom, { duration: 0.35 });
            });
            return;
          }

          lyr.bindTooltip(accidentTooltip(visible.properties, yr), { sticky: true, className: 'rr-tt' });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      yrLayers.current[yr] = layer;
      return layer;
    }

    function refreshYears() {
      const padded = map.getBounds().pad(0.2); // fetch slightly outside the viewport so clusters don't pop in while panning
      const box: GeoJSON.BBox = [padded.getWest(), padded.getSouth(), padded.getEast(), padded.getNorth()];
      const zoom = Math.round(map.getZoom());

      years.forEach(yr => {
        const layer = getYearLayer(yr);

        if (!activeYears.has(yr)) {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          return;
        }

        const index = yrIndexes.current[yr];
        if (!index) return;

        const features = index.getClusters(box, zoom);
        layer.clearLayers();
        layer.addData({
          type: 'FeatureCollection',
          features,
        } as GeoJSON.FeatureCollection);

        if (!map.hasLayer(layer)) {
          map.addLayer(layer);
        }
      });
    }

    refreshYears();
    map.on('moveend', refreshYears);
    map.on('resize', refreshYears);

    return () => {
      map.off('moveend', refreshYears);
      map.off('resize', refreshYears);
    };
  }, [accidents, activeYears, map, years]);

  useEffect(() => {
    if (!accidents || !heatVisible) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current as L.Layer);
        heatLayerRef.current = null;
      }
      return;
    }

    const allCoords = Object.values(accidents.by_year)
      .flat()
      .map(pt => [pt.lat, pt.lon] as [number, number]);

    function addHeat() {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current as L.Layer);
      heatLayerRef.current = (L as unknown as { heatLayer: (pts: [number, number][], opts: object) => L.Layer })
        .heatLayer(allCoords, { radius: 14, blur: 18, minOpacity: 0.3 })
        .addTo(map);
    }

    if ((L as unknown as Record<string, unknown>).heatLayer) {
      addHeat();
    } else {
      // no ESM package for leaflet-heat, load it lazily on first toggle
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
      script.onload = addHeat;
      document.head.appendChild(script);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current as L.Layer);
        heatLayerRef.current = null;
      }
    };
  }, [accidents, heatVisible, map]);

  return null;
}

export default function MapPage() {
  const [accidents, setAccidents] = useState<AccidentData | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [activeYears, setActiveYears] = useState<Set<number>>(new Set());
  const [heatVisible, setHeatVisible] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 720);
  const [loading, setLoading] = useState(true);
  const heatAutoDismissed = useRef(false);

  useEffect(() => {
    fetch('/data/accidents.json').then(r => r.json()).then((acc: AccidentData) => {
      setAccidents(acc);
      const yrs = Object.keys(acc.by_year).map(Number).sort((a, b) => a - b);
      setYears(yrs);
      if (Object.values(acc.by_year).some(pts => pts.length > 0)) {
        setHeatVisible(true);
      }
      setLoading(false);
    });
  }, []);

  const hasAccidents = Boolean(accidents && Object.values(accidents.by_year).some(pts => pts.length > 0));

  function toggleYear(yr: number) {
    setActiveYears(prev => {
      const next = new Set(prev);
      if (next.has(yr)) {
        next.delete(yr);
      } else {
        next.add(yr);
        if (heatVisible && !heatAutoDismissed.current) {
          heatAutoDismissed.current = true;
          setHeatVisible(false);
        }
      }
      return next;
    });
  }

  return (
    <div className="map-wrapper">
      {loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 500, background: '#f5f2ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, color: '#5b6170' }}>Kraunama...</span>
        </div>
      )}
      <MapContainer center={[55.1694, 23.8813]} zoom={7} preferCanvas style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <AccidentLayers
          accidents={accidents}
          activeYears={activeYears}
          heatVisible={heatVisible}
          years={years}
        />
      </MapContainer>

      <div className={`rr-panel${panelOpen ? '' : ' hidden'}`}>
        <div className="rr-hdr">
          <div className="rr-hero-copy">
            <div className="rr-kicker">Sluoksniai</div>
            <div className="rr-title">Lietuvos eismo įvykiai</div>
          </div>
          <button className="rr-close-btn" onClick={() => setPanelOpen(false)} title="Uždaryti skydelį">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {hasAccidents && (
          <div className="rr-sec">
            <div className="rr-lbl">Eismo įvykių sluoksniai</div>
            <div className="rr-sub" style={{ marginBottom: 12 }}>
              Toliau atitraukus žemėlapį taškai grupuojami, priartinus matysi pavienius įvykius.
            </div>
            <button
              className={`lyr-btn${heatVisible ? ' on' : ''}`}
              onClick={() => setHeatVisible(v => !v)}
            >
              <span className="lyr-swatch" style={{ background: '#f46d43' }} />
              <span className="lyr-copy">
                <strong>Šilumos žemėlapis</strong>
                <small>Visų metų avarijų tankis</small>
              </span>
              <span className="lyr-state">{heatVisible ? 'Rodoma' : 'Išjungta'}</span>
            </button>
            {years.map(yr => (
              <button
                key={yr}
                className={`lyr-btn${activeYears.has(yr) ? ' on' : ''}`}
                onClick={() => toggleYear(yr)}
              >
                <span className="lyr-swatch" style={{ background: yearColor(yr, years) }} />
                <span className="lyr-copy">
                  <strong>Eismo įvykiai {yr}</strong>
                  <small>Istoriniai taškai žemėlapyje</small>
                </span>
                <span className="lyr-state">{activeYears.has(yr) ? 'Rodoma' : 'Išjungta'}</span>
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="rr-sec">
            <div className="rr-lbl">Eismo įvykių sluoksniai</div>
            <div className="rr-sub">Kraunama...</div>
          </div>
        )}
        {!loading && !hasAccidents && (
          <div className="rr-sec">
            <div className="rr-lbl">Eismo įvykių sluoksniai</div>
            <div className="rr-sub">Avarijų duomenų nerasta.</div>
          </div>
        )}

        <div className="rr-note">
          Kai kurie taškai gali patekti ant pastatų. Eismo įvykių vieta fiksuojama pagal artimiausią pastato adresą, o ne tikslią kelio vietą.
        </div>

        <div className="rr-source">
          Duomenų šaltinis:{' '}
          <a href="https://data.gov.lt/datasets/509/?resource_version=1290" target="_blank" rel="noopener noreferrer">
            data.gov.lt, Eismo įvykiai Lietuvoje
          </a>
          {', '}licencija{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
          . Duomenys apdoroti.
        </div>
        <div className="rr-source" style={{ marginTop: 6 }}>
          Atviro kodo projektas –{' '}
          <a href="https://github.com/drefNull/eismo-rizika" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . Apsaugota{' '}
          <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">
            Apache 2.0
          </a>{' '}
          licencija.
        </div>
      </div>

      <button
        className={`rr-tab${panelOpen ? '' : ' show'}`}
        onClick={() => setPanelOpen(true)}
        title="Atidaryti sluoksnius"
      >
        <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
          <path d="M7 1L2 7l5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="rr-tab-label">Sluoksniai</span>
      </button>
    </div>
  );
}
