#!/usr/bin/env python3
"""Validate the single worker demo job dataset without rewriting its content."""

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "shrambazar" / "src" / "main" / "resources" / "data" / "jobs.json"
CATEGORY_COUNTS = {
    "Construction & Skilled Trades": 26,
    "Delivery & Logistics": 26,
    "Hospitality & Service": 26,
    "Retail & Sales": 25,
    "Agriculture & Local Production": 9,
    "Technical & Repair Work": 7,
    "Cleaning & Maintenance": 6,
    "Office Support & General Work": 5,
}
CATEGORIES = set(CATEGORY_COUNTS)
FIELDS = {
    "id", "title", "category", "company", "description", "location", "address", "city",
    "latitude", "longitude", "salary_min", "salary_max", "salary_type", "job_type",
    "experience", "skills", "requirements", "vacancies", "posted_date", "deadline",
    "is_demo", "source", "location_accuracy",
}


def valid_date(value):
    try:
        date.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def main():
    try:
        jobs = json.loads(DATASET.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Dataset could not be read: {error}", file=sys.stderr)
        return 1
    errors = []
    if not isinstance(jobs, list) or len(jobs) != 130:
        errors.append("Expected a JSON array with exactly 130 jobs.")
        jobs = jobs if isinstance(jobs, list) else []

    ids = [job.get("id") for job in jobs if isinstance(job, dict)]
    if len(ids) != len(set(ids)):
        errors.append("Job IDs must be unique.")
    listing_keys = [(job.get("title", "").strip().casefold(), job.get("company", "").strip().casefold(), job.get("location", "").strip().casefold()) for job in jobs if isinstance(job, dict)]
    if len(listing_keys) != len(set(listing_keys)):
        errors.append("Duplicate title, company, and locality combinations were found.")

    counts = Counter()
    for index, job in enumerate(jobs, 1):
        path = f"job {index}"
        if not isinstance(job, dict):
            errors.append(f"{path} must be an object.")
            continue
        missing = FIELDS - job.keys()
        if missing:
            errors.append(f"{path} is missing fields: {', '.join(sorted(missing))}.")
        if not all(isinstance(job.get(field), str) and job[field].strip() for field in ("id", "title", "company", "description", "location", "address", "city", "job_type", "experience")):
            errors.append(f"{path} is missing required text values.")
        category = job.get("category")
        if category not in CATEGORIES:
            errors.append(f"{path} has an unsupported category: {category!r}.")
        else:
            counts[category] += 1
        if not isinstance(job.get("description"), str) or not 50 <= len(job["description"].split()) <= 100:
            errors.append(f"{path} description must contain 50 to 100 words.")
        if not isinstance(job.get("latitude"), (int, float)) or not 27.5 <= job["latitude"] <= 27.9:
            errors.append(f"{path} latitude is outside Kathmandu Valley bounds.")
        if not isinstance(job.get("longitude"), (int, float)) or not 85.1 <= job["longitude"] <= 85.6:
            errors.append(f"{path} longitude is outside Kathmandu Valley bounds.")
        if not isinstance(job.get("salary_min"), (int, float)) or not isinstance(job.get("salary_max"), (int, float)) or job.get("salary_min", 0) <= 0 or job.get("salary_min", 0) > job.get("salary_max", -1):
            errors.append(f"{path} salary range is invalid.")
        if job.get("salary_type") not in {"monthly", "daily", "hourly"}:
            errors.append(f"{path} has an invalid salary type.")
        if not isinstance(job.get("skills"), list) or not all(isinstance(item, str) and item.strip() for item in job["skills"]):
            errors.append(f"{path} skills must be a list of non-empty strings.")
        if not isinstance(job.get("requirements"), list) or not all(isinstance(item, str) and item.strip() for item in job["requirements"]):
            errors.append(f"{path} requirements must be a list of non-empty strings.")
        if not isinstance(job.get("vacancies"), int) or job.get("vacancies", 0) < 1:
            errors.append(f"{path} vacancies must be a positive integer.")
        if not valid_date(job.get("posted_date")) or not valid_date(job.get("deadline")):
            errors.append(f"{path} dates must use ISO YYYY-MM-DD format.")
        if job.get("is_demo") is not True or job.get("location_accuracy") != "approximate":
            errors.append(f"{path} must remain clearly marked as a simulated job with approximate location.")

    if counts != Counter(CATEGORY_COUNTS):
        errors.append("Job category counts do not match the 130-job dataset.")

    if errors:
        print("Job dataset validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Validated {len(jobs)} jobs: " + ", ".join(f"{category}: {counts[category]}" for category in sorted(CATEGORIES)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
