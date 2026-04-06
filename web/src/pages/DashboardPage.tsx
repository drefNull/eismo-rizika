import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart, LineChart,
} from 'recharts';
import type { StatsData } from '../types';

const fmt = (n: number) => n.toLocaleString('lt-LT');
const fmtK = (n: number) => `${(n / 1000).toFixed(0)} tūkst`;
const fmtPct = (part: number, total: number) => `${((part / total) * 100).toFixed(1)}%`;

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 540);

  useEffect(() => {
    fetch('/data/stats.json').then(r => r.json()).then(setStats);
  }, []);

  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 540);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  if (!stats) return <div className="dashboard"><div className="dash-header"><h1>Kraunama…</h1></div></div>;

  const { summary } = stats;
  const drunkPct = fmtPct(summary.drunk, summary.total);

  const weather = stats.by_weather.filter(d => d.name !== 'Nenurodyta');
  const surface = stats.by_surface.filter(d => d.name !== 'Nenurodyta');
  const timeOfDay = stats.by_time_of_day.filter(d => d.name !== 'Nenurodyta');
  const accTypes = stats.by_type.filter(d => d.name !== 'Nenurodyta').slice(0, 9);
  const municipalities = stats.by_municipality.slice(0, 15);
  const drunkByYear = stats.by_year.filter(d => d.drunk > 5);
  const roadTypes = stats.by_road_type.filter(d => d.name !== 'Nenurodyta');
  const peakYear = stats.by_year.reduce((best, row) => row.total > best.total ? row : best, stats.by_year[0]);
  const deadliestYear = stats.by_year.reduce((best, row) => row.deaths > best.deaths ? row : best, stats.by_year[0]);
  const busiestHour = stats.by_hour.reduce((best, row) => row.count > best.count ? row : best, stats.by_hour[0]);
  const topMunicipality = municipalities[0];
  const topType = accTypes[0];
  const topWeather = weather[0];
  const seatbeltTotal = stats.by_seatbelt.reduce((sum, row) => sum + row.count, 0);
  const seatbeltOn = stats.by_seatbelt.find(row => row.name === 'Užsegtas')?.count ?? 0;
  const seatbeltPct = seatbeltTotal ? fmtPct(seatbeltOn, seatbeltTotal) : '0.0%';
  const roadLead = roadTypes[0]?.count ?? 1;
  const roadColors = ['#d73027', '#fc8d59', '#4575b4', '#74add1'];
  const roadDesc: Record<string, string> = {
    'Magistraliniai keliai': 'Tarptautiniai ir pagrindiniai tarpmiestiniai keliai (A kategorija)',
    'Krašto keliai': 'Jungia apskričių ir rajonų centrus tarpusavyje',
    'Rajoniniai keliai': 'Jungia miestelius ir kaimus rajono viduje',
    'Vietiniai keliai': 'Savivaldybių keliai, jungia kaimus su rajoniniais keliais',
  };

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div className="dash-header">
          <h1>Lietuvos kelių eismo įvykių statistika nuo 2013 m. iki 2024 m.</h1>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-total">
          <div className="stat-meta">Bendra apimtis</div>
          <div className="stat-n">{fmt(summary.total)}</div>
          <div className="stat-l">Eismo įvykiai iš viso</div>
          <div className="stat-note">Didžiausias metinis kiekis užfiksuotas {peakYear.year} m.</div>
        </div>
        <div className="stat-card stat-card-deaths">
          <div className="stat-meta">Netektys</div>
          <div className="stat-n" style={{ color: '#d73027' }}>{fmt(summary.deaths)}</div>
          <div className="stat-l">Žuvo</div>
          <div className="stat-note">Daugiausia žuvusiųjų buvo {deadliestYear.year} m.</div>
        </div>
        <div className="stat-card stat-card-injured">
          <div className="stat-meta">Traumos</div>
          <div className="stat-n">{fmt(summary.injured)}</div>
          <div className="stat-l">Sužeista</div>
          <div className="stat-note">Piko metais sužeista {fmt(peakYear.injured)} žmonių.</div>
        </div>
        <div className="stat-card stat-card-drunk">
          <div className="stat-meta">Rizikos veiksnys</div>
          <div className="stat-n" style={{ color: '#d73027' }}>{drunkPct}</div>
          <div className="stat-l">Su neblaiviu kaltininku</div>
          <div className="stat-note">{fmt(summary.drunk)} atvejai per visą laikotarpį.</div>
        </div>
      </div>

      <div className="dash-lead-grid dash-section">
        <div className="chart-card chart-card-hero">
          <h2>Statistika pagal metus</h2>
          <ResponsiveContainer width="100%" height={narrow ? 240 : 320}>
            <ComposedChart data={stats.by_year} margin={{ top: 5, right: 18, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#5b6170' }} />
              <YAxis yAxisId="l" tickFormatter={fmtK} tick={{ fontSize: 12, fill: '#5b6170' }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12, fill: '#5b6170' }} />
              <Tooltip formatter={(v, name) => [fmt(v as number), name]} />
              <Legend />
              <Bar yAxisId="l" dataKey="total" name="Įvykiai" fill="#6b7280" opacity={0.4} radius={[10, 10, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="r" type="monotone" dataKey="injured" name="Sužeista" stroke="#fc8d59" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="r" type="monotone" dataKey="deaths" name="Žuvo" stroke="#d73027" strokeWidth={3} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card dash-insight-card">
          <h2>Kas išsiskiria</h2>
          <div className="dash-insight-list">
            <div className="dash-insight-row">
              <span className="dash-insight-k">Piko valanda</span>
              <strong>{String(busiestHour.hour).padStart(2, '0')}:00</strong>
              <span>{fmt(busiestHour.count)} įvykiai</span>
            </div>
            <div className="dash-insight-row">
              <span className="dash-insight-k">Dažniausia rūšis</span>
              <strong>{topType?.name ?? 'Nėra duomenų'}</strong>
              <span>{topType ? fmt(topType.count) : '0'} įvykiai</span>
            </div>
            <div className="dash-insight-row">
              <span className="dash-insight-k">Dažniausios oro sąlygos</span>
              <strong>{topWeather?.name ?? 'Nėra duomenų'}</strong>
              <span>{topWeather ? fmt(topWeather.count) : '0'} įvykiai</span>
            </div>
            <div className="dash-insight-row">
              <span className="dash-insight-k">Aktyviausia savivaldybė</span>
              <strong>{topMunicipality?.name ?? 'Nėra duomenų'}</strong>
              <span>{topMunicipality ? fmt(topMunicipality.count) : '0'} įvykiai</span>
            </div>
          </div>

          <div className="dash-mini-bars">
            {roadTypes.slice(0, 4).map((road, i) => (
              <div key={road.name} className="dash-mini-bar">
                <div className="dash-mini-bar-head">
                  <div>
                    <span>{road.name}</span>
                    {roadDesc[road.name] && <div className="dash-mini-bar-desc">{roadDesc[road.name]}</div>}
                  </div>
                  <strong>{fmt(road.count)}</strong>
                </div>
                <div className="dash-mini-bar-track">
                  <span
                    className="dash-mini-bar-fill"
                    style={{ width: `${(road.count / roadLead) * 100}%`, background: roadColors[i] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="dash-insight-foot">
            Užsegtas saugos diržas pažymėtas {seatbeltPct} įrašų, kuriuose ši reikšmė nurodyta.
          </div>
        </div>
      </div>

      <div className="dash-2col dash-section">
        <div className="chart-card">
          <h2>Įvykiai pagal paros valandą</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.by_hour} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hour" ticks={[0, 6, 12, 18, 23]} tickFormatter={h => `${h}:00`} />
              <YAxis tickFormatter={fmtK} width={70} />
              <Tooltip
                labelFormatter={h => `${h}:00-${String(h).padStart(2, '0')}:59`}
                formatter={v => [fmt(v as number), 'Įvykiai']}
              />
              <Bar dataKey="count" fill="#4575b4" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-stack">
          <div className="chart-card">
            <h2>Įvykiai pagal paros metą</h2>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={timeOfDay} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={narrow ? 95 : 145} tick={{ fontSize: narrow ? 10 : 12 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Įvykiai']} />
                <Bar dataKey="count" fill="#74add1" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h2>Įvykiai pagal oro sąlygas</h2>
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={weather} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={narrow ? 80 : 115} tick={{ fontSize: narrow ? 10 : 12 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Įvykiai']} />
                <Bar dataKey="count" fill="#74add1" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dash-2col dash-section">
        <div className="chart-card">
          <h2>Eismo įvykių rūšys</h2>
          <ResponsiveContainer width="100%" height={narrow ? 220 : 290}>
            <BarChart data={accTypes} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tickFormatter={fmtK} />
              <YAxis type="category" dataKey="name" width={narrow ? 130 : 210} tick={{ fontSize: narrow ? 9 : 11 }} />
              <Tooltip formatter={v => [fmt(v as number), 'Įvykiai']} />
              <Bar dataKey="count" fill="#d73027" radius={[0, 3, 3, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-stack">
          <div className="chart-card">
            <h2>Įvykiai pagal kelio dangą</h2>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={surface} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={narrow ? 70 : 100} tick={{ fontSize: narrow ? 10 : 12 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Įvykiai']} />
                <Bar dataKey="count" fill="#fee08b" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h2>Neblaivūs kaltininkai pagal metus</h2>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={drunkByYear} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Neblaivūs kaltininkai']} />
                <Line type="monotone" dataKey="drunk" stroke="#d73027" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dash-2col dash-section">
        <div className="chart-card">
          <h2>Dalyviai pagal kategoriją</h2>
          <ResponsiveContainer width="100%" height={narrow ? 200 : 270}>
            <BarChart data={stats.by_participant_category} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tickFormatter={fmtK} />
              <YAxis type="category" dataKey="name" width={narrow ? 130 : 210} tick={{ fontSize: narrow ? 9 : 11 }} />
              <Tooltip formatter={v => [fmt(v as number), 'Dalyviai']} />
              <Bar dataKey="count" fill="#4575b4" radius={[0, 3, 3, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-stack">
          <div className="chart-card">
            <h2>Dalyvių lytis</h2>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={stats.by_gender} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Dalyviai']} />
                <Bar dataKey="count" fill="#74add1" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h2>Dalyvių saugos diržas</h2>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={stats.by_seatbelt} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => [fmt(v as number), 'Dalyviai']} />
                <Bar dataKey="count" fill="#fee08b" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-card dash-section">
        <h2>Dalyvių amžiaus grupės</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.by_age_group} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="group" />
            <YAxis tickFormatter={fmtK} width={70} />
            <Tooltip formatter={v => [fmt(v as number), 'Dalyviai']} />
            <Bar dataKey="count" fill="#6b7280" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card dash-section">
        <h2>Top 15 savivaldybių pagal eismo įvykių skaičių</h2>
        <ResponsiveContainer width="100%" height={narrow ? 300 : 380}>
          <BarChart data={municipalities} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <XAxis type="number" tickFormatter={fmtK} />
            <YAxis type="category" dataKey="name" width={narrow ? 120 : 185} tick={{ fontSize: narrow ? 10 : 12 }} />
            <Tooltip formatter={v => [fmt(v as number), 'Įvykiai']} />
            <Bar dataKey="count" fill="#4575b4" radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="dash-source">
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
      <div className="dash-source">
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
  );
}
