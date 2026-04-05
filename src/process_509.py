import json
import re
from pathlib import Path
from collections import Counter, defaultdict

RAW_509 = Path(__file__).parent.parent / "data" / "raw" / "509"
WEB_DATA = Path(__file__).parent.parent / "web" / "public" / "data"


def _normalize_municipality(name: str) -> str:
    name = re.sub(r"\bm\.\s+sav\.", "miesto sav.", name)
    name = re.sub(r"\br\.\s+sav\.", "rajono sav.", name)
    return name


def _age_group(age):
    if age < 18: return "iki 18"
    if age < 25: return "18–24"
    if age < 35: return "25–34"
    if age < 45: return "35–44"
    if age < 55: return "45–54"
    if age < 65: return "55–64"
    return "65+"


def process():
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    by_year = defaultdict(lambda: {"total": 0, "deaths": 0, "injured": 0, "drunk": 0})
    by_type = Counter()
    by_weather = Counter()
    by_surface = Counter()
    by_time_of_day = Counter()
    by_hour = Counter()
    by_municipality = Counter()
    by_road_type = Counter()
    by_speed_limit = Counter()
    by_gender = Counter()
    by_participant_category = Counter()
    by_seatbelt = Counter()
    by_age_group = Counter()

    seen = set()

    for path in sorted(RAW_509.glob("ei_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"  {path.name}: {len(data):,} records")

        for r in data:
            rid = r.get("registrokodas")
            if rid:
                if rid in seen:
                    continue
                seen.add(rid)

            dt = r.get("dataLaikas") or ""
            yr_str = dt[:4] if len(dt) >= 4 and dt[:4].isdigit() else path.stem.split("_")[1]
            yr = int(yr_str)
            if yr < 2013 or yr > 2024:
                continue

            by_year[yr]["total"] += 1
            by_year[yr]["deaths"] += r.get("zuvusiuSkaicius") or 0
            by_year[yr]["injured"] += r.get("suzeistuSkaicius") or 0
            if r.get("neblaivusKaltininkai") == "Taip":
                by_year[yr]["drunk"] += 1

            by_type[r.get("rusis") or "Nenurodyta"] += 1
            by_weather[r.get("meteoSalygos") or "Nenurodyta"] += 1
            by_surface[r.get("dangosBukle") or "Nenurodyta"] += 1
            by_time_of_day[r.get("parosMetas") or "Nenurodyta"] += 1
            by_road_type[r.get("kelioReiksme") or "Nenurodyta"] += 1

            speed = r.get("leistinasGreitis")
            if speed:
                by_speed_limit[int(speed)] += 1

            sav = r.get("savivaldybe")
            if sav:
                by_municipality[_normalize_municipality(sav)] += 1

            if len(dt) >= 13 and dt[11:13].isdigit():
                by_hour[int(dt[11:13])] += 1

            for d in r.get("eismoDalyviai") or []:
                gender = d.get("lytis")
                if gender and gender != "Nežinoma":
                    by_gender[gender] += 1

                cat = d.get("kategorija")
                if cat:
                    by_participant_category[cat] += 1

                sb = d.get("saugosDirzas")
                if sb:
                    by_seatbelt[sb] += 1

                age = d.get("amzius")
                if age and 0 <= age <= 100:
                    by_age_group[_age_group(age)] += 1

    years = sorted(by_year.keys())
    age_order = ["iki 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"]

    stats = {
        "summary": {
            "total": sum(v["total"] for v in by_year.values()),
            "deaths": sum(v["deaths"] for v in by_year.values()),
            "injured": sum(v["injured"] for v in by_year.values()),
            "drunk": sum(v["drunk"] for v in by_year.values()),
        },
        "by_year": [
            {"year": yr, **by_year[yr]}
            for yr in years
        ],
        "by_type": [
            {"name": k, "count": v}
            for k, v in by_type.most_common(10)
        ],
        "by_weather": [
            {"name": k, "count": v}
            for k, v in by_weather.most_common()
        ],
        "by_surface": [
            {"name": k, "count": v}
            for k, v in by_surface.most_common()
        ],
        "by_time_of_day": [
            {"name": k.strip(), "count": v}
            for k, v in by_time_of_day.most_common()
        ],
        "by_hour": [
            {"hour": h, "count": by_hour[h]}
            for h in range(24)
        ],
        "by_municipality": [
            {"name": k, "count": v}
            for k, v in by_municipality.most_common(20)
        ],
        "by_road_type": [
            {"name": k, "count": v}
            for k, v in by_road_type.most_common()
        ],
        "by_speed_limit": [
            {"speed": s, "count": by_speed_limit[s]}
            for s in sorted(by_speed_limit)
        ],
        "by_gender": [
            {"name": k, "count": v}
            for k, v in by_gender.most_common()
        ],
        "by_participant_category": [
            {"name": k, "count": v}
            for k, v in by_participant_category.most_common(8)
        ],
        "by_seatbelt": [
            {"name": k, "count": v}
            for k, v in by_seatbelt.most_common()
            if k != "Neįrengtas"
        ],
        "by_age_group": [
            {"group": g, "count": by_age_group.get(g, 0)}
            for g in age_order
        ],
    }

    out = WEB_DATA / "stats.json"
    out.write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved → {out}")
    print(f"Total: {stats['summary']['total']:,} accidents, "
          f"{stats['summary']['deaths']:,} deaths, "
          f"{stats['summary']['injured']:,} injured")


if __name__ == "__main__":
    process()
