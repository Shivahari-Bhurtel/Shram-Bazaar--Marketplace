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
}

export default function CourseDetails({ course, progress, isEnrolled, onStart, onSelectLesson }: Props) {
  const metric = getCourseProgress(course, progress)

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <img src={course.thumbnail} alt="" className="aspect-[2.7/1] max-h-[360px] w-full bg-slate-100 object-cover" />
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{course.category}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{course.level}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{course.durationHours} hours</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{metric.totalLessons} lessons</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{course.modules.length} modules</span></div>
          <div className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{course.title}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{course.description}</p>
              <h2 className="mt-7 text-lg font-bold text-slate-900">What you will learn</h2><ul className="mt-3 grid gap-2 sm:grid-cols-2">{course.objectives.map((objective) => <li key={objective} className="flex gap-2 text-sm leading-relaxed text-slate-700"><span className="font-bold text-blue-700">✓</span><span>{objective}</span></li>)}</ul>
              <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Course curriculum</h2><ModuleAccordion modules={course.modules} courseId={course.id} progress={progress} currentLessonId={progress.currentLessons[course.id]} onSelectLesson={onSelectLesson} />
            </div>
            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:sticky lg:top-24">
              <p className="text-sm font-semibold text-slate-900">Your course progress</p><div className="mt-3"><CourseProgress completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} /></div>
              <div className="mt-5 flex flex-wrap gap-2">{course.skills.map((skill) => <span key={skill} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{skill}</span>)}</div>
              <button type="button" onClick={onStart} className="mt-6 min-h-11 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">{metric.isComplete ? "Review lessons" : isEnrolled ? "Continue learning" : "Start learning"}</button>
              <p className="mt-3 text-center text-xs text-slate-500">Self-paced · progress saves on this device</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
