import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import CourseCard from "../../components/learn/CourseCard"
import CertificateCard from "../../components/learn/CertificateCard"
import CourseDetails from "../../components/learn/CourseDetails"
import LearningPlayer from "../../components/learn/LearningPlayer"
import {
  getCourseLessons,
  getCourseProgress,
  learningCategories,
  learningCourses,
  type LearnCourse,
  type LearningProgress,
} from "../../data/courses"
import {
  enrollInCourse,
  loadLearningProgress,
  markLessonComplete,
  saveLearningProgress,
  setCurrentLesson,
} from "../../services/learnProgress"

type LearnSection = "overview" | "my-learning" | "certificates"
type LearningFilter = "all" | "in-progress" | "completed"
type LearnView = "dashboard" | "details" | "player"

const sectionLabels: Record<LearnSection, string> = {
  overview: "Overview",
  "my-learning": "My learning",
  certificates: "Certificates",
}

function MetricCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: string }) {
  return (
    <article className="rounded-xl border border-[#E5D9C9] bg-white p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2D8C9] text-[#D86C3A]" aria-hidden="true">
          {icon === "book" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M4 5.5c3-.9 5.8-.4 8 1.2v13c-2.2-1.6-5-2.1-8-1.2v-13Zm16 0c-3-.9-5.8-.4-8 1.2v13c2.2-1.6 5-2.1 8-1.2v-13Z" /></svg>
            : icon === "play" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m9 6 10 6-10 6V6Z" /></svg>
              : icon === "check" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m5 12 4.5 4.5L19 7" /><circle cx="12" cy="12" r="9" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M6 3.75h8l4 4v12.5H6z" /><path d="M14 3.75v4h4M9 12h6M9 15h4" /></svg>}
        </span>
      </div>
    </article>
  )
}

function SectionNav({ section, onChange }: { section: LearnSection; onChange: (section: LearnSection) => void }) {
  return (
    <nav aria-label="Learn navigation" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 lg:flex-col lg:border-0 lg:bg-transparent lg:p-0">
      {(Object.keys(sectionLabels) as LearnSection[]).map((item) => (
        <button key={item} type="button" onClick={() => onChange(item)} aria-current={section === item ? "page" : undefined} className={`min-h-8 shrink-0 rounded-lg px-2 text-left text-xs font-medium transition lg:w-full ${section === item ? item === "overview" ? "bg-[#4E342E] text-white" : "bg-[#FDF0E9] text-[#D86C3A]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:bg-transparent"}`}>
          {sectionLabels[item]}
        </button>
      ))}
    </nav>
  )
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FDF0E9] text-[#D86C3A]" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6"><path d="M4 5.5c3-.9 5.8-.4 8 1.2v13c-2.2-1.6-5-2.1-8-1.2v-13Zm16 0c-3-.9-5.8-.4-8 1.2v13c2.2-1.6 5-2.1 8-1.2v-13Z" /></svg>
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{description}</p>
      {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">{actionLabel}</button>}
    </div>
  )
}

