export default function ShramaAIMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`shrama-ai-mark ${className}`} aria-hidden="true">
      <text x="1" y="17.5" fill="#39265F" fontSize="14" fontWeight="400" letterSpacing="-.55" fontFamily="Arial, sans-serif">AI</text>
      <path className="shrama-ai-star" d="m20 2.5.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" fill="white" stroke="#39265F" strokeWidth=".9" strokeLinejoin="round" />
    </svg>
  );
}
