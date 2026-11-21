import {
  emptyLearningProgress,
  getCourseLessons,
  getCourseProgress,
  type LearnCourse,
  type LearningProgress,
} from "../data/courses"

const STORAGE_KEY = "shram-bazar-learn-progress-v1"

function storageKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`
}

export function createCertificateId(courseId: string, learnerId: string, completedAt: string) {
  const day = new Date(completedAt)
  const dateId = Number.isNaN(day.getTime()) ? "UNKNOWN" : day.toISOString().slice(0, 10).replace(/-/g, "")
  const source = `${learnerId}:${courseId}:${dateId}`
  const hash = Array.from(source).reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0
  return `SB-${courseId.toUpperCase()}-${dateId}-${hash.toString(36).toUpperCase()}`
}

export function loadLearningProgress(userId: string): LearningProgress {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) || "null")
    if (!value || typeof value !== "object" || Array.isArray(value)) return emptyLearningProgress()
    const saved = value as Partial<LearningProgress>
    const completedLessons = saved.completedLessons && typeof saved.completedLessons === "object"
      ? Object.fromEntries(Object.entries(saved.completedLessons)
          .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
          .map(([courseId, lessonIds]) => [courseId, lessonIds.filter((id): id is string => typeof id === "string")]))
      : {}
    const currentLessons = saved.currentLessons && typeof saved.currentLessons === "object"
      ? Object.fromEntries(Object.entries(saved.currentLessons).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {}
    const completedAt = saved.completedAt && typeof saved.completedAt === "object"
      ? Object.fromEntries(Object.entries(saved.completedAt).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {}
    const certificates = saved.certificates && typeof saved.certificates === "object"
      ? Object.fromEntries(Object.entries(saved.certificates).filter((entry): entry is [string, NonNullable<LearningProgress["certificates"][string]>] => {
          const record = entry[1]
          return !!record && typeof record === "object" && typeof record.courseId === "string" && typeof record.courseName === "string" && typeof record.learnerName === "string" && typeof record.certificateId === "string" && typeof record.completedAt === "string" && typeof record.templateId === "string"
        }))
      : {}
    const quizResults = saved.quizResults && typeof saved.quizResults === "object"
      ? Object.fromEntries(Object.entries(saved.quizResults).filter((entry): entry is [string, { score: number; total: number; attemptedAt: string }] => {
          const result = entry[1]
          return !!result && typeof result === "object" && typeof result.score === "number" && typeof result.total === "number" && typeof result.attemptedAt === "string"
        }))
      : {}
    return {
      enrolledCourseIds: Array.isArray(saved.enrolledCourseIds)
        ? saved.enrolledCourseIds.filter((id): id is string => typeof id === "string")
        : [],
      completedLessons,
      currentLessons,
      completedAt,
      certificates,
      quizResults,
    }
  } catch {
    return emptyLearningProgress()
  }
}

export function saveLearningProgress(userId: string, progress: LearningProgress) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function enrollInCourse(progress: LearningProgress, course: LearnCourse): LearningProgress {
  const firstLesson = getCourseLessons(course)[0]
  return {
    ...progress,
    enrolledCourseIds: progress.enrolledCourseIds.includes(course.id)
      ? progress.enrolledCourseIds
      : [...progress.enrolledCourseIds, course.id],
    currentLessons: firstLesson && !progress.currentLessons[course.id]
      ? { ...progress.currentLessons, [course.id]: firstLesson.id }
      : progress.currentLessons,
  }
}

export function setCurrentLesson(
  progress: LearningProgress,
  course: LearnCourse,
  lessonId: string,
): LearningProgress {
  const lessonExists = getCourseLessons(course).some((lesson) => lesson.id === lessonId)
  if (!lessonExists) return progress
  return {
    ...enrollInCourse(progress, course),
    currentLessons: { ...progress.currentLessons, [course.id]: lessonId },
  }
}

export function markLessonComplete(
  progress: LearningProgress,
  course: LearnCourse,
  lessonId: string,
): LearningProgress {
  if (!getCourseLessons(course).some((lesson) => lesson.id === lessonId)) return progress
  const completedLessons = [...new Set([...(progress.completedLessons[course.id] || []), lessonId])]
  const next: LearningProgress = {
    ...enrollInCourse(progress, course),
    completedLessons: { ...progress.completedLessons, [course.id]: completedLessons },
  }
  if (getCourseProgress(course, next).isComplete && !next.completedAt[course.id]) {
    next.completedAt = { ...next.completedAt, [course.id]: new Date().toISOString() }
  }
  return next
}

export function saveQuizResult(
  progress: LearningProgress,
  courseId: string,
  quizId: string,
  score: number,
  total: number,
): LearningProgress {
  return {
    ...progress,
    quizResults: {
      ...progress.quizResults,
      [`${courseId}:${quizId}`]: { score, total, attemptedAt: new Date().toISOString() },
    },
  }
}
