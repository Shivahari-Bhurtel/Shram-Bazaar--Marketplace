export type CleaningLesson = {
  id: string
  title: string
  videoId: string
  description: string
}

export const householdCleaningCourse = {
  id: "professional-household-cleaning-beginner",
  title: "Professional Household Cleaning – Beginner Level",
  level: "Beginner",
  category: "Household Services",
  skill: "Household Cleaning",
  language: "English",
  instructor: "Shram Bazar Learning Resources",
  description: "Learn essential household cleaning techniques, bedroom preparation, bathroom cleaning, kitchen hygiene, laundry and basic housekeeping practices.",
  objectives: [
    "Plan a simple, safe cleaning routine for a home.",
    "Prepare bedrooms and living areas for household use.",
    "Use cleaning products and tools carefully and hygienically.",
    "Handle basic laundry, kitchen and bathroom tasks.",
  ],
  lessons: [
    { id: "housekeeping-intro", title: "Introduction to Housekeeping", videoId: "vK_dlvCGxuc", description: "Learn what household housekeeping includes, how to plan a room-by-room routine, and how to communicate respectfully with a household." },
    { id: "making-a-bed", title: "Making a Bed", videoId: "xqtmT_xVqhM", description: "Follow a practical sequence for removing used linen, preparing fresh bedding and making a neat, comfortable bed." },
    { id: "bathroom-cleaning", title: "Bathroom Cleaning", videoId: "w4x_GAEsvLU", description: "Review a careful bathroom-cleaning sequence, separating cloths and tools to reduce cross-contamination." },
    { id: "laundry-basics", title: "Laundry Basics", videoId: "rysvSyuBymE", description: "Learn basic sorting, care-label checks and preparation steps before washing clothes." },
    { id: "clothes-for-ironing", title: "Preparing Clothes for Ironing", videoId: "CrMm0OTWPGc", description: "Prepare garments and the ironing area safely, and check fabric care instructions before using heat." },
    { id: "folding-clothes", title: "Folding Clothes", videoId: "SlpaRd80FkQ", description: "Practice simple folding methods that keep clean clothes tidy and easy to store." },
    { id: "kitchen-cleaning", title: "Kitchen Cleaning", videoId: "HlqLaZQafwE", description: "Learn a practical order for cleaning kitchen surfaces and keeping food-contact areas hygienic." },
    { id: "dining-table-cleaning", title: "Dining Table Cleaning", videoId: "nj8cgyXndPQ", description: "Review how to clear, clean and reset a dining table using suitable cloths and products." },
    { id: "living-room-cleaning", title: "Living Room Cleaning", videoId: "WvCz_gZxjcw", description: "Work through a simple living-room routine for tidying, dusting and cleaning shared surfaces." },
    { id: "cleaning-products-tools", title: "Cleaning Products and Tools", videoId: "NKZN4cl___A", description: "Identify common household tools, read product directions and avoid mixing cleaning chemicals." },
  ] satisfies CleaningLesson[],
}

export const cleaningAssessment = [
  {
    question: "When cleaning a room, which order is usually most practical?",
    options: ["Work from higher surfaces down to the floor", "Clean the floor first, then dust above it", "Use the same cloth on every surface"],
    answer: 0,
  },
  {
    question: "What should you do before using a cleaning product?",
    options: ["Mix it with another product", "Read and follow its label directions", "Pour it into an unlabelled bottle"],
    answer: 1,
  },
  {
    question: "What is a good first step when changing bed linen?",
    options: ["Place clean linen on the floor", "Remove used linen and prepare a clean work area", "Shake used linen near clean bedding"],
    answer: 1,
  },
  {
    question: "How should laundry be prepared?",
    options: ["Check care labels and sort items as needed", "Wash every fabric at the hottest setting", "Ignore pockets and fasteners"],
    answer: 0,
  },
  {
    question: "What is important when cleaning kitchen surfaces used for food?",
    options: ["Use a cloth that was just used in the bathroom", "Follow product directions and use a clean suitable cloth", "Spray cleaner directly onto uncovered food"],
    answer: 1,
  },
] as const
