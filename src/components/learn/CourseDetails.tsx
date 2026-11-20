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
      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isCraneCourse ? "bg-[#F3E9DF] text-[#4E342E]" : "bg-blue-50 text-blue-800"}`}>{course.category}</span>
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.level}</span>
      {course.durationHours != null && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.durationHours} hours</span>}
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{metric.totalLessons} lessons</span>
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{course.modules.length} modules</span>
    </div>
  )

  return (
    <section>
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${isCraneCourse ? "shadow-sm" : ""}`}>
        <img src={course.thumbnail} alt="" className={`${isCraneCourse ? "aspect-video max-h-[260px] object-contain bg-[#E9E8E5]" : "aspect-[2.7/1] max-h-[360px] object-cover bg-slate-100"} w-full`} />
        <div className={isCraneCourse ? "p-4 sm:p-6 lg:p-8" : "p-5 sm:p-8"}>
          {!isCraneCourse && courseMetadata}
          <div className={`mt-5 grid items-start gap-8 ${isCraneCourse ? "lg:grid-cols-[minmax(0,1fr)_300px]" : "lg:grid-cols-[minmax(0,1fr)_280px]"}`}>
            <div className="min-w-0">
              <header className={isCraneCourse ? "border-b border-slate-100 pb-5" : ""}>
                {isCraneCourse && course.optionalGame && onPlayGame ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="min-w-0 flex-1 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{course.title}</h1>
                    <button type="button" onClick={onPlayGame} className="min-h-11 shrink-0 rounded-xl bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F162D]">Test Your Skill</button>
                  </div>
                ) : (
                  <h1 className={`${isCraneCourse ? "text-3xl leading-tight sm:text-4xl" : "text-2xl sm:text-3xl"} font-bold tracking-tight text-slate-950`}>{course.title}</h1>
                )}
                {isCraneCourse && <div className="mt-3">{courseMetadata}</div>}
                <p className={`${isCraneCourse ? "mt-4 text-[15px] leading-7" : "mt-3 text-sm leading-relaxed"} max-w-3xl text-slate-600`}>{course.description}</p>
                {course.safetyNotice && !isCraneCourse && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"><strong className="font-semibold">Safety notice: </strong>{course.safetyNotice}</p>}
              </header>

              <section className="mt-7" aria-labelledby="course-objectives-heading">
                <h2 id="course-objectives-heading" className="text-xl font-bold text-slate-900">What you will learn</h2>
                <ul className={`mt-3 grid sm:grid-cols-2 ${isCraneCourse ? "gap-2.5" : "gap-2"}`}>
                  {course.objectives.map((objective) => <li key={objective} className={`flex items-start gap-2.5 text-sm text-slate-700 ${isCraneCourse ? "rounded-xl border border-[#EFE6DA] bg-[#FCFAF7] px-3.5 py-3 leading-6" : "leading-relaxed"}`}><span className="mt-0.5 font-bold text-[#80502F]">✓</span><span>{objective}</span></li>)}
                </ul>
              </section>

              <section className="mt-8" aria-labelledby="course-curriculum-heading">
                <h2 id="course-curriculum-heading" className="mb-3 text-xl font-bold text-slate-900">Course curriculum</h2>
                <ModuleAccordion modules={course.modules} courseId={course.id} progress={progress} currentLessonId={progress.currentLessons[course.id]} onSelectLesson={onSelectLesson} />
              </section>
            </div>
            <aside className={`h-fit rounded-2xl border p-4 sm:p-5 lg:sticky lg:top-24 ${isCraneCourse ? "border-[#E8DDCF] bg-white" : "border-slate-200 bg-slate-50"}`}>
              <div className={isCraneCourse ? "" : "border-t border-slate-200/80 pt-4"}>
                <p className="text-sm font-semibold text-slate-900">Your course progress</p>
                <div className="mt-3"><CourseProgress completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} /></div>
              </div>
              <div className="mt-5 border-t border-slate-200/80 pt-4">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Skills covered</p>
                <div className="flex flex-wrap gap-2">{course.skills.map((skill) => <span key={skill} className="rounded-full border border-[#E5D9C9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#5B4032]">{skill}</span>)}</div>
              </div>
              <button type="button" onClick={onStart} className="mt-5 min-h-11 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">{metric.isComplete ? "Review lessons" : isEnrolled ? "Continue learning" : "Start learning"}</button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">Self-paced · progress saves on this device</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
