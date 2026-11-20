import type { CourseLesson, LearnCourse, LearningProgress } from "../../data/courses"
import { getCourseLessons, getCourseProgress } from "../../data/courses"
import CourseProgress from "./CourseProgress"
import ModuleAccordion from "./ModuleAccordion"

type Props = {
  course: LearnCourse
  lesson: CourseLesson
  progress: LearningProgress
  onSelectLesson: (lessonId: string) => void
  onMarkComplete: () => void
  onPrevious: () => void
  onNext: () => void
}

export default function LearningPlayer({ course, lesson, progress, onSelectLesson, onMarkComplete, onPrevious, onNext }: Props) {
  const lessons = getCourseLessons(course)
  const metric = getCourseProgress(course, progress)
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id)
  const isComplete = progress.completedLessons[course.id]?.includes(lesson.id) || false

  return (
    <section>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h1 className="sr-only">{course.title}: {lesson.title}</h1>
          <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
            {lesson.videoId ? <iframe key={lesson.videoId} title={lesson.title} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.videoId)}`} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-6 text-center text-white"><img src={course.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" /><span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10"><svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.9l9.1 6.2a1.1 1.1 0 0 1 0 1.8l-9.1 6.2c-.7.4-1.6-.1-1.6-.9V5.8Z" /></svg></span><p className="relative mt-4 text-sm font-semibold">Video lesson</p><p className="relative mt-1 max-w-md text-xs leading-relaxed text-white/75">The lesson video will appear here when its YouTube video ID is added to the course JSON.</p></div>}
          </div>
          {lesson.youtubeUrl && <div className="flex justify-end border-b border-slate-100 px-3 py-1.5"><a href={lesson.youtubeUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-blue-700 hover:text-blue-900">If playback is unavailable, open this video on YouTube</a></div>}
          <div className="p-3 sm:p-4">
            <div className="border-t border-slate-100 pt-3"><CourseProgress completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} compact /></div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" disabled={lessonIndex === 0} onClick={onPrevious} className="min-h-9 min-w-0 rounded-lg border border-slate-300 px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-xs"><span className="sm:hidden">Previous</span><span className="hidden sm:inline">Previous lesson</span></button>
              <button type="button" onClick={onMarkComplete} aria-label={isComplete ? "Lesson completed" : "Mark as completed"} className={`min-h-9 min-w-0 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${isComplete ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-blue-700 text-white hover:bg-blue-800"}`}><span className="sm:hidden">{isComplete ? "Completed ✓" : "Complete"}</span><span className="hidden sm:inline">{isComplete ? "Lesson completed ✓" : "Mark as completed"}</span></button>
              <button type="button" disabled={lessonIndex === lessons.length - 1} onClick={onNext} className="min-h-9 min-w-0 rounded-lg bg-slate-900 px-1.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-xs">Next lesson</button>
            </div>
            {metric.isComplete && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">You completed this course. Your completion record is available in My certificates.</p>}
          </div>
        </article>
        <aside className="h-fit overflow-hidden rounded-xl border border-slate-200 bg-white xl:sticky xl:top-24">
          <div className="border-b border-slate-200 p-3"><h2 className="text-sm font-bold text-slate-900">Course content</h2><p className="mt-1 text-[11px] text-slate-500">{metric.completedCount} of {metric.totalLessons} lessons complete · {metric.percent}%</p><div className="mt-2"><CourseProgress completed={metric.completedCount} total={metric.totalLessons} percent={metric.percent} compact /></div></div>
          <div className="max-h-[65vh] overflow-y-auto p-1.5"><ModuleAccordion modules={course.modules} courseId={course.id} progress={progress} currentLessonId={lesson.id} onSelectLesson={onSelectLesson} compact /></div>
        </aside>
      </div>
    </section>
  )
}
