"""기상청 일별 기온 CSV(data/seoul_daily_temperature.csv)로 연평균 기온 data.js를 생성한다."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "seoul_daily_temperature.csv"
OUT = ROOT / "data.js"
MIN_DAYS = 330  # 이보다 관측일이 적은 해는 연평균에서 제외

sums = defaultdict(lambda: [0.0, 0.0, 0.0, 0, 0, 0])  # avg, min, max 합계 / 개수
with SRC.open(encoding="utf-8") as f:
    for row in csv.reader(f):
        if len(row) < 5 or len(row[0].strip()) != 10 or not row[0].strip()[:4].isdigit():
            continue
        year = int(row[0].strip()[:4])
        s = sums[year]
        for i, col in enumerate((2, 3, 4)):
            if row[col].strip():
                s[i] += float(row[col])
                s[i + 3] += 1

years = []
for year in range(1904, 2026):
    s = sums.get(year)
    if not s or s[3] < MIN_DAYS:
        years.append({"year": year, "days": s[3] if s else 0, "avg": None, "min": None, "max": None})
        continue
    years.append({
        "year": year,
        "days": s[3],
        "avg": round(s[0] / s[3], 2),
        "min": round(s[1] / s[4], 2) if s[4] else None,
        "max": round(s[2] / s[5], 2) if s[5] else None,
    })

OUT.write_text(
    "// scripts/build_annual.py 로 생성됨 — 직접 수정하지 마세요.\n"
    "// 출처: 기상청 기상자료개방포털, 서울(108) 일별 기온\n"
    f"window.SEOUL_ANNUAL = {json.dumps(years, ensure_ascii=False)};\n",
    encoding="utf-8",
)
print(f"{sum(1 for y in years if y['avg'] is not None)} years written to {OUT}")
