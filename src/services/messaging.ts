import demoMessageSeed from "../data/demo-messages.json"
import { apiRequest } from "./backendApi"

export type MessageItem = { id: string; senderId: string; senderName: string; senderRole?: string; content: string; createdAt: string; readAt?: string | null; messageType?: "USER" | "SYSTEM" }
export type ConversationItem = { id: string; workerId: string; workerName: string; workerPhoto?: string; providerId: string; providerName: string; jobId?: string | null; jobTitle?: string | null; applicationId?: string | null; status: string; createdAt: string; updatedAt: string; unreadCount: number; lastMessage?: MessageItem | null }
export type Thread = { conversation: ConversationItem; messages: MessageItem[] }
export type ConversationContext = { actorRole?: "worker" | "provider"; workerId?: string; workerName?: string; workerPhoto?: string; providerId?: string; providerName?: string; jobId?: string | null; jobTitle?: string | null }

type DemoConversation = ConversationItem & { messages: MessageItem[]; reads: Record<string, string[]> }
type DemoData = { conversations: DemoConversation[] }
type SeedConversation = Omit<DemoConversation, "unreadCount"> & { unreadCount?: number }
const DEMO_PROVIDER_ID = "demo-provider"
const DEMO_WORKER_ID = "demo-worker"
const DEMO_PROVIDER_NAME = "Himalayan Build Co."
const DEMO_WORKER_NAME = "Sita Tamang"
const DEMO_PROVIDER_STORAGE_KEY = "shram_bazaar_demo_provider_messages_v1"
const DEMO_MESSAGES_STORAGE_KEY = "shram-demo-messages-v1"
const seedConversations = demoMessageSeed.conversations as unknown as SeedConversation[]
const seededProvider = seedConversations[0]?.providerName || DEMO_PROVIDER_NAME

function isSeededProviderAccount(userId: string, userName: string, organizationName?: string) {
  const providerName = organizationName?.trim().toLowerCase()
  const accountName = userName.trim().toLowerCase()
  return userId === DEMO_PROVIDER_ID
    || providerName === seededProvider.trim().toLowerCase()
    || accountName === seededProvider.trim().toLowerCase()
    || accountName === "demo provider"
}

/** Use local seeded messaging for demo mode and for the explicitly named showcase provider account. */
export function shouldUseLocalDemoMessaging(demo: boolean, role: "worker" | "provider", userId: string, userName: string, organizationName?: string) {
  if (demo || (role === "provider" && isSeededProviderAccount(userId, userName, organizationName))) return true
  return role === "worker" && (seedConversations.some((conversation) => conversation.workerId === userId || conversation.workerName.trim().toLowerCase() === userName.trim().toLowerCase()) || hasStoredSeedConversation(userId))
}

/** Resolve the bundled showcase account without routing other demo accounts into its inbox. */
export function resolveDemoMessagingIdentity(
  demo: boolean,
  role: "worker" | "provider",
  userId: string,
  userName: string,
  organizationName?: string,
) {
  if (role === "provider" && isSeededProviderAccount(userId, userName, organizationName)) return DEMO_PROVIDER_ID
  if (role === "worker") {
    const seededWorker = seedConversations.find((conversation) => conversation.workerId === userId || conversation.workerName.trim().toLowerCase() === userName.trim().toLowerCase())
    if (seededWorker) return seededWorker.workerId
  }
  if (!demo) return userId
  return userId
}

function storageKey(userId: string, otherPartyId?: string) {
  return userId === DEMO_PROVIDER_ID || userId === DEMO_WORKER_ID || otherPartyId === DEMO_PROVIDER_ID || otherPartyId === DEMO_WORKER_ID
    ? DEMO_PROVIDER_STORAGE_KEY
    : DEMO_MESSAGES_STORAGE_KEY
}

function seededData(): DemoData {
  return {
    conversations: seedConversations.map((conversation) => ({
      ...conversation,
      unreadCount: conversation.unreadCount ?? 0,
      messages: conversation.messages.map((message) => ({ ...message })),
      reads: Object.fromEntries(Object.entries(conversation.reads || {}).map(([id, reads]) => [id, [...reads]])),
    })),
  }
}

function readDemoAt(key: string): DemoData {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DemoData>
      if (Array.isArray(parsed.conversations) && (key !== DEMO_PROVIDER_STORAGE_KEY || parsed.conversations.length > 0)) return { conversations: parsed.conversations }
    }
  } catch { /* Restore the untouched JSON seed if persisted demo data is unavailable. */ }
  const initial = key === DEMO_PROVIDER_STORAGE_KEY ? seededData() : { conversations: [] }
  saveDemoAt(initial, key)
  return initial
}

