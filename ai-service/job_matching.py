"""Deterministic search over the bundled Shram Bazar showcase listings."""
from __future__ import annotations
import json
import logging
import os
import re
from pathlib import Path

import httpx

DATASET = Path(__file__).resolve().parents[1] / "shrambazar/src/main/resources/data/jobs.json"
logger = logging.getLogger(__name__)
SYNONYMS = {
    "electrician": ("electrician", "electrical", "wiring", "electric"),
    "plumber": ("plumber", "plumbing", "pipe fitting", "pipefitting"),
    "cook": ("cook", "cooking", "chef", "kitchen"),
    "delivery": ("delivery", "deliver", "courier", "rider", "driver"),
    "mason": ("mason", "masonry", "rajmistri", "bricklayer"),
    "cleaner": ("cleaner", "cleaning", "housekeeping"),
    "carpenter": ("carpenter", "carpentry", "woodwork"),
    "painting": ("painter", "painting", "paint"),
    "construction": (
        "construction", "masonry", "bricklaying", "bricklayer", "concrete",
        "plaster", "tiling", "tile work", "rebar", "rod binding",
        "scaffolding", "roofing", "waterproofing", "welder", "welding",
        "site helper", "rajmistri",
    ),
}
CITY_NAMES = ("Kathmandu", "Lalitpur", "Bhaktapur")
IT_SEARCH_TERMS = (
    "computer", "data entry", "excel", "technical support", "hardware",
    "operating system", "software", "programming", "network", "photocopy",
    "scanning", "mobile repair",
)


def load_jobs() -> list[dict]:
    api_base = os.getenv("SHRAM_API_BASE_URL", "").strip().rstrip("/")
    if api_base:
        try:
            response = httpx.get(f"{api_base}/api/jobs/showcase", timeout=2.5)
            response.raise_for_status()
            rows = response.json()
            if isinstance(rows, list):
                return list({row["id"]: row for row in rows if isinstance(row, dict) and row.get("id")}.values())
            logger.warning("Shram API returned an invalid showcase jobs response; using bundled demo data")
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Shram API showcase jobs are unavailable (%s); using bundled demo data", type(exc).__name__)
    with DATASET.open(encoding="utf-8") as dataset:
        rows = json.load(dataset)
    if not isinstance(rows, list):
        raise ValueError("Job dataset must be a JSON list")
    return list({row["id"]: row for row in rows if isinstance(row, dict) and row.get("id")}.values())


def match_profile_jobs(profile_context: str, limit: int = 5, jobs: list[dict] | None = None) -> tuple[list[dict], bool]:
    """Match showcase jobs against explicit, non-sensitive worker profile fields."""
    try:
        profile = json.loads(profile_context)
    except (TypeError, json.JSONDecodeError):
        return [], False
    if not isinstance(profile, dict):
        return [], False

    def strings(value: object) -> list[str]:
        if isinstance(value, str):
            return [value] if value.strip() else []
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return []

    def useful_tokens(value: str) -> set[str]:
        ignored = {"and", "the", "with", "from", "for", "work", "worked", "experience", "years", "year", "company", "at", "in", "of", "as"}
        return {token for token in re.findall(r"[a-z]{4,}", value.lower()) if token not in ignored}

    skills = strings(profile.get("skills"))
    categories = strings(profile.get("preferredCategories"))
    preferences = strings(profile.get("employmentPreferences"))
    title = strings(profile.get("professionalTitle"))
    experience = strings(profile.get("experience"))
    qualifications = strings(profile.get("qualifications"))
    location = next(iter(strings(profile.get("preferredWorkLocation")) + strings(profile.get("district")) + strings(profile.get("location"))), "")
    profile_terms = [*skills, *categories, *preferences, *title, *experience, *qualifications]
    profile_terms = [term.lower() for term in profile_terms if len(term.strip()) > 1]
    if not profile_terms:
        return [], False

    ranked: list[tuple[int, dict]] = []
    for job in jobs if jobs is not None else load_jobs():
        title_text = str(job.get("title", "")).lower()
        category_text = str(job.get("category", "")).lower()
        skills_text = " ".join(strings(job.get("skills"))).lower()
        searchable = " ".join((title_text, category_text, skills_text, str(job.get("description", "")).lower(), str(job.get("requirements", "")).lower()))
        reasons: list[str] = []
        score = 0
        for skill in skills:
            needle = skill.lower()
            if needle in skills_text or needle in title_text:
                score += 6
                reasons.append(f"Matches your skill: {skill}")
            elif needle in searchable:
                score += 3
                reasons.append(f"Related to your skill: {skill}")
            elif useful_tokens(skill) & useful_tokens(searchable):
                score += 2
                reasons.append(f"Related to your skill: {skill}")
        for category in categories:
            if category.lower() in category_text:
                score += 5
                reasons.append(f"Matches your preferred category: {category}")
        for preference in preferences:
            if preference.lower() in searchable:
                score += 2
                reasons.append(f"Fits your work preference: {preference}")
        for term in [*title, *experience, *qualifications]:
            if term.lower() in searchable:
                score += 3
                reasons.append(f"Related to your {('experience' if term in experience else 'background')}: {term}")
            elif useful_tokens(term) & useful_tokens(searchable):
                score += 2
                reasons.append(f"Related to your {('experience' if term in experience else 'background')}: {term}")
        if location and location.lower() in " ".join((str(job.get("city", "")), str(job.get("location", "")), str(job.get("address", "")))).lower():
            score += 2
            reasons.append(f"Near your preferred location: {location}")
        if score:
            ranked.append((score, {**job, "match_reasons": list(dict.fromkeys(reasons))[:4]}))
    ranked.sort(key=lambda item: (-item[0], item[1].get("title", "")))
    return [job for _, job in ranked[:limit]], True


