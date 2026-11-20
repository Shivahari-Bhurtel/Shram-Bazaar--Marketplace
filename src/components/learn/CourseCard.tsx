import type { LearnCourse } from "../../data/courses"
import CourseProgress from "./CourseProgress"

type Props = {
  course: LearnCourse
  completed: number
  total: number
  percent: number
  enrolled: boolean
  onView: (course: LearnCourse) => void
  onContinue?: (course: LearnCourse) => void
}

export default function CourseCard({ course, completed, total, percent, enrolled, onView, onContinue }: Props) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-slate-200/60">
      <button type="button" className="relative block w-full overflow-hidden bg-slate-100 text-left" onClick={() => onView(course)} aria-label={`View ${course.title}`}>
        <img src={course.thumbnail} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">{course.category}</span>
        {enrolled && <span className="absolute right-2.5 top-2.5 rounded-full bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white">Enrolled</span>}
      </button>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex min-h-4 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500">
          <span>{course.level}</span><span aria-hidden="true">·</span><span>{total} lessons</span>{course.durationHours != null && <><span aria-hidden="true">·</span><span>{course.durationHours} hrs</span></>}
        </div>
        <button type="button" onClick={() => onView(course)} className="learn-course-title mt-1.5 min-h-10 line-clamp-2 text-left text-base font-semibold leading-5 text-slate-900 transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          {course.title}
        </button>
        <p className="mt-1.5 min-h-9 line-clamp-2 text-xs leading-[18px] text-slate-600">{course.shortDescription}</p>
        <div className="mt-auto pt-3">
          <div className="mb-3"><CourseProgress completed={completed} total={total} percent={percent} compact /></div>
          <button type="button" onClick={() => enrolled && onContinue ? onContinue(course) : onView(course)} className="inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {enrolled ? completed === total && total > 0 ? "Review course" : completed > 0 ? "Continue learning" : "Start learning" : "View course"}
          </button>
        </div>
      </div>
    </article>
  )
}
