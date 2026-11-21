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
      <div className={`mb-2.5 flex items-baseline justify-between gap-4 ${prominent ? "text-base" : "text-xs"}`}>
        <span className="font-semibold tabular-nums text-[#5B4032]">{completed} of {total} lessons</span>
        <span className="font-bold tabular-nums text-[#4E342E]">{percent}%</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-slate-100 ${prominent ? "h-2" : compact ? "h-1.5" : "h-2"}`}
        role="progressbar"
        aria-label="Course progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-[#8A5B37] transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
