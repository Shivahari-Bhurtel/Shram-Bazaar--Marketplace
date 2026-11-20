type Props = {
  completed: number
  total: number
  percent: number
  compact?: boolean
  prominent?: boolean
}

export default function CourseProgress({ completed, total, percent, compact = false, prominent = false }: Props) {
  return (
    <div>
      <div className={`mb-2 flex items-center justify-between gap-3 ${prominent ? "text-sm" : "text-xs"}`}>
        <span className="font-medium text-slate-600">{completed} of {total} lessons</span>
        <span className="font-semibold text-slate-800">{percent}%</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-slate-100 ${prominent ? "h-2" : compact ? "h-1.5" : "h-2"}`}
        role="progressbar"
        aria-label="Course progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
