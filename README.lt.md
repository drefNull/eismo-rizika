# Eismo Rizika

Jei nori pasižiūrėti gyvai, projektas yra čia: [eismorizika.balionidas.xyz](https://eismorizika.balionidas.xyz/)

Šitas projektas rodo Lietuvos eismo įvykius nuo 2013 iki 2024 metų žemėlapyje ir statistikoje. Duomenys paimti iš [data.gov.lt](https://data.gov.lt/datasets/509/?resource_version=1290).

Žemėlapyje matosi atskiri eismo įvykių taškai, suskirstyti pagal metus, ir dar yra heatmap sluoksnis. Statistikos dalyje galima pasižiūrėti pagal įvykio tipą, orus, paros laiką, savivaldybę, dalyvių grupę ir panašiai.

---

## Kaip pasileisti

### 1. Parsisiųsk duomenis

Nueik į [data.gov.lt duomenų rinkinį 509](https://data.gov.lt/datasets/509/?resource_version=1290) ir parsisiųsk JSON failus. Juos sudėk į `data/raw/509/`, kad būtų maždaug taip:

```text
data/raw/509/
  ei_2013.json
  ei_2014.json
  ...
  ei_2024.json
```

### 2. Susitvarkyk Python aplinką

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Paleisk duomenų paruošimą

```bash
python main.py
```

Čia dalis perskaito pradinius JSON failus, permeta koordinates iš LKS94 į WGS84, atfiltruoja taškus pagal Lietuvos sausumos ribą, suskaičiuoja statistiką ir sugeneruoja JSON failus į `web/public/data/`.

### 4. Paleisk puslapį

```bash
cd web
npm install
npm run dev
```

Tada atsidaryk `http://localhost:5173`.

---

## Projekto struktūra

```text
riskroads/
  main.py                  # pagrindinis paleidimo failas
  requirements.txt
  src/
    fetch_accidents.py     # pasiima pradinius JSON, permeta koordinates, išsaugo GeoPackage
    process_509.py         # paruošia statistiką dashboardui
    score_map.py           # paruošia žemėlapio taškus pagal metus
    utils.py
  data/
    raw/509/               # JSON failai iš data.gov.lt 
    processed/             # tarpiniai failai
  web/                     # React + TypeScript (Vite)
    src/
      pages/
        MapPage.tsx        # Leaflet žemėlapis su clusters ir heatmap
        DashboardPage.tsx  # Recharts statistikos vaizdai
    public/data/           # sugeneruoti JSON, kuriuos skaito naršyklė
```

---

## Licencija

Apache 2.0. Daugiau čia: [LICENSE](LICENSE) ir [NOTICE](NOTICE).