function hasStoredSeedConversation(userId: string) {
  try {
    const saved = localStorage.getItem(DEMO_PROVIDER_STORAGE_KEY)
    if (!saved) return false
    const data = JSON.parse(saved) as Partial<DemoData>
    return Array.isArray(data.conversations) && data.conversations.some((conversation) => conversation.providerId === userId || conversation.workerId === userId)
  } catch { return false }
}

function saveDemoAt(data: DemoData, key: string) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* Callers surface send errors; reads stay available in memory. */ }
}

function demoStoresFor(userId: string) {
  if (userId === DEMO_PROVIDER_ID || userId === DEMO_WORKER_ID || seedConversations.some((conversation) => conversation.workerId === userId)) return [DEMO_PROVIDER_STORAGE_KEY]
  return hasStoredSeedConversation(userId)
    ? [DEMO_MESSAGES_STORAGE_KEY, DEMO_PROVIDER_STORAGE_KEY]
    : [DEMO_MESSAGES_STORAGE_KEY]
}

function findDemoConversation(id: string, userId: string) {
  for (const key of demoStoresFor(userId)) {
    const data = readDemoAt(key)
    const conversation = data.conversations.find((item) => item.id === id && (item.providerId === userId || item.workerId === userId))
    if (conversation) return { data, key, conversation }
  }
  return null
}

function demoMap(conversation: DemoConversation, userId: string): ConversationItem {
  const unreadCount = conversation.messages.filter((message) => message.senderId !== userId && !conversation.reads[userId]?.includes(message.id)).length
  return { ...conversation, unreadCount, lastMessage: conversation.messages.at(-1) || null }
}

