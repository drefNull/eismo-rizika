import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from fetch_accidents import fetch as fetch_accidents
from score_map import build_map
from process_509 import process as process_stats

if __name__ == "__main__":
    gdf = fetch_accidents()
    build_map()
    process_stats()
    print(f"\n{len(gdf):,} accidents, finished")
