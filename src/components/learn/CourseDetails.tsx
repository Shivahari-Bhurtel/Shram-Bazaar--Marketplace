import type { LearnCourse, LearningProgress } from "../../data/courses"
import { getCourseProgress } from "../../data/courses"
import CourseProgress from "./CourseProgress"
import ModuleAccordion from "./ModuleAccordion"

type Props = {
  course: LearnCourse
  progress: LearningProgress
  isEnrolled: boolean
  onStart: () => void
  onSelectLesson: (lessonId: string) => void
  onPlayGame?: () => void
}

export default function CourseDetails({ course, progress, isEnrolled, onStart, onSelectLesson, onPlayGame }: Props) {
  const metric = getCourseProgress(course, progress)
  const isCraneCourse = course.id === "crane-operation-basics"
  const courseMetadata = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-[#F3E9DF] px-3 py-1.5 text-xs font-semibold text-[#4E342E]">{course.category}</span>
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.level}</span>
      {course.durationHours != null && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.durationHours} hours</span>}
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{metric.totalLessons} lessons</span>
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.modules.length} modules</span>
    </div>
  )

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <img src={course.thumbnail} alt="" className={`${isCraneCourse ? "object-contain bg-[#E9E8E5]" : "object-cover bg-slate-100"} h-[200px] w-full sm:h-[220px]`} />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mt-5 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <header className="border-b border-slate-100 pb-5">
                {isCraneCourse && course.optionalGame && onPlayGame ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="min-w-0 flex-1 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{course.title}</h1>
                    <button type="button" onClick={onPlayGame} className="min-h-11 shrink-0 rounded-xl bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F162D]">Test Your Skill</button>
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{course.title}</h1>
                )}
                <div className="mt-3">{courseMetadata}</div>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-600">{course.description}</p>
              </header>

              <section className="mt-8" aria-labelledby="course-curriculum-heading">
                <h2 id="course-curriculum-heading" className="mb-3 text-xl font-bold text-slate-900">Course curriculum</h2>
                <ModuleAccordion modules={course.modules} courseId={course.id} progress={progress} currentLessonId={progress.currentLessons[course.id]} onSelectLesson={onSelectLesson} />
              </section>
            </div>
            <aside className="h-fit rounded-xl border border-[#D9C6B2] bg-white p-4 font-['Source_Sans_3','Inter',sans-serif] shadow-sm sm:p-4 lg:sticky lg:top-24">
              <div>
                <p className="text-[17px] font-bold leading-tight tracking-[-0.015em] text-[#35261D]">Your course progress</p>
                <div className="mt-3"><CourseProgress completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} prominent /></div>
              </div>
              <div className="mt-4 border-t border-[#E8DDCF] pt-4">
                <p className="mb-2 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#4E342E]">Skills covered</p>
                <ul className="grid grid-cols-1 gap-x-3 gap-y-1.5 font-['Source_Sans_3','Inter',sans-serif] text-sm font-medium leading-snug text-[#5B4032] sm:grid-cols-2">
                  {course.skills.map((skill) => <li key={skill} className="flex min-h-7 items-center border-b border-[#EEE5DC] px-1 pb-1">{skill}</li>)}
                </ul>
              </div>
              <button type="button" onClick={onStart} className="mt-5 min-h-11 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">{metric.isComplete ? "Review lessons" : isEnrolled ? "Continue learning" : "Start learning"}</button>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
