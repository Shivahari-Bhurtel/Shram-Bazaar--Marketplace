import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import CourseCard from "../../components/learn/CourseCard"
import CertificateCard from "../../components/learn/CertificateCard"
import CourseCertificate from "../../components/learn/CourseCertificate"
import CourseDetails from "../../components/learn/CourseDetails"
import LearningPlayer from "../../components/learn/LearningPlayer"
import GraduationHatAnimation from "../../components/learn/GraduationHatAnimation"
import ShramGamePlayer from "../../components/academy/ShramGamePlayer"
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
  createCertificateId,
  loadLearningProgress,
  markLessonComplete,
  saveLearningProgress,
  setCurrentLesson,
} from "../../services/learnProgress"

type LearnSection = "overview" | "my-learning" | "certificates"
type LearningFilter = "all" | "in-progress" | "completed"
type LearnView = "dashboard" | "details" | "player" | "game" | "certificate"

const sectionLabels: Record<LearnSection, string> = {
  overview: "Overview",
  "my-learning": "My learning",
  certificates: "Certificates",
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

function LearnSidebarItem({ label, icon, active = false, onClick }: { label: string; icon: "home" | "journey" | "library" | "content" | "tech" | "certificate" | "help"; active?: boolean; onClick?: () => void }) {
  const iconPaths: Record<typeof icon, React.ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" fill="currentColor" />,
    journey: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" fill="currentColor" />,
    library: <path d="M5 3h12a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V5a2 2 0 0 1 1-2Zm3 0v7l3-2 3 2V3M4 7H2v11a3 3 0 0 0 3 3" fill="currentColor" />,
    content: <><path d="M9 5h12M9 12h12M9 19h12" stroke="currentColor" strokeWidth="2" /><circle cx="4" cy="5" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="4" cy="19" r="1.5" fill="currentColor" /></>,
    tech: <path d="M8 4H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 15v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
    certificate: <><path d="M3 4h18v14H3z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M7 8h10M7 12h7m-7 3h4" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="15" r="1" fill="currentColor" /></>,
    help: <><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="M9.7 9a2.4 2.4 0 1 1 4 1.8c-1.1.8-1.7 1.2-1.7 2.7m0 3v.1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" /></>,
  }

  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`flex min-h-14 w-full items-center gap-3 border-l-4 px-4 text-left text-[15px] leading-snug transition-colors ${active ? "border-[#4E342E] bg-[#4E342E] font-medium text-white" : "border-transparent text-[#4E342E] hover:bg-[#F2E4D4]"}`}>
      <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 ${active ? "text-white" : "text-[#5B4032]"}`} aria-hidden="true">{iconPaths[icon]}</svg>
      <span>{label}</span>
    </button>
  )
}

function LearnSidebarHeading({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pb-2 pt-6 text-base font-bold text-[#735B49]">{children}</p>
}

function LearnCourseIcon({ courseId, active }: { courseId: string; active: boolean }) {
  void courseId
  return <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-white text-[#4E342E]" : "bg-[#F6EBDD] text-[#805B3D] group-hover:bg-white"}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]"><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 2.7 8.5 2.7 12 0v-5M22 9v6" /></svg></span>
}

function LearnSidebarCourse({ courseId, title, active, onClick }: { courseId: string; title: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`group flex w-full items-center gap-2.5 border-l-4 py-2 pl-8 pr-3 text-left font-['Source_Sans_3',Inter,sans-serif] text-[15px] leading-[1.3] tracking-[-0.01em] transition-colors ${active ? "border-[#4E342E] bg-[#F2E4D4] font-bold text-[#4E342E]" : "border-transparent font-semibold text-[#543D2E] hover:bg-[#F2E4D4]"}`}>
      <LearnCourseIcon courseId={courseId} active={active} />
      <span className={`min-w-0 flex-1 font-['Source_Sans_3','Inter',sans-serif] text-[16px] font-semibold leading-[1.35] tracking-[-0.01em] underline decoration-1 underline-offset-4 ${active ? "decoration-[#8A5B37]" : "decoration-[#C9A989] group-hover:decoration-[#6F4930]"}`}>{title}</span>
    </button>
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
  const [section, setSection] = useState<LearnSection>(() => {
    try {
      const initialSection = sessionStorage.getItem("learn-initial-section")
      sessionStorage.removeItem("learn-initial-section")
      if (initialSection === "certificates" || initialSection === "my-learning") return initialSection
    } catch { /* Start at the Learn overview if session storage is unavailable. */ }
    return "overview"
  })
  const [learningFilter, setLearningFilter] = useState<LearningFilter>("all")
  const [activeCategory, setActiveCategory] = useState<string>("All skills")
  const [search, setSearch] = useState("")
  const [view, setView] = useState<LearnView>("dashboard")
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [storageWarning, setStorageWarning] = useState("")
  const [completionCelebration, setCompletionCelebration] = useState(false)

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
  const earnedCourses = learningCourses.filter((course) => course.certificateEligible !== false && getCourseProgress(course, progress).isComplete)
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

  const openCourseGame = (course: LearnCourse) => {
    if (!course.optionalGame) return
    setActiveCourseId(course.id)
    setView("game")
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const backToCourseOverview = () => {
    setView("details")
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: "auto" })
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
    const wasComplete = getCourseProgress(activeCourse, progress).isComplete
    const next = markLessonComplete(progress, activeCourse, activeLesson.id)
    const newlyCompleted = !wasComplete && activeCourse.certificateEligible !== false && getCourseProgress(activeCourse, next).isComplete
    if (newlyCompleted && !next.certificates[activeCourse.id]) {
      const completedAt = next.completedAt[activeCourse.id] || new Date().toISOString()
      next.certificates = { ...next.certificates, [activeCourse.id]: {
        courseId: activeCourse.id,
        courseName: activeCourse.title,
        learnerName,
        certificateId: createCertificateId(activeCourse.id, learnerId, completedAt),
        completedAt,
        templateId: activeCourse.id,
      } }
    }
    persist(next)
    if (newlyCompleted) {
      setCompletionCelebration(true)
      window.setTimeout(() => {
        setCompletionCelebration(false)
        setSection("certificates")
        setView("certificate")
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 1600)
    }
  }

  const openCertificate = (course: LearnCourse) => {
    if (course.certificateEligible === false || !getCourseProgress(course, progress).isComplete) {
      openCourse(course)
      setStorageWarning("Complete every lesson in this course before opening its certificate.")
      return
    }
    if (!progress.certificates[course.id]) {
      const completedAt = progress.completedAt[course.id] || new Date().toISOString()
      const next = { ...progress, completedAt: { ...progress.completedAt, [course.id]: completedAt }, certificates: { ...progress.certificates, [course.id]: {
        courseId: course.id,
        courseName: course.title,
        learnerName,
        certificateId: createCertificateId(course.id, learnerId, completedAt),
        completedAt,
        templateId: course.id,
      } } }
      persist(next)
    }
    setActiveCourseId(course.id)
    setView("certificate")
    window.scrollTo({ top: 0, behavior: "smooth" })
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

  const goToCourseCategory = (category: string) => {
    setSection("overview")
    setSearch("")
    setActiveCategory(category)
    window.requestAnimationFrame(() => document.getElementById("explore-courses")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const learnerInitials = learnerName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  return (
    <div className={`learn-portal text-slate-900 ${view === "game" ? "h-dvh overflow-hidden bg-[#FAF8F5]" : "min-h-screen bg-[#FAF8F5]"}`}>
      {view !== "game" && <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1480px] items-center justify-between gap-4 pl-2 pr-4 sm:gap-6 sm:pl-2 sm:pr-6 lg:pl-2 lg:pr-8">
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => navigate("worker-dashboard")} className="ml-4 inline-flex min-h-10 shrink-0 items-baseline gap-0.5 whitespace-nowrap transition-opacity hover:opacity-80 sm:ml-5" aria-label="Go to Shram Bazaar worker page" title="Go to worker page">
              <span className="text-[1.45rem] font-semibold leading-none text-[#553421]" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>श्रम</span>
              <span className="font-script text-[1.45rem] font-semibold leading-none text-[#261C14]">Bazaar</span>
            </button>
          </div>

          {view === "dashboard" ? (
            <label className="relative mx-auto hidden w-full max-w-2xl flex-1 md:block">
              <span className="sr-only">Search courses</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and courses" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </label>
          ) : (
            <div className="hidden min-w-0 flex-1 md:block"><p className={`truncate ${view === "player" && activeCourse?.id === "crane-operation-basics" ? "font-script text-xl font-semibold leading-tight text-blue-700" : view === "details" ? "text-base font-semibold text-blue-700" : "text-sm font-semibold text-slate-800"}`}>{activeCourse?.title}</p><p style={view === "details" ? { fontFamily: "'Dancing Script', cursive" } : undefined} className={`truncate ${view === "details" ? "font-script text-lg leading-tight text-[#4E342E]" : "text-xs text-slate-500"}`}>{view === "player" ? activeLesson?.title : "Course overview"}</p></div>
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {view !== "dashboard" && <button type="button" onClick={() => view === "player" ? setView("details") : setView("dashboard")} className="hidden min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
              {view === "player" ? "Course overview" : "All courses"}
            </button>}
            {state.workerProfile?.photo ? <img src={state.workerProfile.photo} alt={`${learnerName} profile`} className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4E342E] text-base font-bold text-white" aria-label={learnerName}>{learnerInitials || "L"}</span>}
          </div>
        </div>
        {view === "dashboard" && <div className="px-4 pb-3 md:hidden"><label className="relative block"><span className="sr-only">Search courses</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and courses" className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label></div>}
      </header>}

      {storageWarning && view !== "game" && <div role="status" className="mx-auto mt-4 max-w-[1480px] px-4 sm:px-6 lg:px-8"><p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageWarning}</p></div>}

      <div className={`mx-auto grid ${view === "game" ? "h-full w-full max-w-none grid-cols-1" : `max-w-[1480px] ${view === "dashboard" ? "lg:grid-cols-[minmax(190px,19%)_minmax(0,1fr)]" : "grid-cols-1"}`}`}>
        {view === "dashboard" && <aside aria-label="Main navigation" className="sticky top-16 hidden h-[calc(100vh-4rem)] self-start overflow-y-auto border-r border-[#D7BFA4] bg-[#E9D6BC] pb-8 pt-2 lg:block">
          <nav>
            <LearnSidebarItem label="Home" icon="home" active onClick={() => navigate("worker-dashboard")} />
            <LearnSidebarItem label="My Career Journey" icon="journey" onClick={() => setSection("my-learning")} />

            <LearnSidebarHeading>Learn</LearnSidebarHeading>
            <LearnSidebarItem label="My Library" icon="library" onClick={() => setSection("overview")} />
            <LearnSidebarItem label="Content" icon="content" onClick={goToExplore} />

            <LearnSidebarItem label="Certifications" icon="certificate" onClick={() => setSection("certificates")} />

            <div className="flex items-center gap-2.5 px-5 pb-2 pt-6 text-base font-bold text-[#735B49]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 2.7 8.5 2.7 12 0v-5M22 9v6" /></svg>
              <span>Our courses</span>
            </div>
            <div className="space-y-1">
              {learningCourses.map((course) => <LearnSidebarCourse key={course.id} courseId={course.id} title={course.title} active={activeCategory === course.category} onClick={() => goToCourseCategory(course.category)} />)}
            </div>
          </nav>
        </aside>}

        <main className={view === "game" ? "h-full min-w-0 p-0" : `min-w-0 px-4 py-6 sm:px-6 sm:py-7 lg:px-6 lg:py-4 ${view === "player" ? "xl:px-10" : ""}`}>
          {view === "dashboard" && <div className="mb-5 lg:hidden">
            <button type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} className="mb-3 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-slate-700"><span className="text-blue-700">☰</span> Learning menu</button>
            {mobileNavOpen && <SectionNav section={section} onChange={(next) => { setSection(next); setMobileNavOpen(false) }} />}
          </div>}

          {view === "dashboard" && section === "overview" && <>
            <div className="mb-5 flex min-h-[168px] items-center justify-between gap-4 overflow-hidden rounded-2xl bg-[#4E342E] px-5 py-6 text-white shadow-sm sm:min-h-[192px] sm:px-8">
              <div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-white">Build skills. Boost your profile.</h1><p className="mt-2 max-w-2xl text-base leading-relaxed text-[#F3E8DE]">Take a short course today, {learnerName.split(" ")[0]}, and make your profile stronger.</p></div>
              <GraduationHatAnimation />
            </div>

            <section className="mt-2" aria-labelledby="continue-learning-heading">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 id="continue-learning-heading" className="text-lg font-bold text-[#4E342E]">Continue learning</h2></div>{inProgressCourses.length > 0 && <button type="button" onClick={() => setSection("my-learning")} className="text-sm font-semibold text-[#80502F] underline decoration-[#C9A989] underline-offset-4 hover:text-[#4E342E]">View my learning</button>}</div>
              {inProgressCourses.length ? <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">{inProgressCourses.slice(0, 2).map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled highlighted onView={openCourse} onContinue={startLesson} />
              })}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-blue-100" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" className="h-16 w-16 text-blue-700"><path d="M8 10.5c6.5-2 13-.5 16 2v25c-3-2.5-9.5-4-16-2v-25Zm32 0c-6.5-2-13-.5-16 2v25c3-2.5 9.5-4 16-2v-25Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /><path d="M14 18c2-.3 4.3 0 6 1m14-1c-2-.3-4.3 0-6 1M14 24c2-.3 4.3 0 6 1m14-1c-2-.3-4.3 0-6 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
                <div className="flex flex-1 flex-col p-4 sm:p-5"><h3 className="text-lg font-semibold leading-snug text-slate-900">Your learning journey starts here</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Choose a practical course to build your first skill and track lessons as you go.</p></div>
              </article></div>}
            </section>

            <section className="mt-8" aria-labelledby="recommended-heading">
              <div className="mb-4"><h2 id="recommended-heading" className="text-lg font-bold text-[#4E342E]">Recommended courses</h2><p className="mt-1 text-xs text-[#735B49]">{state.workerProfile?.skills?.length ? "Recommendations use the skills on your worker profile." : "Explore a hands-on skill that interests you."}</p></div>
              <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">{recommendedCourses.map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled={progress.enrolledCourseIds.includes(course.id)} onView={openCourse} onContinue={startLesson} />
              })}</div>
            </section>

            <section id="explore-courses" className="mt-10 scroll-mt-24" aria-labelledby="explore-heading">
              <div className="mb-4"><h2 id="explore-heading" className="text-lg font-bold text-[#4E342E]">Explore courses</h2><p className="mt-1 text-xs text-[#735B49]">Short, self-paced introductions across five vocational skill areas.</p></div>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter courses by skill category">
                {["All skills", ...learningCategories].map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition ${activeCategory === category ? "border-[#4E342E] bg-[#4E342E] text-white" : "border-[#D7BFA4] bg-white text-[#5B4032] hover:border-[#A47C5A] hover:bg-[#F7F0E8] hover:text-[#4E342E]"}`}>{category}</button>)}
              </div>
              {filteredCourses.length ? <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredCourses.map((course) => {
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
              return courses.length ? <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => {
                const metric = getCourseProgress(course, progress)
                return <CourseCard key={course.id} course={course} completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} enrolled onView={openCourse} onContinue={startLesson} />
              })}</div> : <EmptyState title={normalizedSearch ? "No matching courses" : learningFilter === "completed" ? "No completed courses yet" : learningFilter === "in-progress" ? "Nothing in progress" : "No courses enrolled yet"} description={normalizedSearch ? "Try a different course or skill search." : learningFilter === "completed" ? "Finish every lesson in a course to see it here." : "Start a course when you are ready. Your enrolled courses and lesson progress will be saved on this device."} actionLabel={normalizedSearch ? "Clear search" : "Explore courses"} onAction={normalizedSearch ? () => setSearch("") : () => { setSection("overview"); goToExplore() }} />
            })()}
          </section>}

          {view === "dashboard" && section === "certificates" && <section>
            <div className="mb-6"><div className="flex items-center gap-3"><svg viewBox="0 0 48 48" fill="none" className="h-10 w-10 shrink-0 text-[#A8753F]" aria-hidden="true"><path d="M13 6c-5 0-8 4-8 9 0 7 8 12 12 17 4-5 12-10 12-17 0-5-3-9-8-9-2 0-4 2-4 4-1-2-2-4-4-4Z" fill="currentColor" opacity=".88"/><path d="M17 32c1 4 0 7-2 10m18-33c-4 0-6 3-6 7 0 5 6 9 9 12 3-3 8-7 8-12 0-4-2-7-6-7-2 0-3 1-3 3 0-2-1-3-2-3Z" fill="currentColor" opacity=".62"/><path d="M14 42h5m15-3 2 5m-24-26-4 1m23-8 3-3" stroke="#80502F" strokeWidth="1.8" strokeLinecap="round"/></svg><p className="font-['Dancing_Script',cursive] text-2xl font-bold leading-tight text-[#80502F] sm:text-3xl">Your achievements</p></div><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">My certificates</h1></div>
            {earnedCourses.filter(matchesCourseSearch).length ? <div className="space-y-3">{earnedCourses.filter(matchesCourseSearch).map((course) => <CertificateCard key={course.id} course={course} learnerName={learnerName} learnerId={learnerId} completedAt={progress.completedAt[course.id] || ""} record={progress.certificates[course.id]} onView={() => openCertificate(course)} />)}</div> : <EmptyState title={normalizedSearch ? "No matching certificates" : "Your certificates will appear here"} description={normalizedSearch ? "Try a different course or skill search." : "Complete all lessons in a course to earn a course completion record. You can save it from this page."} actionLabel={normalizedSearch ? "Clear search" : "Continue learning"} onAction={normalizedSearch ? () => setSearch("") : () => { setSection("my-learning"); setLearningFilter("in-progress") }} />}
          </section>}

          {view === "certificate" && activeCourse && getCourseProgress(activeCourse, progress).isComplete && activeCourse.certificateEligible !== false && <CourseCertificate
            course={activeCourse}
            learnerName={learnerName}
            learnerId={learnerId}
            completedAt={progress.completedAt[activeCourse.id] || ""}
            record={progress.certificates[activeCourse.id]}
            onReview={() => startLesson(activeCourse)}
          />}

          {view === "details" && activeCourse && <CourseDetails
            course={activeCourse}
            progress={progress}
            isEnrolled={progress.enrolledCourseIds.includes(activeCourse.id)}
            onStart={() => startLesson(activeCourse)}
            onSelectLesson={(lessonId) => startLesson(activeCourse, lessonId)}
            onPlayGame={() => openCourseGame(activeCourse)}
          />}

          {view === "game" && activeCourse?.optionalGame && <ShramGamePlayer
            gameId={activeCourse.optionalGame.id}
            title={activeCourse.optionalGame.title}
            courseName={activeCourse.title}
            embedUrl="/games/crane-sim/index.html"
            onBack={backToCourseOverview}
          />}

          {view === "player" && activeCourse && activeLesson && <LearningPlayer
            course={activeCourse}
            lesson={activeLesson}
            progress={progress}
            onSelectLesson={selectLesson}
            onMarkComplete={markCurrentLessonComplete}
            onPrevious={() => changeLessonBy(-1)}
            onNext={() => changeLessonBy(1)}
          />}
        </main>
      </div>
      {completionCelebration && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#261C14]/65 p-5" role="status" aria-live="assertive"><div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#D7BFA4] bg-[#FFFCF7] p-8 text-center shadow-2xl"><div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <span key={index} className="completion-confetti absolute h-2 w-1.5 rounded-sm" style={{ left: `${(index * 41) % 100}%`, animationDelay: `${(index % 7) * 70}ms`, backgroundColor: ["#B58A49", "#80502F", "#D7BFA4", "#4E342E"][index % 4] }} />)}</div><span className="completion-success relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F3E9DF] text-3xl font-bold text-[#80502F]">✓</span><h2 className="relative mt-4 text-2xl font-bold text-[#35261D]">Congratulations!</h2><p className="relative mt-2 text-lg font-semibold text-[#4E342E]">You’ve completed {activeCourse?.title}.</p><p className="relative mt-2 text-sm leading-relaxed text-[#735B49]">You’ve taken another step toward building valuable skills and creating new opportunities for yourself.</p></div></div>}
    </div>
  )
}
