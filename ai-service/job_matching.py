"""Deterministic search over the bundled Shram Bazar showcase listings."""
from __future__ import annotations
import json
import re
from pathlib import Path

DATASET = Path(__file__).resolve().parents[1] / "shrambazar/src/main/resources/data/jobs.json"
SYNONYMS = {
    "electrician": ("electrician", "electrical", "wiring", "electric"),
    "plumber": ("plumber", "plumbing", "pipe fitting", "pipefitting"),
    "cook": ("cook", "cooking", "chef", "kitchen"),
    "delivery": ("delivery", "deliver", "courier", "rider", "driver"),
    "mason": ("mason", "masonry", "rajmistri", "bricklayer"),
    "cleaner": ("cleaner", "cleaning", "housekeeping"),
    "carpenter": ("carpenter", "carpentry", "woodwork"),
    "painting": ("painter", "painting", "paint"),
}
CITY_NAMES = ("Kathmandu", "Lalitpur", "Bhaktapur")
IT_SEARCH_TERMS = (
    "computer", "data entry", "excel", "technical support", "hardware",
    "operating system", "software", "programming", "network", "photocopy",
    "scanning", "mobile repair",
)


def load_jobs() -> list[dict]:
    with DATASET.open(encoding="utf-8") as dataset:
        rows = json.load(dataset)
    if not isinstance(rows, list):
        raise ValueError("Job dataset must be a JSON list")
    return list({row["id"]: row for row in rows if isinstance(row, dict) and row.get("id")}.values())


def search_jobs(message: str, history: list[dict] | None = None, limit: int = 5) -> tuple[list[dict], bool]:
    """Return matching real records and whether this appears to be a job query."""
    user_history = [turn.get("text", "") for turn in (history or [])[-6:] if turn.get("role") == "user"]
    previous_job_query = next((turn for turn in reversed(user_history) if re.search(
        r"\b(job|jobs|employment|vacanc|hire|looking for|find me|find .*work|find .*job)\b",
        turn,
        re.I,
    ) and not re.search(r"\b(apply|application|submit|how to|steps|process)\b", turn, re.I)), "")
    history_text = previous_job_query
    current = message.lower()
    current_job_intent = bool(re.search(r"\b(job|jobs|employment|vacanc|hire|looking for|find me|find .*work|find .*job|weekends?|part.time|student|my skills)\b", current))
    it_search = bool(re.search(r"\b(?:it\s+(?:jobs?|roles?|fields?|work|careers?)|(?:jobs?|roles?|fields?|careers?)\s+(?:in|related to)\s+it|related to\s+it|information technology|computing)\b", current))
    role_search = bool(re.search(r"\b(?:what|find|list|show|any)\s+(?:available\s+)?(?:it\s+)?(?:roles?|careers?)\b|\b(?:roles?|careers?)\s+(?:available|in\s+it|related to\s+it)\b", current))
    current_job_intent = current_job_intent or role_search
    location_followup = bool(re.search(r"\b(?:what about\s+)?(?:kathmandu|lalitpur|bhaktapur)\b", current) and re.search(r"\b(job|jobs|employment|vacanc|hire)\b", history_text, re.I))
    constraint_followup = bool(re.search(r"\b(?:weekends?|saturdays?|sundays?|part.?time|evenings?|more like that)\b", current) and re.search(r"\b(job|jobs|employment|vacanc|hire)\b", history_text, re.I))
    followup = not current_job_intent and (location_followup or constraint_followup)
    intent = current_job_intent or followup
    if not intent:
        return [], False

    # A new query starts from its own words. Reuse older criteria only when the
    # user is clearly asking a location or schedule follow-up.
    search_text = f"{history_text} {message}" if followup else current
    text = search_text.lower()
    locations = [city for city in CITY_NAMES if re.search(rf"\b{city}\b", search_text, re.I)]
    location = next((city for city in CITY_NAMES if re.search(rf"\b{city}\b", current, re.I)), locations[-1] if followup and locations else "")
    criteria_text = text if followup else current
    low_experience = bool(re.search(r"\b(no|without|little|less|much|beginner|entry.level|fresh)\s+(?:much\s+)?experience\b|\bno experience\b", criteria_text))
    weekend = bool(re.search(r"\b(weekend|weekends|saturday|sundays only)\b", criteria_text))
    part_time = bool(re.search(r"\b(part.?time|flexible|evening|student|weekend)\b", criteria_text))
    terms = set(IT_SEARCH_TERMS) if it_search else set(re.findall(r"[a-z]+", text))
    terms -= {"find", "show", "me", "jobs", "job", "work", "for", "in", "on", "around", "near", "the", "a", "an", "are", "there", "any", "with", "have", "has", "and", "that", "dont", "doesnt", "don", "doesn", "t", "much", "experience", "only", "can", "i", "am", "my", "please", "looking", "student", "students", "want", "need", "what", "about", "kathmandu", "lalitpur", "bhaktapur", "weekend", "weekends", "saturday", "sunday", "part", "time", "require", "requires", "required", "related", "field", "fields", "here", "available", "availability", "information", "technology", "it", "role", "roles", "career", "careers", "employment", "vacancies"}
    expanded = set(terms)
    for canonical, aliases in SYNONYMS.items():
        if any(alias in text for alias in aliases):
            expanded.update(alias for alias in aliases)
            expanded.add(canonical)

    matches = []
    seen: set[str] = set()
    for job in load_jobs():
        if job["id"] in seen:
            continue
        searchable = " ".join(str(value) for key, value in job.items() if key in {"title", "category", "description", "location", "address", "city", "job_type", "experience", "salary_type", "skills", "requirements"}).lower()
        if terms and not any(term in searchable for term in expanded if len(term) > 2):
            continue
        if location and location.lower() not in f"{job.get('city','')} {job.get('location','')} {job.get('address','')}".lower():
            continue
        if low_experience and not re.search(r"no experience|fresh|beginner|0\s*(?:years|yrs)|entry.level", job.get("experience", ""), re.I):
            continue
        if weekend and not re.search(r"weekend|saturday|sunday", job.get("description", ""), re.I):
            continue
        if part_time and not re.search(r"part.?time|flexible|evening|weekend|hourly", searchable, re.I):
            continue
        score = sum(3 if term in job.get("title", "").lower() else 2 if term in " ".join(job.get("skills", [])).lower() else 1 for term in expanded if len(term) > 2 and term in searchable)
        if location:
            score += 4
        if weekend:
            score += 4
        if part_time:
            score += 2
        if low_experience:
            score += 2
        if score or (not expanded and intent):
            reasons = []
            if location: reasons.append(f"Located in {job.get('city')}")
            if weekend: reasons.append("Description mentions weekend work")
            if low_experience: reasons.append("Experience requirement indicates entry-level fit")
            hits = [skill for skill in job.get("skills", []) if any(term in skill.lower() for term in expanded if len(term) > 2)]
            if hits: reasons.append(f"Related skills: {', '.join(hits[:2])}")
            matches.append((score or 1, {**job, "match_reasons": reasons or ["A listing from the current showcase dataset"]}))
            seen.add(job["id"])
    matches.sort(key=lambda result: (-result[0], result[1].get("title", "")))
    return [job for _, job in matches[:limit]], True
