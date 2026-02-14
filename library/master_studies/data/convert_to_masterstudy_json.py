import json
import pandas as pd
import re


INPUT_FILE = "master_studies_data.ods"
OUTPUT_FILE = "masterstudy.json"


def split_multi(value):
    """
    Converts:
    "Portrait; Figure" -> ["Portrait", "Figure"]
    "Portrait, Figure" -> ["Portrait", "Figure"]
    """
    if pd.isna(value):
        return []

    value = str(value).strip()
    if not value:
        return []

    parts = re.split(r"\s*(?:;|,|/|\|)\s*", value)
    return [p.strip() for p in parts if p.strip()]


def normalize_year(value):
    try:
        return int(value)
    except:
        return None


def main():
    df = pd.read_excel(INPUT_FILE, engine="odf")

    artworks = []

    for _, row in df.iterrows():
        artwork = {
            "id": str(row["id"]).strip(),
            "title": str(row["title"]).strip(),
            "artist": str(row["artist"]).strip(),
            "year": normalize_year(row["year"]),
            "periods": split_multi(row["period"]),
            "subjects": split_multi(row["subject"]),
            "techniques": split_multi(row["technique"]),
            "imagePath": str(row["imagePath"]).strip(),
            "museum": str(row["museum"]).strip(),
            "license": str(row["license"]).strip(),
            "sourceUrl": str(row["sourceUrl"]).strip()
        }

        artworks.append(artwork)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)

    print(f"✅ Exported {len(artworks)} artworks to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
