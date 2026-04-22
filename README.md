<h1><a href="https://eismorizika.balionidas.xyz/" target="_blank" rel="noopener noreferrer">Eismo Rizika</a></h1>

<p>Lietuviška readme versija: <a href="./README.lt.md">spausk čia</a></p>

Interactive map and statistics dashboard for Lithuanian road accidents from 2013 to 2024, built on open data from [data.gov.lt](https://data.gov.lt/datasets/509/?resource_version=1290).

The map shows individual accident points clustered by year with a heatmap overlay. The dashboard breaks down accidents by type, weather, time of day, municipality, participant category, and more.

---

## Getting started

### 1. Download the raw data

Go to [data.gov.lt dataset 509](https://data.gov.lt/datasets/509/?resource_version=1290) and download the JSON files. Place them in `data/raw/509/` so the directory looks like:

```
data/raw/509/
  ei_2013.json
  ei_2014.json
  ...
  ei_2024.json
```

### 2. Set up Python

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the pipeline

```bash
python main.py
```

This reads the raw JSONs, reprojects coordinates from LKS94 to WGS84, clips points to Lithuania's land boundary, aggregates statistics, and writes the JSON files the web app expects under `web/public/data/`.

### 4. Start the web app

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Project structure

```
riskroads/
  main.py                  # pipeline entry point
  requirements.txt
  src/
    fetch_accidents.py     # parses raw JSONs, reprojects coords, saves GeoPackage
    process_509.py         # aggregates stats for the dashboard
    score_map.py           # builds per-year point data for the map
    utils.py
  data/
    raw/509/               # raw JSON files from data.gov.lt (not in repo)
    processed/             # intermediate GeoPackage (not in repo)
  web/                     # React + TypeScript frontend (Vite)
    src/
      pages/
        MapPage.tsx        # Leaflet map with clustering and heatmap
        DashboardPage.tsx  # Recharts statistics dashboard
    public/data/           # generated JSON served to the browser (not in repo)
```
---

## License

Apache 2.0 - see [LICENSE](LICENSE) and [NOTICE](NOTICE).
