#!/usr/bin/env python3
"""Build the static, same-origin fallback for the Nepal jobs showcase."""

import csv
import json
import re
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "shrambazar" / "data" / "nepali_jobs.csv"
OUTPUT = ROOT / "frontend" / "public" / "data" / "nepali_jobs.json"


def clean(value):
    if value is None:
        return None
    value = value.strip()
    return None if not value or value.lower() in {"null", "none", "nan", "n/a"} else value


def normalized(value):
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^\w]+", " ", value, flags=re.UNICODE).lower().strip()


def parse_list(value):
    value = clean(value)
    if not value or value == "[]":
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except (json.JSONDecodeError, TypeError):
        pass
    value = value[1:-1] if value.startswith("[") and value.endswith("]") else value
    return [part.strip().strip("\"'") for part in value.split(",") if part.strip().strip("\"'")]


def parse_number(value):
    value = clean(value)
    if not value:
        return None
    try:
        number = float(value.replace(",", ""))
        return int(number) if number.is_integer() else number
    except ValueError:
        return None


def parse_date(value):
    value = clean(value)
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10]).isoformat()
    except ValueError:
        return None


def is_notice(title, category):
    title = normalized(title)
    category = normalized(category)
    if "tender notice" in category or "expression of interest" in category or "expressions of interest" in category:
        return True
    phrases = (
        "tender notice", "invitation for bid", "invitation to bid", "call for bid",
        "request for quotation", "quotation notice", "request for proposal",
        "consultant proposal", "rfp notice", "expression of interest",
        "call for collaboration and registration", "bolpatra", "बोलपत्र", "कोटेशन",
    )
    return title in {"rfp", "rfq", "rfi", "eoi"} or any(phrase in title for phrase in phrases)


def build_job(row, index):
    location = clean(row.get("location"))
    return {
        "id": index,
        "title": clean(row.get("title")) or "Untitled listing",
        "company": clean(row.get("company")),
        "location": location,
        "country": clean(row.get("country")),
        "salaryText": clean(row.get("salary_str")),
        "salaryMin": parse_number(row.get("salary_min")),
        "salaryMax": parse_number(row.get("salary_max")),
        "salaryCurrency": clean(row.get("salary_currency")),
        "category": clean(row.get("category")),
        "deadline": parse_date(row.get("deadline")),
        "experience": clean(row.get("experience")),
        "skills": parse_list(row.get("skills")),
        "jobLevel": clean(row.get("job_level")),
        "jobTypes": parse_list(row.get("job_type")),
        "vacancies": parse_number(row.get("vacancies")),
        "postedDate": parse_date(row.get("posted_date")),
        "source": clean(row.get("source")) or "Unknown",
        "sourceUrl": clean(row.get("source_url") or row.get("url") or row.get("job_url") or row.get("application_url")),
        "scrapedAt": parse_date(row.get("scraped_at")),
        "availabilityStatus": "UNVERIFIED_HISTORICAL",
        "mapArea": None,
        "mapLatitude": None,
        "mapLongitude": None,
    }


def main():
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    jobs = [build_job(row, index) for index, row in enumerate(rows, start=1)
            if clean(row.get("title")) and not is_notice(row.get("title"), row.get("category"))]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(jobs, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Built {len(jobs)} showcase listings from {len(rows)} CSV rows: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
