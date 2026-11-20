# Learn course content

The five current demonstration courses are in `mock/`. Add final course files directly in this folder as `electrical.json`, `plumbing.json`, `carpentry.json`, `motorcycle.json`, and `painting.json` when they are ready.

Each final file replaces its mock course by keeping the same stable `id` (`basic-electrical-skills`, `plumbing-fundamentals`, `carpentry-woodworking`, `motorcycle-maintenance`, or `painting-finishing`). Files are discovered automatically; the dashboard, course details, curriculum, player and progress views do not need content-specific edits. If a final file has not arrived yet, its demonstration course stays available.

Use this shape for each course:

```json
{
  "id": "basic-electrical-skills",
  "title": "Basic Electrical Skills",
  "slug": "basic-electrical-skills",
  "category": "Electrical",
  "level": "Beginner",
  "shortDescription": "A short course summary.",
  "description": "The full course description.",
  "durationHours": 3,
  "thumbnail": "/images/learn/electrical.svg",
  "accent": "#1D4ED8",
  "skills": ["Electrical safety", "Basic circuits"],
  "objectives": ["A learning outcome"],
  "modules": [
    {
      "id": "safety",
      "title": "Safety and preparation",
      "summary": "Module summary.",
      "lessons": [
        {
          "id": "safe-work",
          "title": "Working safely",
          "description": "Lesson description.",
          "durationMinutes": 12,
          "videoId": null
        }
      ]
    }
  ],
  "quizzes": []
}
```

Set `videoId` to a YouTube video ID to show the privacy-enhanced embedded player. Keep it `null` until a real video is available. Quiz results have a separate local progress record; quiz rendering and certificate verification are planned for a later stage.
