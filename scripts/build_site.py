"""Copy data files into site/data for static hosting."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
dest = ROOT / "site" / "data"
dest.mkdir(parents=True, exist_ok=True)
for name in ("types.csv", "plant_template.json"):
    shutil.copy(ROOT / "data" / name, dest / name)
print("site/data updated")