export async function listConversations(demo: boolean, userId: string) {
  if (!demo) return (await apiRequest<Array<Record<string, unknown>>>("/api/conversations")).map(mapApiConversation)
  const conversations = new Map<string, DemoConversation>()
  for (const key of demoStoresFor(userId)) {
    for (const conversation of readDemoAt(key).conversations) {
      if (conversation.providerId === userId || conversation.workerId === userId) conversations.set(conversation.id, conversation)
    }
  }
  return [...conversations.values()]
    .map((conversation) => demoMap(conversation, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function openConversation(demo: boolean, applicationId: string, userId: string, name: string, context?: ConversationContext) {
  if (!demo) return mapApiConversation(await apiRequest<Record<string, unknown>>("/api/conversations", { method: "POST", body: JSON.stringify({ applicationId: Number(applicationId) }) }))
  const otherPartyId = context?.actorRole === "worker" ? context.providerId : context?.workerId
  const dataKey = storageKey(userId, otherPartyId)
  const data = readDemoAt(dataKey)
  let conversation = data.conversations.find((item) => item.applicationId === applicationId && (item.providerId === userId || item.workerId === userId))
  if (!conversation) {
    for (const key of demoStoresFor(userId)) {
      if (key === dataKey) continue
      const existing = readDemoAt(key).conversations.find((item) => item.applicationId === applicationId && (item.providerId === userId || item.workerId === userId))
      if (existing) { conversation = existing; break }
    }
  }
  if (!conversation) {
    const workerIsSender = context?.actorRole ? context.actorRole === "worker" : userId === DEMO_WORKER_ID
    const now = new Date().toISOString()
    conversation = {
      id: `demo-${Date.now()}`,
      workerId: workerIsSender ? userId : context?.workerId || DEMO_WORKER_ID,
      workerName: workerIsSender ? name : context?.workerName || DEMO_WORKER_NAME,
      providerId: workerIsSender ? context?.providerId || DEMO_PROVIDER_ID : userId,
      providerName: workerIsSender ? context?.providerName || DEMO_PROVIDER_NAME : name,
      jobId: context?.jobId ?? null,
      jobTitle: context?.jobTitle || "Marketplace conversation",
      applicationId,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
      messages: [],
      reads: {},
    }
    data.conversations.unshift(conversation)
    saveDemoAt(data, dataKey)
  } else if (context?.actorRole === "provider") {
    // Keep an applicant's message thread aligned with the name and photo on their application.
    conversation.workerId = context.workerId || conversation.workerId
    conversation.workerName = context.workerName || conversation.workerName
    conversation.workerPhoto = context.workerPhoto || conversation.workerPhoto
    conversation.providerName = context.providerName || conversation.providerName
    conversation.jobId = context.jobId ?? conversation.jobId
    conversation.jobTitle = context.jobTitle || conversation.jobTitle
    saveDemoAt(data, dataKey)
  }
  return demoMap(conversation, userId)
}

export async function openWorkerConversation(demo: boolean, workerId: string, userId: string, providerName: string, workerName: string) {
  if (!demo) return mapApiConversation(await apiRequest<Record<string, unknown>>(`/api/conversations/workers/${encodeURIComponent(workerId)}`, { method: "POST" }))
  const dataKey = storageKey(userId, workerId)
  const data = readDemoAt(dataKey)
  let conversation = data.conversations.find((item) => item.workerId === workerId && item.providerId === userId)
  if (!conversation) {
    const now = new Date().toISOString()
    conversation = { id: `demo-${Date.now()}`, workerId, workerName, providerId: userId, providerName, jobId: null, jobTitle: null, applicationId: null, status: "OPEN", createdAt: now, updatedAt: now, unreadCount: 0, messages: [], reads: {} }
    data.conversations.unshift(conversation)
    saveDemoAt(data, dataKey)
  }
  return demoMap(conversation, userId)
}

export async function loadThread(demo: boolean, id: string, userId: string): Promise<Thread> {
  if (!demo) {
    const result = await apiRequest<{ conversation: Record<string, unknown>; messages: Array<Record<string, unknown>> }>(`/api/conversations/${id}`)
    return { conversation: mapApiConversation(result.conversation), messages: result.messages.map(mapApiMessage) }
  }
  const found = findDemoConversation(id, userId)
  if (!found) throw new Error("Conversation not found")
  const { data, key, conversation } = found
  conversation.reads[userId] = conversation.messages.filter((message) => message.senderId !== userId).map((message) => message.id)
  saveDemoAt(data, key)
  return { conversation: demoMap(conversation, userId), messages: [...conversation.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }
}

export async function sendMessage(demo: boolean, id: string, userId: string, name: string, content: string, senderRole?: "JOB_PROVIDER" | "JOB_SEEKER") {
  if (!demo) return mapApiMessage(await apiRequest<Record<string, unknown>>(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }))
  const found = findDemoConversation(id, userId)
  if (!found) throw new Error("Conversation not found")
  const { data, key, conversation } = found
  const now = Date.now()
  const previousActivity = Date.parse(conversation.updatedAt)
  const createdAt = new Date(Math.max(now, Number.isFinite(previousActivity) ? previousActivity + 1 : now)).toISOString()
  const message: MessageItem = { id: `demo-msg-${now}-${Math.random().toString(36).slice(2, 7)}`, senderId: userId, senderName: name, senderRole: senderRole || (userId.includes("provider") ? "JOB_PROVIDER" : "JOB_SEEKER"), content, createdAt }
  conversation.messages.push(message)
  conversation.updatedAt = message.createdAt
  conversation.reads[userId] ??= []
  saveDemoAt(data, key)
  return message
}

export async function markConversationRead(demo: boolean, id: string, userId: string) {
  if (!demo) { await apiRequest<void>(`/api/conversations/${id}/read`, { method: "POST" }); return }
  const found = findDemoConversation(id, userId)
  if (!found) return
  const { data, key, conversation } = found
  conversation.reads[userId] = conversation.messages.filter((message) => message.senderId !== userId).map((message) => message.id)
  saveDemoAt(data, key)
}

/** Restore the bundled inbox for the showcase; this never touches backend or non-showcase data. */
export function resetDemoProviderMessages() {
  try { localStorage.removeItem(DEMO_PROVIDER_STORAGE_KEY) } catch { /* The next read still has the bundled seed. */ }
}

function mapApiMessage(value: Record<string, unknown>): MessageItem {
  return { id: String(value.id), senderId: String(value.senderId), senderName: String(value.senderName || "User"), senderRole: String(value.senderRole || ""), content: String(value.content || ""), createdAt: String(value.createdAt || new Date().toISOString()), readAt: value.readAt as string | null | undefined, messageType: value.messageType === "SYSTEM" ? "SYSTEM" : "USER" }
}

function mapApiConversation(value: Record<string, unknown>): ConversationItem {
  return { id: String(value.id), workerId: String(value.workerId), workerName: String(value.workerName || "Worker"), providerId: String(value.providerId), providerName: String(value.providerName || "Provider"), jobId: value.jobId == null ? null : String(value.jobId), jobTitle: value.jobTitle == null ? null : String(value.jobTitle), applicationId: value.applicationId == null ? null : String(value.applicationId), status: String(value.status || "OPEN"), createdAt: String(value.createdAt || ""), updatedAt: String(value.updatedAt || ""), unreadCount: Number(value.unreadCount) || 0, lastMessage: value.lastMessage && typeof value.lastMessage === "object" ? mapApiMessage(value.lastMessage as Record<string, unknown>) : null }
}
