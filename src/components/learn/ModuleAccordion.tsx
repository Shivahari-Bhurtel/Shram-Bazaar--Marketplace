import { useEffect, useState } from "react"
import type { CourseModule, LearningProgress } from "../../data/courses"
import LessonItem from "./LessonItem"

type Props = {
  modules: CourseModule[]
  courseId: string
  progress: LearningProgress
  currentLessonId?: string
  onSelectLesson?: (lessonId: string) => void
  compact?: boolean
}

export default function ModuleAccordion({ modules, courseId, progress, currentLessonId, onSelectLesson, compact = false }: Props) {
  const [openModules, setOpenModules] = useState<string[]>(() => {
    const currentModule = modules.find((module) => module.lessons.some((lesson) => lesson.id === currentLessonId))
    return currentModule ? [currentModule.id] : modules[0] ? [modules[0].id] : []
  })
  const completedIds = new Set(progress.completedLessons[courseId] || [])

  useEffect(() => {
    const currentModule = modules.find((module) => module.lessons.some((lesson) => lesson.id === currentLessonId))
    if (currentModule) setOpenModules((open) => open.includes(currentModule.id) ? open : [...open, currentModule.id])
  }, [currentLessonId, modules])

  return (
    <div className={`divide-y divide-slate-200 overflow-hidden border border-slate-200 bg-white ${compact ? "rounded-xl" : "rounded-2xl"}`}>
      {modules.map((module, moduleIndex) => {
        const isOpen = openModules.includes(module.id)
        const completedCount = module.lessons.filter((lesson) => completedIds.has(lesson.id)).length
        return (
          <section key={module.id}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpenModules((open) => isOpen ? open.filter((id) => id !== module.id) : [...open, module.id])} className={`flex w-full items-start text-left hover:bg-slate-50 ${compact ? "gap-2 px-3 py-3" : "gap-3 px-4 py-4 sm:px-5"}`}>
              <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-600 ${compact ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"}`}>{moduleIndex + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className={`font-semibold text-slate-900 ${compact ? "text-xs" : ""}`}>{module.title}</span>
                  <span className={`${compact ? "text-[10px]" : "text-xs"} text-slate-500`}>{completedCount}/{module.lessons.length} complete</span>
                </span>
                <span className={`mt-1 block leading-relaxed text-slate-600 ${compact ? "text-[11px] leading-4" : "text-sm"}`}>{module.summary}</span>
              </span>
              <span className={`mt-1 text-slate-400 ${compact ? "text-xs" : "text-sm"}`} aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <ol className={`border-t border-slate-100 ${compact ? "space-y-0.5 px-1.5 py-1.5" : "space-y-1 px-2 py-2 sm:px-3"}`}>{module.lessons.map((lesson, lessonIndex) => (
              <li key={lesson.id}><LessonItem lesson={lesson} index={lessonIndex} completed={completedIds.has(lesson.id)} current={lesson.id === currentLessonId} onSelect={onSelectLesson} compact={compact} /></li>
            ))}</ol>}
          </section>
        )
      })}
    </div>
  )
}
