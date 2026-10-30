export default function ShramaAIMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <text x="1" y="17.5" fill="currentColor" fontSize="14" fontWeight="500" letterSpacing="-.8" fontFamily="Arial, sans-serif">AI</text>
      <path d="m20 2.5.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" fill="white" stroke="black" strokeWidth=".9" strokeLinejoin="round" />
    </svg>
  );
}
