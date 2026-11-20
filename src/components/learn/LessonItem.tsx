import type { CourseLesson } from "../../data/courses"

type Props = {
  lesson: CourseLesson
  index: number
  completed: boolean
  current: boolean
  onSelect?: (lessonId: string) => void
}

export default function LessonItem({ lesson, index, completed, current, onSelect }: Props) {
  const content = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${completed ? "bg-emerald-100 text-emerald-700" : current ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
        {completed ? "✓" : current ? "▶" : index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">{lesson.title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{completed ? "Completed" : current ? "Current lesson" : "Lesson"} · {lesson.durationMinutes == null ? "Duration unavailable" : `${lesson.durationMinutes} min`}</span>
      </span>
      {onSelect && <span aria-hidden="true" className="text-slate-400">›</span>}
    </>
  )

  return onSelect ? (
    <button type="button" onClick={() => onSelect(lesson.id)} aria-current={current ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${current ? "bg-blue-50" : "hover:bg-slate-50"}`}>
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3">{content}</div>
  )
}
