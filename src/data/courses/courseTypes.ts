export type CourseCategory =
  | "Electrical"
  | "Plumbing"
  | "Carpentry"
  | "Motorcycle Maintenance"
  | "Painting"
  | "Painting and Finishing"
  | "Construction Skills"

export type CourseLesson = {
  id: string
  title: string
  description: string
  durationMinutes: number | null
  videoId?: string | null
  youtubeUrl?: string | null
}

export type CourseModule = {
  id: string
  title: string
  summary: string
  lessons: CourseLesson[]
}

export type CourseQuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation?: string
}

export type CourseQuiz = {
  id: string
  title: string
  questions: CourseQuizQuestion[]
}

export type LearnCourse = {
  id: string
  title: string
  slug: string
  category: CourseCategory
  level: "Beginner" | "Intermediate"
  shortDescription: string
  description: string
  durationHours?: number
  thumbnail: string
  accent: string
  skills: string[]
  objectives: string[]
  modules: CourseModule[]
  safetyNotice?: string
  quizzes?: CourseQuiz[]
  certificateEligible?: boolean
  optionalGame?: {
    id: string
    title: string
    moduleTitle?: string
    repositoryUrl: string
    gameType: string
    entryRoute: string
  }
  optionalGameNotice?: string
}

export type LearningProgress = {
  enrolledCourseIds: string[]
  completedLessons: Record<string, string[]>
  currentLessons: Record<string, string>
  completedAt: Record<string, string>
  quizResults: Record<string, { score: number; total: number; attemptedAt: string }>
}

export const emptyLearningProgress = (): LearningProgress => ({
  enrolledCourseIds: [],
  completedLessons: {},
  currentLessons: {},
  completedAt: {},
  quizResults: {},
})

export function getCourseLessons(course: LearnCourse): CourseLesson[] {
  return course.modules.flatMap((module) => module.lessons)
}

export function getCourseProgress(course: LearnCourse, progress: LearningProgress) {
  const lessons = getCourseLessons(course)
  const completedIds = new Set(progress.completedLessons[course.id] || [])
  const completedCount = lessons.filter((lesson) => completedIds.has(lesson.id)).length
  return {
    completedCount,
    totalLessons: lessons.length,
    percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
    isComplete: lessons.length > 0 && completedCount === lessons.length,
  }
}