def search_jobs(message: str, history: list[dict] | None = None, limit: int = 5, jobs: list[dict] | None = None) -> tuple[list[dict], bool]:
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
    listing_phrase = bool(
        re.search(r"\b(list(?:\s+down)?|show|find|give|provide|available|availability|related to|looking for)\b", current)
        and re.search(r"\b(jobs?|works?|listings?|vacanc(?:y|ies)|helpers?|workers?|positions?)\b", current)
    )
    construction_query = bool(
        re.search(r"\b(construction|masonry|bricklay(?:ing|er)|concrete|plaster|til(?:e|ing)|rebar|rod binding|scaffold(?:ing)?|roofing|waterproofing|rajmistri)\b", current)
        and re.search(r"\b(available|availability|work|works|job|jobs|vacanc(?:y|ies)|list|listing|find|show|provide|any)\b", current)
    )
    it_search = bool(re.search(r"\b(?:it\s+(?:jobs?|roles?|fields?|work|careers?)|(?:jobs?|roles?|fields?|careers?)\s+(?:in|related to)\s+it|related to\s+it|information technology|computing)\b", current))
    role_search = bool(re.search(r"\b(?:what|find|list|show|any)\s+(?:available\s+)?(?:it\s+)?(?:roles?|careers?)\b|\b(?:roles?|careers?)\s+(?:available|in\s+it|related to\s+it)\b", current))
    current_job_intent = current_job_intent or role_search or construction_query or listing_phrase
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
    terms -= {"find", "show", "list", "down", "me", "jobs", "job", "work", "works", "for", "in", "on", "to", "around", "near", "the", "a", "an", "are", "there", "any", "with", "have", "has", "and", "that", "dont", "doesnt", "don", "doesn", "t", "much", "experience", "only", "can", "could", "would", "i", "u", "you", "am", "my", "please", "provide", "provided", "providing", "looking", "student", "students", "want", "need", "what", "about", "kathmandu", "lalitpur", "bhaktapur", "weekend", "weekends", "saturday", "sunday", "part", "time", "require", "requires", "required", "related", "field", "fields", "here", "available", "availability", "information", "technology", "it", "role", "roles", "career", "careers", "employment", "vacancies"}
    if terms & {"helper", "helpers"} and terms - {"helper", "helpers"}:
        terms -= {"helper", "helpers"}
    expanded = set(terms)
    for canonical, aliases in SYNONYMS.items():
        if any(alias in text for alias in aliases):
            expanded.update(alias for alias in aliases)
            expanded.add(canonical)

    matches = []
    seen: set[str] = set()
    for job in jobs if jobs is not None else load_jobs():
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
        requested_helper_role = re.search(r"\bkitchen\s+helper\b", current)
        if requested_helper_role and "kitchen helper" in job.get("title", "").lower():
            score += 10
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