export default function Learn() {
  const { state, navigate } = useApp()
  const learnerName = state.workerProfile?.name || state.currentUser?.name || "Learner"
  const learnerId = state.workerProfile?.id || state.currentUser?.id || "learning-demo"
  const [progress, setProgress] = useState<LearningProgress>(() => loadLearningProgress(learnerId))
  const [section, setSection] = useState<LearnSection>("overview")
  const [learningFilter, setLearningFilter] = useState<LearningFilter>("all")
  const [activeCategory, setActiveCategory] = useState<string>("All skills")
  const [search, setSearch] = useState("")
  const [view, setView] = useState<LearnView>("dashboard")
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [storageWarning, setStorageWarning] = useState("")

  useEffect(() => {
    setProgress(loadLearningProgress(learnerId))
  }, [learnerId])

  const activeCourse = learningCourses.find((course) => course.id === activeCourseId) || null
  const activeLessons = activeCourse ? getCourseLessons(activeCourse) : []
  const activeLesson = activeLessons.find((lesson) => lesson.id === activeLessonId) || null
  const enrolledCourses = useMemo(
    () => learningCourses.filter((course) => progress.enrolledCourseIds.includes(course.id)),
    [progress.enrolledCourseIds],
  )
  const inProgressCourses = enrolledCourses.filter((course) => !getCourseProgress(course, progress).isComplete)
  const completedCourses = enrolledCourses.filter((course) => getCourseProgress(course, progress).isComplete)
  const earnedCourses = learningCourses.filter((course) => getCourseProgress(course, progress).isComplete)
  const normalizedSearch = search.trim().toLowerCase()
  const matchesCourseSearch = (course: LearnCourse) => !normalizedSearch || [course.title, course.category, course.shortDescription, ...course.skills]
    .join(" ").toLowerCase().includes(normalizedSearch)
  const filteredCourses = learningCourses.filter((course) => {
    const matchesCategory = activeCategory === "All skills" || course.category === activeCategory
    return matchesCategory && matchesCourseSearch(course)
  })
  const recommendedCourses = [...learningCourses].sort((left, right) => {
    const workerSkills = (state.workerProfile?.skills || []).map((skill) => skill.toLowerCase())
    const score = (course: LearnCourse) => course.skills.reduce((total, skill) => total + (workerSkills.some((item) => item.includes(skill.toLowerCase()) || skill.toLowerCase().includes(item)) ? 1 : 0), 0)
    return score(right) - score(left)
  }).slice(0, 3)

  const persist = (next: LearningProgress) => {
    setProgress(next)
    setStorageWarning(saveLearningProgress(learnerId, next) ? "" : "Your browser could not save learning progress. It will remain available until you leave this page.")
  }

  const openCourse = (course: LearnCourse) => {
    setActiveCourseId(course.id)
    setView("details")
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startLesson = (course: LearnCourse, requestedLessonId?: string) => {
    const nextProgress = enrollInCourse(progress, course)
    const lessons = getCourseLessons(course)
    const savedLessonId = nextProgress.currentLessons[course.id]
    const lessonId = lessons.some((lesson) => lesson.id === requestedLessonId)
      ? requestedLessonId!
      : lessons.some((lesson) => lesson.id === savedLessonId)
        ? savedLessonId
        : lessons[0]?.id
    if (!lessonId) return
    persist(setCurrentLesson(nextProgress, course, lessonId))
    setActiveCourseId(course.id)
    setActiveLessonId(lessonId)
    setView("player")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const selectLesson = (lessonId: string) => {
    if (!activeCourse) return
    persist(setCurrentLesson(progress, activeCourse, lessonId))
    setActiveLessonId(lessonId)
    setView("player")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const markCurrentLessonComplete = () => {
    if (!activeCourse || !activeLesson) return
    persist(markLessonComplete(progress, activeCourse, activeLesson.id))
  }

  const changeLessonBy = (offset: number) => {
    if (!activeLesson) return
    const nextIndex = activeLessons.findIndex((lesson) => lesson.id === activeLesson.id) + offset
    const nextLesson = activeLessons[nextIndex]
    if (nextLesson) selectLesson(nextLesson.id)
  }

  const goToExplore = () => {
    setSection("overview")
    setSearch("")
    setActiveCategory("All skills")
    window.requestAnimationFrame(() => document.getElementById("explore-courses")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const learnerInitials = learnerName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[52px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("worker-dashboard")} className="flex shrink-0 items-center gap-2 text-left" aria-label="Return to Shram Bazaar dashboard">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4E342E] text-xs font-bold text-white">S</span>
            <span className="hidden leading-tight sm:block"><span className="block text-xs font-bold text-slate-900">Shram Bazaar</span><span className="block text-[10px] font-medium text-slate-600">Learn</span></span>
          </button>

          {view === "dashboard" ? (
            <label className="relative hidden w-full max-w-md md:block">
              <span className="sr-only">Search courses</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and courses" className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </label>
          ) : (
            <div className="hidden min-w-0 flex-1 md:block"><p className="truncate text-sm font-semibold text-slate-800">{view === "player" ? activeLesson?.title : activeCourse?.title}</p><p className="text-xs text-slate-500">{view === "player" ? activeCourse?.title : "Course overview"}</p></div>
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {view !== "dashboard" && <button type="button" onClick={() => view === "player" ? setView("details") : setView("dashboard")} className="hidden min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
              {view === "player" ? "Course overview" : "All courses"}
            </button>}
            <button type="button" onClick={() => navigate("worker-dashboard")} className="inline-flex min-h-8 items-center gap-2 rounded-md border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 sm:px-3 sm:text-xs">
              Back to Shram Bazaar
            </button>
            {state.workerProfile?.photo ? <img src={state.workerProfile.photo} alt={`${learnerName} profile`} className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4E342E] text-[10px] font-bold text-white" aria-label={learnerName}>{learnerInitials || "L"}</span>}
          </div>
        </div>
        {view === "dashboard" && <div className="px-4 pb-3 md:hidden"><label className="relative block"><span className="sr-only">Search courses</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and courses" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label></div>}
      </header>

      {storageWarning && <div role="status" className="mx-auto mt-4 max-w-[1480px] px-4 sm:px-6 lg:px-8"><p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageWarning}</p></div>}

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[156px_minmax(0,1fr)]">
        {view === "dashboard" && <aside className="hidden border-r border-[#E3CCAE] bg-[#E9D6BC] px-2.5 py-5 lg:block">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#6A5542]">Learning space</p>
          <SectionNav section={section} onChange={setSection} />
          <div className="mt-8 rounded-xl border border-[#E5D9C9] bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#D86C3A]">Your next step</p>
            <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">Build a skill you can use at work.</p>
            <button type="button" onClick={goToExplore} className="mt-3 text-sm font-semibold text-[#D86C3A] hover:text-[#B8542A]">Explore courses <span aria-hidden="true">→</span></button>
          </div>
        </aside>}

        <main className={`min-w-0 px-4 py-6 sm:px-6 sm:py-7 lg:px-6 lg:py-4 ${view === "player" ? "xl:px-10" : ""}`}>
          {view === "dashboard" && <div className="mb-5 lg:hidden">
            <button type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} className="mb-3 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-slate-700"><span className="text-blue-700">☰</span> Learning menu</button>
            {mobileNavOpen && <SectionNav section={section} onChange={(next) => { setSection(next); setMobileNavOpen(false) }} />}
          </div>}

          {view === "dashboard" && section === "overview" && <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-semibold text-[#D86C3A]">Shram Bazaar Learn</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Good to see you, {learnerName.split(" ")[0]}</h1><p className="mt-1 max-w-2xl text-xs leading-4 text-slate-600">Build practical skills at your own pace. Choose a short course, learn a new technique and keep track of your progress.</p></div>
              <button type="button" onClick={goToExplore} className="min-h-8 rounded-md bg-[#4E342E] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3D2924]">Explore courses</button>
            </div>

            <section aria-label="Learning overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Enrolled courses" value={enrolledCourses.length} detail="Courses you have started" icon="book" />
              <MetricCard label="In progress" value={inProgressCourses.length} detail="Pick up where you left off" icon="play" />
              <MetricCard label="Completed" value={completedCourses.length} detail="Skills courses completed" icon="check" />
              <MetricCard label="Certificates" value={earnedCourses.length} detail="Course completion records" icon="certificate" />
            </section>

            <section className="mt-7" aria-labelledby="continue-learning-heading">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#D86C3A]">Pick up where you left off</p><h2 id="continue-learning-heading" className="mt-1 text-lg font-bold text-slate-900">Continue learning</h2></div>{inProgressCourses.length > 0 && <button type="button" onClick={() => setSection("my-learning")} className="text-sm font-semibold text-blue-700 hover:text-blue-900">View my learning</button>}</div>
              {inProgressCourses.length ? <div className="grid gap-4 md:grid-cols-2">{inProgressCourses.slice(0, 2).map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled onView={openCourse} onContinue={startLesson} />
              })}</div> : <div className="rounded-xl border border-[#E5D9C9] bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><h3 className="text-sm font-semibold text-slate-900">Your learning journey starts here</h3><p className="mt-1 text-xs text-slate-600">Choose a practical course to build your first skill and track lessons as you go.</p></div><button type="button" onClick={goToExplore} className="mt-4 min-h-9 shrink-0 rounded-lg border border-[#E5D9C9] px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-[#FAF8F5] sm:mt-0">Browse all five courses</button></div>}
            </section>

            <section className="mt-8" aria-labelledby="recommended-heading">
              <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#D86C3A]">Selected for your next step</p><h2 id="recommended-heading" className="mt-1 text-lg font-bold text-slate-900">Recommended courses</h2><p className="mt-1 text-xs text-slate-600">{state.workerProfile?.skills?.length ? "Recommendations use the skills on your worker profile." : "Explore a hands-on skill that interests you."}</p></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recommendedCourses.map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled={progress.enrolledCourseIds.includes(course.id)} onView={openCourse} onContinue={startLesson} />
              })}</div>
            </section>

            <section id="explore-courses" className="mt-10 scroll-mt-24" aria-labelledby="explore-heading">
              <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#D86C3A]">Practical skills for work</p><h2 id="explore-heading" className="mt-1 text-lg font-bold text-slate-900">Explore courses</h2><p className="mt-1 text-xs text-slate-600">Short, self-paced introductions across five vocational skill areas.</p></div>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter courses by skill category">
                {["All skills", ...learningCategories].map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition ${activeCategory === category ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-800"}`}>{category}</button>)}
              </div>
              {filteredCourses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredCourses.map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled={progress.enrolledCourseIds.includes(course.id)} onView={openCourse} onContinue={startLesson} />
              })}</div> : <EmptyState title="No matching courses" description="Try another search or choose a different skill category." actionLabel="Clear filters" onAction={() => { setSearch(""); setActiveCategory("All skills") }} />}
            </section>
          </>}

          {view === "dashboard" && section === "my-learning" && <section>
            <div className="mb-6"><p className="text-sm font-semibold text-[#D86C3A]">Your learning space</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">My learning</h1><p className="mt-2 text-sm text-slate-600">Keep track of courses you have started and finished.</p></div>
            <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter your courses">
              {(["all", "in-progress", "completed"] as LearningFilter[]).map((filter) => <button key={filter} type="button" role="tab" aria-selected={learningFilter === filter} onClick={() => setLearningFilter(filter)} className={`min-h-9 rounded-full px-4 text-sm font-semibold ${learningFilter === filter ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>{filter === "all" ? `All (${enrolledCourses.length})` : filter === "in-progress" ? `In progress (${inProgressCourses.length})` : `Completed (${completedCourses.length})`}</button>)}
            </div>
            {(() => {
              const sourceCourses = learningFilter === "all" ? enrolledCourses : learningFilter === "completed" ? completedCourses : inProgressCourses
              const courses = sourceCourses.filter(matchesCourseSearch)
              return courses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled onView={openCourse} onContinue={startLesson} />
              })}</div> : <EmptyState title={normalizedSearch ? "No matching courses" : learningFilter === "completed" ? "No completed courses yet" : learningFilter === "in-progress" ? "Nothing in progress" : "No courses enrolled yet"} description={normalizedSearch ? "Try a different course or skill search." : learningFilter === "completed" ? "Finish every lesson in a course to see it here." : "Start a course when you are ready. Your enrolled courses and lesson progress will be saved on this device."} actionLabel={normalizedSearch ? "Clear search" : "Explore courses"} onAction={normalizedSearch ? () => setSearch("") : () => { setSection("overview"); goToExplore() }} />
            })()}
          </section>}

          {view === "dashboard" && section === "certificates" && <section>
            <div className="mb-6"><p className="text-sm font-semibold text-[#D86C3A]">Your achievements</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">My certificates</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Completion records are created after you finish every lesson in a course. They recognize course completion and are not accredited professional qualifications.</p></div>
            {earnedCourses.filter(matchesCourseSearch).length ? <div className="space-y-3">{earnedCourses.filter(matchesCourseSearch).map((course) => <CertificateCard key={course.id} course={course} learnerName={learnerName} completedAt={progress.completedAt[course.id] || new Date().toISOString()} />)}</div> : <EmptyState title={normalizedSearch ? "No matching certificates" : "Your certificates will appear here"} description={normalizedSearch ? "Try a different course or skill search." : "Complete all lessons in a course to earn a course completion record. You can save it from this page."} actionLabel={normalizedSearch ? "Clear search" : "Continue learning"} onAction={normalizedSearch ? () => setSearch("") : () => { setSection("my-learning"); setLearningFilter("in-progress") }} />}
          </section>}

          {view === "details" && activeCourse && <CourseDetails
            course={activeCourse}
            progress={progress}
            isEnrolled={progress.enrolledCourseIds.includes(activeCourse.id)}
            onBack={() => setView("dashboard")}
            onStart={() => startLesson(activeCourse)}
            onSelectLesson={(lessonId) => startLesson(activeCourse, lessonId)}
          />}

          {view === "player" && activeCourse && activeLesson && <LearningPlayer
            course={activeCourse}
            lesson={activeLesson}
            progress={progress}
            onBackToCourse={() => setView("details")}
            onSelectLesson={selectLesson}
            onMarkComplete={markCurrentLessonComplete}
            onPrevious={() => changeLessonBy(-1)}
            onNext={() => changeLessonBy(1)}
          />}
        </main>
      </div>
    </div>
  )
}
