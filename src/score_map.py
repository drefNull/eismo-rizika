import json
import geopandas as gpd
from utils import PROJECT_ROOT

PROCESSED = PROJECT_ROOT / "data" / "processed"
WEB_DATA = PROJECT_ROOT / "web" / "public" / "data"


def build_map():
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    acc_path = PROCESSED / "accidents_lithuania.gpkg"
    accidents = gpd.read_file(acc_path) if acc_path.exists() else None

    acc_by_year = {}
    acc_stats = {
        "by_year": {},
        "total": {"fatal": 0, "injury": 0, "property": 0},
    }

    if accidents is not None and len(accidents) > 0:
        print(f"  {len(accidents):,} accidents...")
        acc_4326 = accidents.to_crs("EPSG:4326")
        years = sorted(accidents["year"].dropna().unique().astype(int).tolist())
        for yr in years:
            yr_acc = acc_4326[acc_4326["year"] == yr]
            acc_by_year[str(yr)] = [
                {
                    "lat": round(r.geometry.y, 5),
                    "lon": round(r.geometry.x, 5),
                    "date": str(getattr(r, "date", "") or ""),
                    "atype": str(getattr(r, "type", "") or ""),
                    "schema1": str(getattr(r, "schema1", "") or ""),
                    "schema2": str(getattr(r, "schema2", "") or ""),
                    "killed": int(getattr(r, "killed", 0) or 0),
                    "injured": int(getattr(r, "injured", 0) or 0),
                    "severity": str(getattr(r, "severity", "") or ""),
                    "drunk": bool(getattr(r, "drunk", 0)),
                    "weather": str(getattr(r, "weather", "") or ""),
                    "surface": str(getattr(r, "surface", "") or ""),
                    "time_of_day": str(getattr(r, "time_of_day", "") or ""),
                    "culprit_ages": [int(a) for a in str(getattr(r, "culprit_ages", "") or "").split(",") if a.strip().isdigit()],
                    "culprit_bac": [float(b) for b in str(getattr(r, "culprit_bac", "") or "").split(",") if b.strip()],
                }
                for r in yr_acc.itertuples() if r.geometry
            ]
            vc = yr_acc["severity"].value_counts()
            acc_stats["by_year"][str(yr)] = {
                "fatal": int(vc.get("fatal", 0)),
                "injury": int(vc.get("injury", 0)),
                "property": int(vc.get("property", 0)),
            }
        vc_all = accidents["severity"].value_counts()
        acc_stats["total"] = {
            "fatal": int(vc_all.get("fatal", 0)),
            "injury": int(vc_all.get("injury", 0)),
            "property": int(vc_all.get("property", 0)),
        }
    else:
        print("no accidents, empty json")

    with open(WEB_DATA / "accidents.json", "w") as f:
        json.dump({"by_year": acc_by_year, "stats": acc_stats}, f, ensure_ascii=False)
    print("→ accidents.json")


if __name__ == "__main__":
    build_map()
