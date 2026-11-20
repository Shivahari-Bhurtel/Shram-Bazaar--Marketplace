import type { LearnCourse } from "./courseTypes"
import type { CourseCategory } from "./courseTypes"

type FinalCourseSource = {
  course: {
    id: string
    title: string
    category: string
    level?: "Beginner" | "Intermediate"
    description: string
    shortDescription?: string
    durationHours?: number
    thumbnail?: string
    accent?: string
    skills?: string[]
    learningOutcomes?: string[]
    objectives?: string[]
    safetyNotice?: string
    certificateEligible?: boolean
    optionalGame?: {
      id: string
      title: string
      moduleTitle?: string
      repositoryUrl: string
      gameType: string
      entryRoute: string
      optional: boolean
      requiredForCourseCompletion: boolean
      completionTracking: boolean
    }
    optionalGameNotice?: string
    modules: Array<{
      id: string
      title: string
      description?: string
      summary?: string
      lessons: Array<{
        id: string
        title: string
        description: string
        durationMinutes: number | null
        videoId?: string | null
        youtubeUrl?: string | null
        thumbnailUrl?: string | null
      }>
    }>
  }
}

// Final source files can be added one at a time. The adapter keeps the
// existing stable course ID so learner progress remains attached to the course.
const mockCourseFiles = import.meta.glob<LearnCourse>("./mock/*.json", {
  eager: true,
  import: "default",
})
const finalCourseFiles = import.meta.glob<FinalCourseSource>("./final/*.json", {
  eager: true,
  import: "default",
})
const coursesById = new Map(Object.values(mockCourseFiles).map((course) => [course.id, course]))
for (const sourceFile of Object.values(finalCourseFiles)) {
  const source = sourceFile.course
  const sourceCategory = source.category === "Painting and Finishing" ? "Painting" : source.category
  const existing = [...coursesById.values()].find((course) => course.category === sourceCategory)
  if (!existing) continue
  const firstLesson = source.modules[0]?.lessons[0]
  const course: LearnCourse = {
    id: existing.id,
    title: source.title,
    slug: existing.slug,
    category: source.category as CourseCategory,
    level: source.level ?? existing.level,
    shortDescription: source.shortDescription ?? source.description,
    description: source.description,
    ...(source.durationHours == null ? {} : { durationHours: source.durationHours }),
    thumbnail: source.thumbnail ?? firstLesson?.thumbnailUrl ?? (firstLesson?.videoId ? `https://img.youtube.com/vi/${firstLesson.videoId}/hqdefault.jpg` : existing.thumbnail),
    accent: source.accent ?? existing.accent,
    skills: source.skills ?? [],
    objectives: source.learningOutcomes ?? source.objectives ?? [],
    safetyNotice: source.safetyNotice,
    certificateEligible: source.certificateEligible,
    optionalGame: source.optionalGame,
    optionalGameNotice: source.optionalGameNotice,
    modules: source.modules.map((module) => ({
      id: module.id,
      title: module.title,
      summary: module.description ?? module.summary ?? "",
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
        videoId: lesson.videoId,
        youtubeUrl: lesson.youtubeUrl,
      })),
    })),
  }
  coursesById.set(existing.id, course)
}

export const learningCourses = [...coursesById.values()]
export const learningCategories = [...new Set(learningCourses.map((course) => course.category))]

export type { CourseCategory, CourseLesson, CourseModule, CourseQuiz, CourseQuizQuestion, LearnCourse, LearningProgress } from "./courseTypes"
export { emptyLearningProgress, getCourseLessons, getCourseProgress } from "./courseTypes"
