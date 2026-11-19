import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { cleaningAssessment, householdCleaningCourse } from "../../data/householdCleaningCourse"

type LearningProgress = { completed: string[]; lastLesson: string; assessmentScore?: number }
const STORAGE_KEY = "shram-bazar-cleaning-learning-v1"

function loadProgress(workerId: string): LearningProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${workerId}`) || "{}") as Partial<LearningProgress>
    return {
      completed: Array.isArray(saved.completed) ? saved.completed.filter((id): id is string => typeof id === "string") : [],
      lastLesson: typeof saved.lastLesson === "string" ? saved.lastLesson : householdCleaningCourse.lessons[0].id,
      assessmentScore: typeof saved.assessmentScore === "number" ? saved.assessmentScore : undefined,
    }
  } catch {
    return { completed: [], lastLesson: householdCleaningCourse.lessons[0].id }
  }
}

export default function Learn() {
  const { state, updateWorkerProfile, notifyProfileUpdated, browseSkill } = useApp()
  const worker = state.workerProfile
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress(worker?.id || "demo-worker"))
  const [selectedId, setSelectedId] = useState(progress.lastLesson)
  const [view, setView] = useState<"course" | "lesson" | "assessment">("course")
  const [answers, setAnswers] = useState<number[]>(Array(cleaningAssessment.length).fill(-1))
  const [videoUnavailable, setVideoUnavailable] = useState(false)
  const [submittedScore, setSubmittedScore] = useState<number | null>(null)

  useEffect(() => {
    setProgress(loadProgress(worker?.id || "demo-worker"))
  }, [worker?.id])

  const lesson = householdCleaningCourse.lessons.find((item) => item.id === selectedId) || householdCleaningCourse.lessons[0]
  const completed = useMemo(() => new Set(progress.completed), [progress.completed])
  const percent = Math.round((completed.size / householdCleaningCourse.lessons.length) * 100)
  const passed = (progress.assessmentScore ?? submittedScore ?? 0) >= 4

  const save = (next: LearningProgress) => {
    setProgress(next)
    try { localStorage.setItem(`${STORAGE_KEY}:${worker?.id || "demo-worker"}`, JSON.stringify(next)) } catch { /* Progress remains available for this visit. */ }
  }
  const openLesson = (id: string) => {
    setSelectedId(id)
    setVideoUnavailable(false)
    save({ ...progress, lastLesson: id })
    setView("lesson")
  }
  const markComplete = () => {
    const nextCompleted = [...new Set([...progress.completed, lesson.id])]
    save({ ...progress, completed: nextCompleted, lastLesson: lesson.id })
  }
  const goToLesson = (index: number) => openLesson(householdCleaningCourse.lessons[index].id)

  if (!worker) return null
  const selectedIndex = householdCleaningCourse.lessons.findIndex((item) => item.id === lesson.id)

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <p className="text-sm font-semibold text-[#80502F]">Shram Bazar Learn</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900">My learning</h1>
          <p className="mt-2 text-sm text-stone-600">Build practical skills at your own pace{worker.name ? `, ${worker.name.split(" ")[0]}` : ""}.</p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#E7DED2] bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[1fr_1.4fr]">
            <div className="flex min-h-56 items-center justify-center bg-gradient-to-br from-[#5C3825] to-[#9B6944] p-8 text-white">
              <div className="max-w-xs">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Household Services</span>
                <div className="mt-7 text-5xl" aria-hidden="true">⌂</div>
                <p className="mt-2 text-sm text-white/80">Free learning resources · English</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-600"><span className="rounded-full bg-stone-100 px-3 py-1">Beginner</span><span className="rounded-full bg-stone-100 px-3 py-1">10 lessons</span><span className="rounded-full bg-stone-100 px-3 py-1">Household Cleaning</span></div>
              <h2 className="mt-4 text-2xl font-bold text-stone-900">{householdCleaningCourse.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{householdCleaningCourse.description}</p>
              <p className="mt-3 text-xs text-stone-500">Instructor: {householdCleaningCourse.instructor}</p>
              <div className="mt-5">
                <div className="flex justify-between text-sm"><span className="font-semibold text-stone-800">Your progress</span><span className="text-stone-600">{completed.size} of 10 · {percent}%</span></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#80502F] transition-all" style={{ width: `${percent}%` }} /></div>
              </div>
              <button type="button" onClick={() => openLesson(progress.lastLesson)} className="mt-5 rounded-xl bg-[#80502F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#653D25]">{completed.size ? "Continue learning" : "Start learning"}</button>
            </div>
          </div>
        </section>

        {view === "course" && <>
        {progress.assessmentScore !== undefined && <section className={`mt-6 rounded-2xl border p-5 ${passed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><h2 className="font-bold text-stone-900">Assessment result: {progress.assessmentScore}/5 · {passed ? "Passed" : "Try again when ready"}</h2>{passed && <><p className="mt-1 text-sm font-semibold text-green-900">Shram Bazar learning completion badge</p><p className="text-xs text-green-800">Course completion recognition only; not an officially accredited professional qualification.</p><div className="mt-3 flex flex-wrap gap-2">{!worker.skills.some((skill) => skill.toLowerCase() === "household cleaning") && <button type="button" onClick={() => { updateWorkerProfile({ skills: [...worker.skills, "Household Cleaning"] }); notifyProfileUpdated("Household Cleaning was added to your skills.") }} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-green-900 shadow-sm">Add Household Cleaning to my skills</button>}<button type="button" onClick={() => browseSkill("cleaning")} className="rounded-lg border border-green-800 px-4 py-2.5 text-sm font-semibold text-green-900">Explore related jobs</button></div></>}</section>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold text-stone-900">Course introduction</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">A beginner-friendly course covering bedroom preparation, bathroom cleaning, kitchen hygiene, laundry and everyday housekeeping practices.</p>
            <h3 className="mt-5 text-sm font-bold text-stone-900">What you will learn</h3>
            <ul className="mt-2 space-y-2 text-sm text-stone-600">{householdCleaningCourse.objectives.map((objective) => <li key={objective} className="flex gap-2"><span className="text-[#80502F]">✓</span>{objective}</li>)}</ul>
            <button type="button" onClick={() => openLesson(progress.lastLesson)} className="mt-5 w-full rounded-xl bg-[#80502F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#653D25]">Continue learning</button>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-stone-900">Course lessons</h2><span className="text-sm text-stone-500">{completed.size}/10 complete</span></div>
            <ol className="mt-4 divide-y divide-stone-100">{householdCleaningCourse.lessons.map((item, index) => <li key={item.id}><button type="button" onClick={() => openLesson(item.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-stone-50"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completed.has(item.id) ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"}`}>{completed.has(item.id) ? "✓" : index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-800">{item.title}</span><span className="text-xs text-stone-500">{completed.has(item.id) ? "Completed" : "Video lesson"}</span></span><span aria-hidden="true" className="text-stone-400">›</span></button></li>)}</ol>
            {completed.size === 10 && <button type="button" onClick={() => { setAnswers(Array(cleaningAssessment.length).fill(-1)); setSubmittedScore(null); setView("assessment") }} className="mt-4 w-full rounded-xl border border-[#80502F] px-4 py-3 text-sm font-semibold text-[#80502F] hover:bg-[#FBF7F2]">Take final assessment</button>}
          </section>
        </div></>}

        {view === "lesson" && <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="relative aspect-video bg-stone-950">
              {!videoUnavailable ? <iframe key={lesson.videoId} title={lesson.title} src={`https://www.youtube-nocookie.com/embed/${lesson.videoId}`} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onError={() => setVideoUnavailable(true)} /> : <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><p className="font-semibold">This video cannot be embedded right now.</p><p className="mt-1 text-sm text-white/70">You can try watching it on YouTube.</p></div>}
            </div>
            <p className="bg-stone-50 px-4 py-2 text-xs text-stone-600">If playback is unavailable, use “Watch on YouTube” below. The lesson will not be marked complete until you choose the completion button.</p>
            <div className="p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#80502F]">Lesson {selectedIndex + 1} of 10</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900">{lesson.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{lesson.description}</p>
              <a href={`https://www.youtube.com/watch?v=${lesson.videoId}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#80502F] underline underline-offset-4">Watch on YouTube</a>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
                <button type="button" disabled={selectedIndex === 0} onClick={() => goToLesson(selectedIndex - 1)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40">Previous lesson</button>
                <button type="button" onClick={markComplete} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${completed.has(lesson.id) ? "bg-green-100 text-green-800" : "bg-[#80502F] text-white hover:bg-[#653D25]"}`}>{completed.has(lesson.id) ? "Lesson completed ✓" : "Mark as completed"}</button>
                <button type="button" disabled={selectedIndex === 9} onClick={() => goToLesson(selectedIndex + 1)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40">Next lesson</button>
              </div>
              <button type="button" onClick={() => setView("course")} className="mt-4 text-sm font-semibold text-stone-500 hover:text-stone-800">Back to course</button>
            </div>
          </div>
          <aside className="rounded-2xl border border-stone-200 bg-white p-4">
            <h3 className="px-2 text-sm font-bold text-stone-900">Lessons <span className="font-normal text-stone-500">· {completed.size}/10</span></h3>
            <ol className="mt-2">{householdCleaningCourse.lessons.map((item, index) => <li key={item.id}><button type="button" aria-current={item.id === lesson.id ? "step" : undefined} onClick={() => openLesson(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left ${item.id === lesson.id ? "bg-[#F7F1EB]" : "hover:bg-stone-50"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completed.has(item.id) ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"}`}>{completed.has(item.id) ? "✓" : index + 1}</span><span className={`text-sm ${item.id === lesson.id ? "font-semibold text-[#653D25]" : "text-stone-700"}`}>{item.title}</span></button></li>)}</ol>
          </aside>
        </section>}

        {view === "assessment" && <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <button type="button" onClick={() => setView("course")} className="text-sm font-semibold text-[#80502F]">← Course overview</button>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">Final assessment</h2>
          <p className="mt-1 text-sm text-stone-600">Answer five questions. You need at least 4 correct answers to pass.</p>
          <div className="mt-5 space-y-5">{cleaningAssessment.map((question, questionIndex) => <fieldset key={question.question} className="rounded-xl border border-stone-200 p-4"><legend className="px-1 text-sm font-semibold text-stone-900">{questionIndex + 1}. {question.question}</legend><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm text-stone-700 hover:bg-stone-50"><input type="radio" name={`q-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} className="mt-0.5 accent-[#80502F]" />{option}</label>)}</div></fieldset>)}</div>
          {submittedScore === null ? <button type="button" disabled={answers.some((answer) => answer < 0)} onClick={() => { const score = cleaningAssessment.reduce((total, item, index) => total + (answers[index] === item.answer ? 1 : 0), 0); setSubmittedScore(score); save({ ...progress, assessmentScore: score }) }} className="mt-6 rounded-xl bg-[#80502F] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit assessment</button> : <div className={`mt-6 rounded-xl p-5 ${submittedScore >= 4 ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"}`}><h3 className="text-lg font-bold">Score: {submittedScore}/5 · {submittedScore >= 4 ? "Passed" : "Not passed yet"}</h3><p className="mt-1 text-sm">Correct answers: {submittedScore} of 5.</p>{submittedScore >= 4 ? <><p className="mt-3 font-semibold">Shram Bazar learning completion badge</p><p className="text-xs">This recognizes course completion and is not an officially accredited professional qualification.</p>{!worker.skills.some((skill) => skill.toLowerCase() === "household cleaning") && <button type="button" onClick={() => { updateWorkerProfile({ skills: [...worker.skills, "Household Cleaning"] }); notifyProfileUpdated("Household Cleaning was added to your skills.") }} className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-green-900 shadow-sm">Add Household Cleaning to my skills</button>}<button type="button" onClick={() => browseSkill("cleaning")} className="ml-0 mt-3 block rounded-lg border border-green-800 px-4 py-2.5 text-sm font-semibold text-green-900 sm:ml-2 sm:inline-block">Explore related jobs</button></> : <button type="button" onClick={() => { setSubmittedScore(null); setAnswers(Array(cleaningAssessment.length).fill(-1)) }} className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-amber-950">Try again</button>}</div>}
        </section>}
      </div>
    </div>
  )
}
