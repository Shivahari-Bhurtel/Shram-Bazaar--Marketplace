import type { LearnCourse } from "../../data/courses"

type Props = { course: LearnCourse; learnerName: string; completedAt: string; certificateId: string }

export default function CraneCertificateArtwork({ course, learnerName, completedAt, certificateId }: Props) {
  const date = new Date(completedAt)
  const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  const nameSize = Math.min(43, Math.max(25, 610 / Math.max(learnerName.length, 1)))
  const sealPoints = Array.from({ length: 40 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 40 - Math.PI / 2
    const radius = index % 2 === 0 ? 74 : 66
    return `${512 + Math.cos(angle) * radius},${554 + Math.sin(angle) * radius}`
  }).join(" ")

  return <svg width="1024" height="768" className="certificate-artwork block h-auto max-h-[58vh] max-w-full w-auto" viewBox="0 0 1024 768" role="img" aria-label={`Certificate of completion for ${course.title}, awarded to ${learnerName}`}>
    <defs>
      <linearGradient id="crane-paper" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffefa"/><stop offset="1" stopColor="#f4f2ed"/></linearGradient>
      <linearGradient id="crane-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5d479"/><stop offset=".48" stopColor="#bd8733"/><stop offset="1" stopColor="#f3d58b"/></linearGradient>
      <pattern id="crane-lines" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-13)"><path d="M0 5H22M0 12H22M0 19H22" stroke="#9a8c73" strokeOpacity=".12" strokeWidth="1"/></pattern>
      <pattern id="crane-medal" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#fff0b8" strokeOpacity=".38" strokeWidth="3"/></pattern>
      <filter id="crane-shadow" x="-.2" y="-.2" width="1.4" height="1.4"><feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity=".35"/></filter>
    </defs>
    <rect width="1024" height="768" fill="url(#crane-paper)"/>
    <rect width="1024" height="768" fill="url(#crane-lines)"/>
    <rect x="45" y="34" width="934" height="690" fill="none" stroke="#b28b4d" strokeWidth="3"/>
    <rect x="54" y="43" width="916" height="672" fill="none" stroke="#d0b47b" strokeWidth="1.5"/>
    <path d="M0 0H1024V147C830 103 708 115 578 168 390 245 227 355 0 386Z" fill="#123553"/>
    <path d="M0 0H1024V125C826 90 723 105 592 161 375 254 208 345 0 367Z" fill="#0e2b46" opacity=".55"/>
    <path d="M554 203C714 120 851 101 1024 132V242C856 169 739 162 577 238Z" fill="url(#crane-gold)"/>
    <path d="M564 195C730 124 855 119 1024 147" fill="none" stroke="#fff2c6" strokeWidth="7" opacity=".85"/>
    <text x="60" y="109" fill="#d5a64e" fontFamily="Georgia,serif" fontSize="68" letterSpacing="1" filter="url(#crane-shadow)">Certificate</text>
    <text x="62" y="147" fill="#fff" fontFamily="Arial,sans-serif" fontSize="24" letterSpacing="3">OF COMPLETION</text>
    <text x="760" y="260" textAnchor="middle" fill="#4b2c1e" fontFamily="Georgia,serif" fontSize="47" fontWeight="bold">श्रम</text>
    <text x="842" y="260" fill="#4b2c1e" fontFamily="cursive" fontSize="51" fontStyle="italic">Bazaar</text>
    <text x="512" y="350" textAnchor="middle" fill="#8d7861" fontFamily="Georgia,serif" fontSize={nameSize} fontStyle="italic">{learnerName}</text>
    <path d="M267 365H757" stroke="#6f5e4a" strokeWidth="1.5"/>
    <text x="512" y="405" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="20">This certificate is proudly presented for successfully completing the course</text>
    <text x="512" y="434" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="20">{course.title} (Beginner Level), covering crane operation safety,</text>
    <text x="512" y="463" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="20">rigging fundamentals, and heavy equipment handling.</text>
    <g fill="none" stroke="#121212" strokeWidth="1.4"><path d="M180 562H403M637 562H856"/></g>
    <text x="291" y="550" textAnchor="middle" fill="#171717" fontFamily="cursive" fontSize="31" fontStyle="italic">Kritish Acharya</text>
    <text x="291" y="588" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="18">Kritish Acharya</text>
    <text x="291" y="613" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="17">Director of Shram Bazaar Learning</text>
    <text x="747" y="550" textAnchor="middle" fill="#171717" fontFamily="cursive" fontSize="31" fontStyle="italic">Shram Bazaar</text>
    <text x="747" y="588" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="18">Project Lead</text>
    <text x="747" y="613" textAnchor="middle" fill="#171717" fontFamily="Arial,sans-serif" fontSize="17">Shram Bazaar</text>
    <polygon points={sealPoints} fill="url(#crane-gold)" stroke="#9d762e" strokeWidth="3" filter="url(#crane-shadow)"/>
    <circle cx="512" cy="554" r="57" fill="url(#crane-medal)" stroke="#946e29" strokeWidth="2"/>
    <text x="512" y="540" textAnchor="middle" fill="#362314" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold">Shram Bazaar</text>
    <text x="512" y="563" textAnchor="middle" fill="#362314" fontFamily="Georgia,serif" fontSize="17" fontWeight="bold">श्रम Bazaar</text>
    <text x="512" y="591" textAnchor="middle" fill="#362314" fontFamily="Georgia,serif" fontSize="16" fontStyle="italic">Certified</text>
    <text x="78" y="697" fill="#29251f" fontFamily="Arial,sans-serif" fontSize="13">{certificateId}</text>
    <text x="946" y="697" textAnchor="end" fill="#29251f" fontFamily="Arial,sans-serif" fontSize="13">{dateLabel}</text>
    <text x="512" y="685" textAnchor="middle" fill="#37332d" fontFamily="Arial,sans-serif" fontSize="11">This certificate confirms completion of introductory online learning only.</text>
    <text x="512" y="701" textAnchor="middle" fill="#37332d" fontFamily="Arial,sans-serif" fontSize="11">It is not a trade license or professional qualification.</text>
  </svg>
}
