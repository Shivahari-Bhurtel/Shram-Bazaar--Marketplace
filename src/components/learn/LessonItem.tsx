import type { CourseLesson } from "../../data/courses"

type Props = {
  lesson: CourseLesson
  index: number
  completed: boolean
  current: boolean
  onSelect?: (lessonId: string) => void
  compact?: boolean
}

export default function LessonItem({ lesson, index, completed, current, onSelect, compact = false }: Props) {
  const content = (
    <>
      <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${compact ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"} ${completed ? "bg-emerald-100 text-emerald-700" : current ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
        {completed ? "✓" : current ? "▶" : index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>{lesson.title}</span>
        <span className={`mt-0.5 block text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>{completed ? "Completed" : current ? "Current lesson" : "Lesson"} · {lesson.durationMinutes == null ? "Duration unavailable" : `${lesson.durationMinutes} min`}</span>
      </span>
      {onSelect && <span aria-hidden="true" className="text-slate-400">›</span>}
    </>
  )

  return onSelect ? (
    <button type="button" onClick={() => onSelect(lesson.id)} aria-current={current ? "step" : undefined} className={`flex w-full items-center text-left transition ${compact ? "gap-2 rounded-lg px-2 py-2" : "gap-3 rounded-xl px-3 py-3"} ${current ? "bg-blue-50" : "hover:bg-slate-50"}`}>
      {content}
    </button>
  ) : (
    <div className={`flex items-center ${compact ? "gap-2 rounded-lg px-2 py-2" : "gap-3 rounded-xl px-3 py-3"}`}>{content}</div>
  )
}
