from pathlib import Path
path = Path(r"apps/miniapp/src/app/courses/[id]/page.tsx")
for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
    if 300 <= idx <= 420:
        print(f"{idx:04d}: {line}")
