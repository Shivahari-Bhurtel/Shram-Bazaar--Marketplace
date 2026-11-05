import { useEffect, useRef, useState, type FormEvent } from "react"
import { useApp, type Page } from "../store/AppContext"
import { sendChatMessage, sendResumeAnalysis } from "../services/shramAi"
import { useLanguage } from "../i18n/LanguageContext"
import ShramaAIMark from "../components/ShramaAIMark"
import { useDismissOnOutside } from "../hooks/useDismissOnOutside"
import ConfirmDialog from "../components/ConfirmDialog"

const MAX_RESUME_BYTES = 10 * 1024 * 1024
const RESUME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

type MessageAttachment = { name: string extension: string size: number }

type Message = {
  id: string
  role: "assistant" | "user"
  text: string
  time: string
  attachment?: MessageAttachment
}

type Thread = {
  id: string
  title: string
  messages: Message[]
  conversationId?: string
  updatedAt: number
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const suggestions = [
  {
    title: "Find work that fits me",
    detail: "Explore jobs that match my skills",
    prompt: "Help me find work that fits my skills and preferences.",
  },
  {
    title: "Improve my profile",
    detail: "Get tips to stand out to employers",
    prompt: "Review my worker profile and suggest ways to improve it.",
  },
  {
    title: "Understand applications",
    detail: "Learn what happens after I apply",
    prompt:
      "Explain how job applications work and what to expect after I apply.",
  },
  {
    title: "Hiring on Shrama",
    detail: "Get help posting and managing a job",
    prompt: "Help me understand hiring and job posting on Shram Bazzar.",
  },
]

const CHAT_STORAGE_KEY = "shrama-ai-threads"

function loadThreads(userId: string | undefined): Thread[] {
  if (!userId) return []
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_KEY}:${userId}`)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((thread): thread is Thread =>
        Boolean(
          thread &&
            typeof thread.id === "string" &&
            typeof thread.title === "string" &&
            Array.isArray(thread.messages) &&
            typeof thread.updatedAt === "number",
        ),
      )
      .map((thread) => ({
        ...thread,
        title: thread.title === "New chat" ? "Untitled chat" : thread.title,
      }))
  } catch {
    return []
  }
}

function getThreadGroup(timestamp: number) {
  const date = new Date(timestamp)
  const today = new Date()
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const threadDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()
  if (threadDay >= startOfToday) return "Today"
  if (threadDay >= startOfToday - 29 * 86400000) return "Previous 30 Days"
  return "Older"
}

function formatTime() {
  return new Intl.DateTimeFormat("en-NP", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function makeWelcome(name: string, language: "en" | "ne"): Message {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    text:
      language === "ne"
        ? `${
            name ? `${name}, ` : ""
          }नमस्ते। काम, आवेदन र भर्नाबारे म सहयोग गर्छु। के जान्न चाहनुहुन्छ?`
        : `Hello${
            name ? `, ${name}` : ""
          }. I can help you navigate jobs, applications, and hiring on Shram Bazzar. What would you like to work on?`,
    time: formatTime(),
  }
}

function renderInlineText(text: string) {
  return text
    .split(
      /(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g,
    )
    .map((part, index) => {
      const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
      if (link)
        return (
          <a
            key={index}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#5630A8] underline decoration-[#B7A4E9] underline-offset-2 hover:text-[#40227F]"
          >
            {link[1]}
          </a>
        )
      if (part.startsWith("***") && part.endsWith("***")) {
        return (
          <strong key={index} className="font-semibold text-[#342747]">
            <em>{part.slice(3, -3)}</em>
          </strong>
        )
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-[#342747]">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-[#39344C]">
            {part.slice(1, -1)}
          </em>
        )
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded-md bg-[#F1EDFF] px-1.5 py-0.5 font-mono text-[0.9em] text-[#39344C]"
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
}

function splitMarkdownBlocks(text: string) {
  const blocks: string[] = []
  let current: string[] = []
  let inCodeFence = false
  for (const line of text.split("\n")) {
    if (line.trim().startsWith("```")) {
      if (!inCodeFence && current.length) {
        blocks.push(current.join("\n").trim())
        current = []
      }
      current.push(line)
      if (inCodeFence) {
        blocks.push(current.join("\n").trim())
        current = []
      }
      inCodeFence = !inCodeFence
      continue
    }
    if (!line.trim() && !inCodeFence) {
      if (current.length) blocks.push(current.join("\n").trim())
      current = []
      continue
    }
    current.push(line)
  }
  if (current.length) blocks.push(current.join("\n").trim())
  return blocks.filter(Boolean)
}

