import json
import pandas as pd
import geopandas as gpd
import io
import tempfile
import zipfile
import requests
from shapely.geometry import Point, box
from utils import PROJECT_ROOT

RAW_509 = PROJECT_ROOT / "data" / "raw" / "509"
PROCESSED = PROJECT_ROOT / "data" / "processed"
OUT = PROCESSED / "accidents_lithuania.gpkg"

BORDER_PATH = PROJECT_ROOT / "data" / "raw" / "lithuania_land.gpkg"


def _lithuania_land_polygon():
    if BORDER_PATH.exists():
        return gpd.read_file(BORDER_PATH).geometry.iloc[0]

    import osmnx as ox

    print("  Downloading Natural Earth 10m land polygon...")
    resp = requests.get(
        "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip", timeout=60
    )
    resp.raise_for_status()
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            zf.extractall(tmp)
        ne_land = gpd.read_file(f"{tmp}/ne_10m_land.shp")

    lt_bbox = box(20.5, 53.5, 27.5, 57.0)
    ne_clip = ne_land[ne_land.intersects(lt_bbox)].union_all().intersection(lt_bbox)

    lt_admin = ox.geocode_to_gdf("Lithuania").geometry.iloc[0]
    lagoon = ox.geocode_to_gdf("Kuršių marios").geometry.iloc[0]  # NE land includes the lagoon; subtract it
    land = lt_admin.intersection(ne_clip).difference(lagoon)

    gpd.GeoDataFrame(geometry=[land], crs="EPSG:4326").to_file(BORDER_PATH, driver="GPKG")
    print(f"  Cached Lithuania land polygon → {BORDER_PATH}")
    return land


def fetch():
    PROCESSED.mkdir(parents=True, exist_ok=True)

    seen = set()
    rows = []

    for path in sorted(RAW_509.glob("ei_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))

        for r in data:
            rid = r.get("registrokodas")
            if rid:
                if rid in seen:
                    continue
                seen.add(rid)

            x = r.get("platuma")  # LKS94 easting
            y = r.get("ilguma")   # LKS94 northing
            if x is None or y is None:
                continue

            dt = r.get("dataLaikas") or ""
            yr_str = dt[:4] if len(dt) >= 4 and dt[:4].isdigit() else path.stem.split("_")[1]  # some records have no timestamp; fall back to filename year
            if not (2013 <= int(yr_str) <= 2024):
                continue

            killed = int(r.get("zuvusiuSkaicius") or 0)
            injured = int(r.get("suzeistuSkaicius") or 0)

            if killed > 0:
                severity = "fatal"
            elif injured > 0:
                severity = "injury"
            else:
                severity = "property"

            culprit_ages = []
            culprit_bac = []
            for d in (r.get("eismoDalyviai") or []):
                if d.get("kaltininkas") == "Taip":
                    age = d.get("amzius")
                    if isinstance(age, (int, float)) and 0 < age <= 100:
                        culprit_ages.append(int(age))
                    bac = d.get("girtumasPromilemis")
                    if isinstance(bac, (int, float)):
                        culprit_bac.append(round(float(bac), 2))

            rows.append({
                "date": dt,
                "type": r.get("rusis") or "",
                "schema1": r.get("schema1") or "",
                "schema2": r.get("schema2") or "",
                "severity": severity,
                "killed": killed,
                "injured": injured,
                "drunk": 1 if r.get("neblaivusKaltininkai") == "Taip" else 0,
                "weather": r.get("meteoSalygos") or "",
                "surface": r.get("dangosBukle") or "",
                "time_of_day": (r.get("parosMetas") or "").strip(),
                "culprit_ages": ",".join(str(a) for a in culprit_ages),
                "culprit_bac": ",".join(str(b) for b in culprit_bac),
                "x": float(x),
                "y": float(y),
                "year": int(yr_str),
            })

        print(f"  {path.name}: {len(data):,} records")

    if not rows:
        print("nothing in 509/, writing empty gpkg")
        gdf = gpd.GeoDataFrame(
            columns=["date", "type", "severity", "killed", "injured", "lat", "lon", "year", "geometry"],
            geometry="geometry",
            crs="EPSG:4326",
        )
        gdf.to_file(OUT, driver="GPKG")
        return gdf

    df = pd.DataFrame(rows)
    gdf = gpd.GeoDataFrame(
        df,
        geometry=[Point(x, y) for x, y in zip(df["x"], df["y"])],
        crs="EPSG:3346",
    )
    gdf = gdf.to_crs("EPSG:4326")
    gdf["lat"] = gdf.geometry.y
    gdf["lon"] = gdf.geometry.x
    gdf = gdf.drop(columns=["x", "y"])

    lt_poly = _lithuania_land_polygon()
    gdf = gdf[gdf.geometry.within(lt_poly)]

    by_year = gdf["year"].value_counts().sort_index()
    for yr, cnt in by_year.items():
        print(f"  {yr}: {cnt:,}")
    print(f"  clipped to land: {len(gdf):,}")

    gdf.to_file(OUT, driver="GPKG")
    print(f"→ {OUT}")
    return gdf


if __name__ == "__main__":
    fetch()
