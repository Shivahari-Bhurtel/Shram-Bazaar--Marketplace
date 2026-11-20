import type { LearnCourse } from "./courseTypes"

// Final files can be added one at a time. A final course with the same stable
// id overrides its mock; untouched courses continue to use their mock content.
const mockCourseFiles = import.meta.glob<LearnCourse>("./mock/*.json", {
  eager: true,
  import: "default",
})
const finalCourseFiles = import.meta.glob<LearnCourse>("./*.json", {
  eager: true,
  import: "default",
})
const coursesById = new Map(Object.values(mockCourseFiles).map((course) => [course.id, course]))
for (const course of Object.values(finalCourseFiles)) coursesById.set(course.id, course)

export const learningCourses = [...coursesById.values()]
export const learningCategories = [...new Set(learningCourses.map((course) => course.category))]

export type { CourseCategory, CourseLesson, CourseModule, CourseQuiz, CourseQuizQuestion, LearnCourse, LearningProgress } from "./courseTypes"
export { emptyLearningProgress, getCourseLessons, getCourseProgress } from "./courseTypes"