function AssistantResponse({ text }: { text: string }) {
  const blocks = splitMarkdownBlocks(text)

  return (
    <div className="max-w-[72ch] space-y-5 text-[15px] leading-[1.75] tracking-normal text-[#39344C] sm:text-base">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "")
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl bg-[#211B42] p-4 text-sm leading-relaxed text-[#F8F7FB]"
            >
              <code>{code}</code>
            </pre>
          )
        }
        if (
          lines.length > 1 &&
          lines[0].includes("|") &&
          /^\|?\s*:?-{3,}/.test(lines[1])
        ) {
          const cells = (line: string) =>
            line
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((cell) => cell.trim())
          const headers = cells(lines[0])
          return (
            <div
              key={index}
              className="overflow-x-auto rounded-xl border border-[#E5E2EC]"
            >
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[#F8F7FB] text-[#211B42]">
                  <tr>
                    {headers.map((cell, cellIndex) => (
                      <th
                        key={cellIndex}
                        className="border-b border-[#E5E2EC] px-3 py-2.5 font-semibold"
                      >
                        {renderInlineText(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(2).map((line, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-[#FAF9FC]">
                      {cells(line).map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border-b border-[#F0EDF5] px-3 py-2.5 last:border-b-0"
                        >
                          {renderInlineText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-2 pl-5 marker:text-[#7658D6]">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="pl-1">
                  {renderInlineText(line.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          )
        }
        if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
          return (
            <ol
              key={index}
              className="list-decimal space-y-2 pl-5 marker:font-medium marker:text-[#7658D6]"
            >
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="pl-1">
                  {renderInlineText(line.replace(/^\d+[.)]\s+/, ""))}
                </li>
              ))}
            </ol>
          )
        }
        if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) {
          return (
            <h3
              key={index}
              className="pt-1 text-xl font-semibold leading-snug tracking-tight text-[#211B42]"
            >
              {renderInlineText(lines[0].replace(/^#{1,6}\s+/, ""))}
            </h3>
          )
        }
        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInlineText(line)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export default function Chat() {
  const { state, navigate } = useApp()
  const { language } = useLanguage()
  const firstName = state.currentUser?.name.split(" ")[0] || ""
  const goBack = () => {
    let destination: Page = "worker-dashboard"
    try {
      const previousPage = sessionStorage.getItem("ai-chat-return-page") as Page | null
      const allowedPages: Page[] = ["worker-dashboard", "worker-profile", "job-discovery", "my-applications", "saved-jobs"]
      if (previousPage && allowedPages.includes(previousPage)) destination = previousPage
      sessionStorage.removeItem("ai-chat-return-page")
    } catch {
      /* Fall back to the worker dashboard when storage is unavailable. */
    }
    navigate(destination)
  }
  const initialThreadsRef = useRef<Thread[] | null>(null)
  if (!initialThreadsRef.current) {
    const savedThreads = loadThreads(state.currentUser?.id)
    initialThreadsRef.current = savedThreads.length
      ? savedThreads
      : [
          {
            id: "thread-start",
            title: "Untitled chat",
            messages: [makeWelcome(firstName, language)],
            updatedAt: Date.now(),
          },
        ]
  }
  const [draft, setDraft] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState(
    initialThreadsRef.current[0].id,
  )
  const [threads, setThreads] = useState<Thread[]>(initialThreadsRef.current)
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null)
  const [threadTitleDraft, setThreadTitleDraft] = useState("")
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({})
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState("")
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [processingResume, setProcessingResume] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState("")
  const idCounter = useRef(0)
  const sendingRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
  const isWelcomeState =
    activeThread?.messages.length === 1 &&
    activeThread.messages[0].id.startsWith("welcome-")
  const visibleThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt)
  const threadGroups = ["Today", "Previous 30 Days", "Older"]
    .map((label) => ({
      label,
      threads: visibleThreads.filter(
        (thread) => getThreadGroup(thread.updatedAt) === label,
      ),
    }))
    .filter((group) => group.threads.length > 0)

  useEffect(() => {
    if (!state.currentUser?.id) return
    try {
      localStorage.setItem(
        `${CHAT_STORAGE_KEY}:${state.currentUser.id}`,
        JSON.stringify(threads),
      )
    } catch {
      /* Keep the current session usable if storage is unavailable. */
    }
  }, [state.currentUser?.id, threads])

  useEffect(() => {
    if (activeThread?.messages.length && !isWelcomeState)
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
  }, [activeThread?.id, activeThread?.messages.length, sending, isWelcomeState])

  useEffect(() => () => speechRecognitionRef.current?.stop(), [])
  useDismissOnOutside(attachmentMenuOpen, [attachmentMenuRef], () =>
    setAttachmentMenuOpen(false),
  )

  useEffect(() => {
    setThreads((current) =>
      current.map((thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id.startsWith("welcome-")
            ? { ...message, text: makeWelcome(firstName, language).text }
            : message,
        ),
      })),
    )
  }, [firstName, language])

  const startNewChat = () => {
    const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setThreads((current) => [
      {
        id,
        title: "Untitled chat",
        messages: [makeWelcome(firstName, language)],
        updatedAt: Date.now(),
      },
      ...current,
    ])
    setActiveThreadId(id)
    setDraft("")
    setSelectedFile(null)
    setAttachmentError("")
    setAttachmentMenuOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setSidebarOpen(false)
  }

  const deleteThread = (threadId: string) => {
    const remaining = threads.filter((thread) => thread.id !== threadId)
    if (remaining.length === 0) {
      const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setThreads([
        {
          id,
          title: "Untitled chat",
          messages: [makeWelcome(firstName, language)],
          updatedAt: Date.now(),
        },
      ])
      setActiveThreadId(id)
      setPendingDeleteId(null)
      return
    }
    setThreads(remaining)
    if (activeThreadId === threadId) setActiveThreadId(remaining[0].id)
    setPendingDeleteId(null)
  }

  const beginRename = (thread: Thread) => {
    setRenamingThreadId(thread.id)
    setThreadTitleDraft(thread.title)
  }

  const saveRename = (event: FormEvent) => {
    event.preventDefault()
    const title = threadTitleDraft.trim()
    if (renamingThreadId && title)
      setThreads((current) =>
        current.map((thread) =>
          thread.id === renamingThreadId ? { ...thread, title } : thread,
        ),
      )
    setRenamingThreadId(null)
  }

  const sendMessage = async (event?: FormEvent, textOverride?: string) => {
    event?.preventDefault()
    if (sendingRef.current) return
    const text = (textOverride ?? draft).trim()
    const resumeFile = textOverride === undefined ? selectedFile : null
    if ((!text && !resumeFile) || !activeThread) return
    const displayText = text || (resumeFile ? "Please analyze my resume." : "")

    const userMessage: Message = {
      id: `message-${++idCounter.current}`,
      role: "user",
      text: displayText,
      time: formatTime(),
      attachment: resumeFile
        ? {
            name: resumeFile.name,
            extension:
              resumeFile.name.split(".").pop()?.toUpperCase() || "FILE",
            size: resumeFile.size,
          }
        : undefined,
    }
    const priorHistory = activeThread.messages
      .filter((message) => !message.id.startsWith("welcome-"))
      .map(({ role, text }) => ({ role, text }))
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              updatedAt: Date.now(),
              title:
                thread.messages.length === 1
                  ? (text || resumeFile?.name || "Resume analysis").slice(
                      0,
                      36,
                    ) +
                    ((text || resumeFile?.name || "").length > 36 ? "…" : "")
                  : thread.title,
              messages: [...thread.messages, userMessage],
            }
          : thread,
      ),
    )
    setDraft("")
    setError("")
    setAttachmentError("")
    setAttachmentMenuOpen(false)
    sendingRef.current = true
    setSending(true)
    setProcessingResume(!!resumeFile)
    const controller = new AbortController()
    requestControllerRef.current = controller
    try {
      const result = resumeFile
        ? await sendResumeAnalysis(
            resumeFile,
            text,
            activeThread.conversationId ?? null,
            priorHistory.slice(-20),
            language,
            controller.signal,
          )
        : await sendChatMessage(
            text,
            activeThread.conversationId ?? null,
            [...priorHistory.slice(-19), { role: "user", text }],
            language,
            controller.signal,
          )
      const assistantMessage: Message = {
        id: `message-${++idCounter.current}`,
        role: "assistant",
        text: result.answer,
        time: formatTime(),
      }
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThread.id
            ? {
                ...thread,
                conversationId: result.conversation_id,
                updatedAt: Date.now(),
                messages: [...thread.messages, assistantMessage],
              }
            : thread,
        ),
      )
      if (resumeFile) {
        setSelectedFile((current) => (current === resumeFile ? null : current))
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch (requestError) {
      if (
        !(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reach the chat service.",
        )
      }
    } finally {
      if (requestControllerRef.current === controller)
        requestControllerRef.current = null
      sendingRef.current = false
      setSending(false)
      setProcessingResume(false)
    }
  }

  const stopGeneration = () => requestControllerRef.current?.abort()

  const regenerateLastResponse = async () => {
    if (sendingRef.current || !activeThread) return
    const assistantIndex = activeThread.messages.length - 1
    const assistantMessage = activeThread.messages[assistantIndex]
    if (!assistantMessage || assistantMessage.role !== "assistant") return
    let userIndex = -1
    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      if (activeThread.messages[index].role === "user") {
        userIndex = index
        break
      }
    }
    if (userIndex < 0 || activeThread.messages[userIndex].attachment) return
    const userMessage = activeThread.messages[userIndex]
    const history = activeThread.messages
      .slice(0, userIndex)
      .filter((message) => !message.id.startsWith("welcome-"))
      .map(({ role, text }) => ({ role, text }))
    const controller = new AbortController()
    requestControllerRef.current = controller
    sendingRef.current = true
    setSending(true)
    setError("")
    try {
      const result = await sendChatMessage(
        userMessage.text,
        activeThread.conversationId ?? null,
        history,
        language,
        controller.signal,
      )
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThread.id
            ? {
                ...thread,
                conversationId: result.conversation_id,
                updatedAt: Date.now(),
                messages: thread.messages.map((message, index) =>
                  index === assistantIndex
                    ? { ...message, text: result.answer, time: formatTime() }
                    : message,
                ),
              }
            : thread,
        ),
      )
    } catch (requestError) {
      if (
        !(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
      )
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reach the chat service.",
        )
    } finally {
      if (requestControllerRef.current === controller)
        requestControllerRef.current = null
      sendingRef.current = false
      setSending(false)
    }
  }

  const copyResponse = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopiedMessageId(message.id)
      window.setTimeout(
        () =>
          setCopiedMessageId((current) =>
            current === message.id ? null : current,
          ),
        1600,
      )
    } catch {
      setError(
        "Could not copy this response. Please select and copy it manually.",
      )
    }
  }

  const toggleFeedback = (messageId: string, value: "up" | "down") => {
    setFeedback((current) => {
      const next = { ...current }
      if (next[messageId] === value) delete next[messageId]
      else next[messageId] = value
      return next
    })
  }

  const sendSuggestion = (suggestion: typeof suggestions[number]) => {
    void sendMessage(undefined, suggestion.prompt)
  }

  const handleFileSelection = (file?: File) => {
    setAttachmentMenuOpen(false)
    setAttachmentError("")
    if (!file) return
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!(extension in RESUME_TYPES)) {
      setAttachmentError("Choose a PDF, DOC, or DOCX resume.")
      return
    }
    if (file.type !== RESUME_TYPES[extension]) {
      setAttachmentError(
        "The file type does not match its extension. Please choose a valid PDF or DOCX.",
      )
      return
    }
    if (!file.size || file.size > MAX_RESUME_BYTES) {
      setAttachmentError(
        file.size
          ? "Resume files must be 10 MB or smaller."
          : "The selected file is empty.",
      )
      return
    }
    setSelectedFile(file)
  }

  const toggleVoiceInput = () => {
    setVoiceError("")
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.stop()
      return
    }
    const speechWindow = window as SpeechWindow
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceError("Voice input is not supported in this browser.")
      return
    }
    const recognition = new Recognition()
    recognition.lang = language === "ne" ? "ne-NP" : "en-US"
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript =
        event.results[event.resultIndex]?.[0]?.transcript?.trim()
      if (transcript)
        setDraft((current) =>
          current ? `${current} ${transcript}` : transcript,
        )
    }
    recognition.onerror = () => {
      setIsListening(false)
      setVoiceError(
        "Could not access voice input. Check microphone permissions and try again.",
      )
    }
    recognition.onend = () => setIsListening(false)
    speechRecognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
      setVoiceError("Voice input could not start. Please try again.")
    }
  }

  return (
    <div className="relative flex h-dvh min-h-0 overflow-hidden bg-white text-[#211B42]">
      {sidebarOpen && (
        <button
          aria-label="Close conversation sidebar"
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-30 bg-stone-950/30 md:hidden"
        />
      )}

      <aside
        className={`${
          sidebarOpen
            ? "absolute inset-y-0 left-0 z-40 flex w-[min(20rem,88vw)] ai-drawer-mobile-enter"
            : "hidden"
        } ai-drawer-enter ai-conversation-sidebar shrink-0 flex-col border-r border-[#E5E2EC] bg-[#F8F7FB] md:relative md:flex md:w-72`}
      >
        <div className="flex h-10 items-center justify-end px-3 pt-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-[#625D73] hover:bg-[#E8E0FA] hover:text-[#5630A8]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-start gap-4 px-3 pb-7 pt-8">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#49445A] transition hover:bg-[#F1EDFF] hover:text-[#5630A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7655CE]"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="m15 18-6-6 6-6" /><path d="M9 12h11" />
            </svg>
            Back
          </button>
          <button
            onClick={startNewChat}
            className="flex w-fit items-center gap-3 rounded-2xl bg-[#6542B5] px-5 py-4 text-left text-xl font-bold text-white shadow-sm transition-colors hover:bg-[#5630A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5630A8]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          {threadGroups.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[#777287]">
              Your conversations will appear here.
            </p>
          ) : (
            <div className="space-y-5">
              {threadGroups.map((group) => (
                <section key={group.label}>
                  <h3 className="mb-3 px-2 text-lg font-bold tracking-tight text-[#625D73]">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={`group flex min-w-0 items-center rounded-r-lg border-l-2 transition-colors ${
                          activeThreadId === thread.id
                            ? "border-[#7655CE] bg-transparent"
                            : "border-transparent hover:bg-white"
                        }`}
                      >
                        {renamingThreadId === thread.id ? (
                          <form
                            onSubmit={saveRename}
                            className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1.5"
                          >
                            <input
                              autoFocus
                              value={threadTitleDraft}
                              onChange={(event) =>
                                setThreadTitleDraft(event.target.value)
                              }
                              aria-label="Conversation name"
                              className="min-w-0 flex-1 rounded-md border border-[#D7CDEE] bg-white px-2 py-1.5 text-xl text-[#211B42] outline-none focus:border-[#7655CE]"
                            />
                            <button
                              type="submit"
                              aria-label="Save conversation name"
                              className="rounded-md p-1.5 text-[#5630A8] hover:bg-[#E8E0FA]"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m5 12 4 4L19 6"
                                />
                              </svg>
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setActiveThreadId(thread.id)
                                setSidebarOpen(false)
                              }}
                              className={`flex min-w-0 flex-1 items-center px-3 py-3 text-left text-xl ${
                                activeThreadId === thread.id
                                  ? "font-bold text-[#5630A8]"
                                  : "font-semibold text-[#49445A] hover:text-[#211B42]"
                              }`}
                            >
                              <span className="truncate">{thread.title}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => beginRename(thread)}
                              aria-label={`Rename chat: ${thread.title}`}
                              title="Rename chat"
                              className="mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#89849A] opacity-100 transition-opacity hover:bg-[#E8E0FA] hover:text-[#5630A8] focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              >
                                <path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(thread.id)}
                              aria-label={`Delete chat: ${thread.title}`}
                              title="Delete chat"
                              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#89849A] opacity-100 transition-opacity hover:bg-red-50 hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col border-l border-[#E5E7EB] bg-white">
        <header className="flex h-12 shrink-0 items-center border-b border-[#E5E7EB] px-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open conversation sidebar"
            aria-expanded={sidebarOpen}
            className="rounded-lg p-2 text-[#625D73] hover:bg-[#F1EDFF] hover:text-[#5630A8]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-8 sm:py-8">
          {isWelcomeState ? (
            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center py-8 sm:py-10">
              <div className="mb-8 text-center sm:mb-10">
                <div
                  className="welcome-reveal mx-auto flex w-fit items-center justify-center gap-0"
                  style={{ animationDelay: "80ms" }}
                >
                  <img
                    src="/images/worker/ai-logo-trim.png"
                    alt="Shram"
                    className="h-14 w-11 object-contain"
                  />
                  <ShramaAIMark className="h-14 w-14" />
                </div>
                <h1
                  className="welcome-reveal mt-4 font-sans text-3xl font-semibold tracking-tight text-[#211B42] sm:text-4xl"
                  style={{ animationDelay: "620ms" }}
                >
                  Hello, {firstName || "there"}!
                </h1>
                <p
                  className="welcome-reveal mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#625D73] sm:text-base"
                  style={{ animationDelay: "1.15s" }}
                >
                  I’m Shram AI, your assistant for jobs, applications, and
                  platform guidance.
                </p>
              </div>
              <div className="mb-3 text-center sm:mb-4">
                <h3
                  className="welcome-reveal text-base font-medium leading-snug text-[#211B42]"
                  style={{ animationDelay: "1.4s" }}
                >
                  What would you like help with today?
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.title}
                    onClick={() => sendSuggestion(suggestion)}
                    disabled={sending}
                    className="welcome-intro-card group rounded-2xl border border-[#E5E2EC] bg-white p-5 text-left shadow-sm transition-colors hover:border-[#CBBCEB] hover:bg-[#FAF9FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7655CE] disabled:cursor-wait disabled:opacity-60 sm:p-6"
                    style={{ animationDelay: `${1.7 + index * 0.16}s` }}
                  >
                    <span className="block text-base font-medium leading-snug text-[#211B42] group-hover:text-[#5630A8]">
                      {suggestion.title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-[#625D73]">
                      {suggestion.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              {activeThread?.messages.map((message, messageIndex) => (
                <div
                  key={message.id}
                  className={`flex gap-3.5 sm:gap-4 ${
                    message.role === "user" ? "justify-end" : "items-start"
                  }`}
                >
                  <div
                    className={`${
                      message.role === "user"
                        ? "max-w-[88%] rounded-2xl border border-[#E5DDF7] bg-[#F1EDFF] px-4 py-3 sm:max-w-[82%] sm:px-5"
                        : "min-w-0 flex-1 pt-0.5"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <AssistantResponse text={message.text} />
                    ) : (
                      <p className="whitespace-pre-wrap text-base leading-7 text-[#302A45]">
                        {message.text}
                      </p>
                    )}
                    {message.attachment && (
                      <div className="mt-3 flex max-w-full items-center gap-2.5 rounded-xl border border-primary-100 bg-white/80 px-3 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[9px] font-bold tracking-wide text-primary-ink">
                          {message.attachment.extension}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-[#342747]">
                            {message.attachment.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[#8B829C]">
                            Resume · {formatFileSize(message.attachment.size)}
                          </span>
                        </span>
                      </div>
                    )}
                    <p
                      className={`mt-2.5 text-xs font-normal text-[#8B829C] ${
                        message.role === "user" ? "text-right" : ""
                      }`}
                    >
                      {message.time}
                    </p>
                    {message.role === "assistant" &&
                      !message.id.startsWith("welcome-") && (
                        <div className="mt-3 flex items-center gap-1 border-t border-[#F0EDF5] pt-2.5 text-[#777287]">
                          <button
                            type="button"
                            onClick={() => void copyResponse(message)}
                            aria-label="Copy response"
                            title={
                              copiedMessageId === message.id
                                ? "Copied"
                                : "Copy response"
                            }
                            className="rounded-lg p-2 transition-colors hover:bg-[#F1EDFF] hover:text-[#5630A8]"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <rect x="8" y="8" width="12" height="12" rx="2" />
                              <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                            </svg>
                          </button>
                          {copiedMessageId === message.id && (
                            <span className="text-xs text-[#5630A8]">
                              Copied
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFeedback(message.id, "up")}
                            aria-label="Helpful response"
                            aria-pressed={feedback[message.id] === "up"}
                            title="Helpful"
                            className={`rounded-lg p-2 transition-colors hover:bg-[#F1EDFF] hover:text-[#5630A8] ${
                              feedback[message.id] === "up"
                                ? "text-[#5630A8]"
                                : ""
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 5-8c2.5 0 3 2 2 4l-1 4h6a2 2 0 0 1 2 2l-1.5 7a2 2 0 0 1-2 2H7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFeedback(message.id, "down")}
                            aria-label="Unhelpful response"
                            aria-pressed={feedback[message.id] === "down"}
                            title="Not helpful"
                            className={`rounded-lg p-2 transition-colors hover:bg-[#F1EDFF] hover:text-[#5630A8] ${
                              feedback[message.id] === "down"
                                ? "text-[#5630A8]"
                                : ""
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3Zm0 0 5 8c2.5 0 3-2 2-4l-1-4h6a2 2 0 0 0 2-2l-1.5-7a2 2 0 0 0-2-2H7" />
                            </svg>
                          </button>
                          {messageIndex ===
                            activeThread.messages.length - 1 && (
                            <button
                              type="button"
                              onClick={() => void regenerateLastResponse()}
                              disabled={sending}
                              className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors hover:bg-[#F1EDFF] hover:text-[#5630A8] disabled:opacity-50"
                              title="Regenerate response"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path d="M20 7v5h-5M4 17v-5h5" />
                                <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
                              </svg>
                              Regenerate
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
              {sending && (
                <div
                  role="status"
                  className="flex items-center gap-3 text-sm text-[#625D73]"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#7655CE]" />
                  {processingResume
                    ? "Reading and analyzing your resume…"
                    : "Shram AI is thinking…"}
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#5630A8] hover:bg-[#F1EDFF]"
                  >
                    Stop
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-3 pb-9 pt-2 sm:px-6 sm:pb-11">
          <div className="mx-auto max-w-3xl">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-[10px] font-bold text-primary-ink">
                  {selectedFile.name.split(".").pop()?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#342747]">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-[#8B829C]">
                    {selectedFile.name.split(".").pop()?.toUpperCase()} resume ·{" "}
                    {formatFileSize(selectedFile.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  disabled={sending}
                  aria-label={`Remove ${selectedFile.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B829C] hover:bg-[#F2EDFF] hover:text-[#514760] disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            )}
            {(attachmentError || error) && (
              <div
                role="alert"
                className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {attachmentError || error}
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentError("")
                    setError("")
                  }}
                  className="ml-2 font-semibold underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {voiceError && (
              <div role="alert" className="mb-2 text-sm text-red-700">
                {voiceError}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              aria-label="Choose a PDF, DOC, or DOCX resume"
              onChange={(event) => {
                handleFileSelection(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <form
              onSubmit={sendMessage}
              className="chat-composer-enter chat-composer-glow flex items-end gap-2 rounded-3xl border border-[#E5E2EC] bg-white px-3 py-2 shadow-sm transition-all focus-within:border-[#7655CE] focus-within:ring-2 focus-within:ring-[#7655CE]/15 focus-within:shadow-[0_4px_18px_rgba(86,48,168,0.1)] sm:px-4"
            >
              <div ref={attachmentMenuRef} className="relative mb-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Add an attachment"
                  aria-haspopup="menu"
                  aria-expanded={attachmentMenuOpen}
                  disabled={sending}
                  onClick={() => setAttachmentMenuOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setAttachmentMenuOpen(false)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#777287] transition-colors hover:bg-[#F1EDFF] hover:text-[#5630A8] disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                {attachmentMenuOpen && (
                  <div
                    role="menu"
                    className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-xl border border-[#E5E2EC] bg-white p-1.5 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAttachmentMenuOpen(false)
                        fileInputRef.current?.click()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#49445A] hover:bg-[#F8F7FB]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4 text-[#5630A8]"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"
                        />
                      </svg>
                      Upload from device
                    </button>
                    <p className="px-3 pb-1 pt-0.5 text-[10px] text-[#8C879B]">
                      PDF, DOC, or DOCX · max 10 MB
                    </p>
                  </div>
                )}
              </div>
              <label htmlFor="chat-message" className="sr-only">
                Message Shram AI
              </label>
              <textarea
                id="chat-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                rows={1}
                placeholder="Message Shram AI..."
                disabled={sending}
                className="max-h-36 min-h-12 flex-1 resize-none border-0 bg-transparent px-1 py-3 font-sans text-[15px] leading-relaxed text-[#39344C] outline-none placeholder:text-[#8C879B] sm:text-base"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={sending}
                aria-label={
                  isListening ? "Stop voice input" : "Start voice input"
                }
                aria-pressed={isListening}
                title={isListening ? "Stop voice input" : "Voice input"}
                className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7655CE] disabled:opacity-50 ${
                  isListening
                    ? "bg-red-50 text-red-700"
                    : "text-[#777287] hover:bg-[#F1EDFF] hover:text-[#5630A8]"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={(!draft.trim() && !selectedFile) || sending}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5630A8] text-white transition-colors hover:bg-[#48268F] disabled:cursor-not-allowed disabled:bg-[#E8E5ED] disabled:text-[#9994A5]"
                aria-label="Send message"
                title="Send message"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19V5m-7 7 7-7 7 7"
                  />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#8B829C]">
              Shram AI can make mistakes. Verify important info.
            </p>
          </div>
        </div>
      </section>
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this conversation?"
          message="This conversation will be removed from your chat history."
          confirmLabel="Delete chat"
          danger
          onConfirm={() => deleteThread(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
