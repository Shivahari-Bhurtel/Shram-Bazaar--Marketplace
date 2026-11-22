export default function RatingStars({ rating, count, compact = false }: { rating?: number | null; count?: number | null; compact?: boolean }) {
  const validRating = typeof rating === "number" && Number.isFinite(rating) && rating >= 0 && rating <= 5
  const rated = validRating && (typeof count !== "number" || count > 0)
  const label = rated
    ? `${rating!.toFixed(1)} out of 5${typeof count === "number" ? `, ${count} ${count === 1 ? "rating" : "ratings"}` : ""}`
    : "Not rated"

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${compact ? "" : "text-sm"}`} aria-label={label} title={label}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <span key={index} className={`${compact ? "text-base leading-none" : "text-lg leading-none"} ${rated && index < Math.round(rating!) ? "text-[#D6A63D]" : "text-[#9A7A3D]"}`}>{rated && index < Math.round(rating!) ? "★" : "☆"}</span>)}
      </span>
      <span className="font-medium text-[#657168]">{rated ? <><strong className="font-bold text-[#34443A]">{rating!.toFixed(1)}</strong>{typeof count === "number" && <span className="ml-1">({count})</span>}</> : "Not rated"}</span>
    </span>
  )
}
