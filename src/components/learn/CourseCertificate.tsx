import type { CertificateRecord, LearnCourse } from "../../data/courses"
import { createCertificateId } from "../../services/learnProgress"
import CraneCertificateArtwork from "./CraneCertificateArtwork"

type Props = {
  course: LearnCourse
  learnerName: string
  learnerId: string
  completedAt: string
  record?: CertificateRecord
  onReview: () => void
}

export default function CourseCertificate({ course, learnerName, learnerId, completedAt, record, onReview }: Props) {
  const resolvedName = record?.learnerName || learnerName
  const resolvedTitle = record?.courseName || course.title
  const resolvedDate = record?.completedAt || completedAt
  const date = new Date(resolvedDate)
  const dateLabel = Number.isNaN(date.getTime()) ? "Completion date unavailable" : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  const certificateId = record?.certificateId || createCertificateId(course.id, learnerId, resolvedDate)
  const share = async () => {
    const message = `I completed ${resolvedTitle} with Shram Bazaar Learn.`
    if (navigator.share) {
      try { await navigator.share({ title: "Course completed", text: message }) } catch { /* Sharing was cancelled. */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(message)
      window.alert("Achievement message copied.")
    }
  }

  return <section className="mx-auto max-w-4xl" aria-labelledby="certificate-page-title">
    <div className="mb-4"><h1 id="certificate-page-title" className="text-2xl font-bold text-[#35261D] sm:text-3xl">Congratulations!</h1><p className="mt-1 font-['Dancing_Script',cursive] text-xl font-semibold leading-snug text-[#80502F] sm:text-2xl">You completed {resolvedTitle} — {getLessonsLabel(course)}/{getLessonsLabel(course)} lessons · {dateLabel}</p></div>
    {course.id === "crane-operation-basics" ? <div className="certificate-print-area mx-auto flex max-h-[58vh] w-full items-center justify-center overflow-hidden border border-[#B58A49] bg-[#FAF9F5] shadow-xl"><CraneCertificateArtwork course={course} learnerName={resolvedName} completedAt={resolvedDate} certificateId={certificateId} /></div> : <div className="certificate-print-area relative mx-auto max-h-[58vh] max-w-4xl overflow-hidden border-[8px] border-double border-[#B58A49] bg-[#FAF9F5] p-4 shadow-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[#123553] sm:h-36" />
      <div className="pointer-events-none absolute right-[-8%] top-20 h-24 w-[80%] -rotate-[8deg] rounded-[50%] border-t-[18px] border-[#C9953F] bg-white sm:h-36 sm:top-28" />
      <div className="relative z-10 flex min-h-[340px] flex-col items-center justify-center px-1 pt-14 text-center sm:min-h-[440px] sm:pt-16">
        <h2 className="self-start text-left font-serif text-3xl font-bold uppercase tracking-wide text-[#D8AD61] drop-shadow sm:text-5xl">Certificate</h2>
        <p className="self-start text-left text-sm font-semibold uppercase tracking-[0.2em] text-white sm:text-base">of completion</p>
        <div className="mt-12 w-full sm:mt-16"><p className="font-serif text-sm uppercase tracking-[0.24em] text-[#80502F]">Shram Bazaar Learn</p><p className="mt-5 font-serif text-2xl italic text-[#806E57] sm:text-4xl">{resolvedName}</p><div className="mx-auto mt-2 h-px max-w-xl bg-[#8B7658]" /><p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#35261D] sm:text-lg">is awarded this certificate for successfully completing</p><h3 className="mt-2 font-serif text-xl font-bold text-[#35261D] sm:text-3xl">{resolvedTitle}</h3><p className="mt-3 text-sm text-[#5B4032] sm:text-base">{getLessonsLabel(course)} of {getLessonsLabel(course)} lessons completed · {dateLabel}</p></div>
        <div className="mt-auto flex w-full items-end justify-between gap-5 pt-12 text-left text-xs text-[#5B4032] sm:px-8 sm:text-sm"><div className="border-t border-[#8B7658] pt-2">Shram Bazaar Learning<br />Course Completion</div><div className="rounded-full border-4 border-double border-[#B58A49] px-3 py-2 text-center font-serif font-bold text-[#80502F] sm:px-5 sm:py-4">SHRAM<br />BAZAAR<br /><span className="text-[10px]">CERTIFIED</span></div><div className="border-t border-[#8B7658] pt-2 text-right">{dateLabel}<br />Certificate ID: {certificateId}</div></div>
        <p className="mt-5 max-w-xl text-[10px] leading-relaxed text-[#6F6252]">This certificate recognizes completion of introductory online learning. It is not a trade license or professional qualification.</p>
      </div>
    </div>}
    <div className="mt-4 flex flex-wrap justify-center gap-2.5 print:hidden">
      <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-[#4E342E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3B2722]">Download / Print PDF</button>
      <button type="button" onClick={share} className="min-h-11 rounded-lg border border-[#D7BFA4] px-5 py-2.5 text-sm font-semibold text-[#4E342E] hover:bg-[#F7F0E8]">Share achievement</button>
      <button type="button" onClick={onReview} className="min-h-11 rounded-lg border border-[#D7BFA4] px-5 py-2.5 text-sm font-semibold text-[#4E342E] hover:bg-[#F7F0E8]">Review course</button>
    </div>
  </section>
}

function getLessonsLabel(course: LearnCourse) { return course.modules.reduce((count, module) => count + module.lessons.length, 0) }
