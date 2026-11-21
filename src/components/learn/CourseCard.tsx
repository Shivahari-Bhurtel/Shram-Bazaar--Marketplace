import type { LearnCourse } from "../../data/courses"
import CourseProgress from "./CourseProgress"

type Props = {
  course: LearnCourse
  completed: number
  total: number
  percent: number
  enrolled: boolean
  highlighted?: boolean
  onView: (course: LearnCourse) => void
  onContinue?: (course: LearnCourse) => void
}

export default function CourseCard({ course, completed, total, percent, enrolled, highlighted = false, onView, onContinue }: Props) {
  return (
    <article className={`learn-course-card group flex h-full flex-col overflow-hidden rounded-xl border transition duration-200 hover:-translate-y-0.5 hover:border-[#B58A64] hover:shadow-md hover:shadow-[#6B4A32]/10 ${highlighted ? "border-[#D7BFA4] bg-[#F7F0E8]" : "border-[#E5D9CC] bg-white"}`}>
      <button type="button" className="relative block w-full overflow-hidden bg-slate-100 text-left" onClick={() => onView(course)} aria-label={`View ${course.title}`}>
        <img src={course.thumbnail} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">{course.category}</span>
        {enrolled && <span className="absolute right-3 top-3 rounded-full bg-[#4E342E] px-2.5 py-1 text-xs font-semibold text-white">Enrolled</span>}
      </button>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-slate-600">
          <span>{course.level}</span><span aria-hidden="true">·</span><span>{total} lessons</span>{course.durationHours != null && <><span aria-hidden="true">·</span><span>{course.durationHours} hrs</span></>}
        </div>
        <button type="button" onClick={() => onView(course)} className="learn-course-title mt-1 min-h-[3.75rem] line-clamp-2 text-left text-lg font-bold leading-[1.3] text-[#35261D] transition hover:text-[#80502F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80502F]">
          {course.title}
        </button>
        <p className="mt-2 min-h-[4.5rem] line-clamp-3 text-sm leading-[1.5] text-slate-600">{course.shortDescription}</p>
        <div className="mt-auto pt-4">
          <div className="mb-3"><CourseProgress completed={completed} total={total} percent={percent} compact /></div>
          <button type="button" onClick={() => enrolled && onContinue ? onContinue(course) : onView(course)} className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#4E342E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3B2722] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4E342E]">
            {enrolled ? completed === total && total > 0 ? "Review course" : completed > 0 ? "Continue learning" : "Start learning" : "View course"}
          </button>
        </div>
      </div>
    </article>
  )
}
