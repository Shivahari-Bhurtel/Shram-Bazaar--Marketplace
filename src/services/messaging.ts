import { apiRequest } from "./backendApi"

export type MessageItem = { id: string; senderId: string; senderName: string; content: string; createdAt: string; readAt?: string | null }
export type ConversationItem = { id: string; workerId: string; workerName: string; providerId: string; providerName: string; jobId?: string | null; jobTitle?: string | null; applicationId?: string | null; status: string; createdAt: string; updatedAt: string; unreadCount: number; lastMessage?: MessageItem | null }
export type Thread = { conversation: ConversationItem; messages: MessageItem[] }

const demoKey = "shram-demo-messages-v1"
type DemoData = { conversations: Array<ConversationItem & { messages: MessageItem[]; reads: Record<string, string[]> }> }
function readDemo(): DemoData {
  try {
    const saved = localStorage.getItem(demoKey)
    if (saved) return JSON.parse(saved) as DemoData
  } catch { /* Seed persistent demo data when storage is unavailable or invalid. */ }
  const now = new Date().toISOString()
  const sample: DemoData = { conversations: [
    { id: "demo-101", workerId: "demo-worker", workerName: "Sita Tamang", providerId: "demo-provider", providerName: "Himalayan Build Co.", jobId: "demo-job-1", jobTitle: "Experienced mason needed", applicationId: "demo-app-1", status: "OPEN", createdAt: now, updatedAt: now, unreadCount: 1, messages: [{ id: "demo-msg-1", senderId: "demo-provider", senderName: "Himalayan Build Co.", content: "Namaste Sita, are you available to start next Monday?", createdAt: now }], reads: {} },
    { id: "demo-102", workerId: "demo-worker", workerName: "Sita Tamang", providerId: "demo-provider", providerName: "Kathmandu Home Services", jobId: "demo-job-2", jobTitle: "Home painting work", applicationId: "demo-app-2", status: "OPEN", createdAt: now, updatedAt: now, unreadCount: 0, messages: [{ id: "demo-msg-2", senderId: "demo-worker", senderName: "Sita Tamang", content: "Thank you. I can visit to discuss the work this week.", createdAt: now }], reads: {} },
  ] }
  saveDemo(sample); return sample
}
function saveDemo(data: DemoData) { try { localStorage.setItem(demoKey, JSON.stringify(data)) } catch { /* Component reports a readable storage error on writes. */ } }
function demoMap(c: DemoData["conversations"][number], userId: string): ConversationItem {
  const unreadCount = c.messages.filter((m) => m.senderId !== userId && !c.reads[userId]?.includes(m.id)).length
  return { ...c, unreadCount, lastMessage: c.messages.at(-1) || null }
}
export async function listConversations(demo: boolean, userId: string) {
  if (!demo) return (await apiRequest<Array<Record<string, unknown>>>("/api/conversations")).map(mapApiConversation)
  return readDemo().conversations.map((c) => demoMap(c, userId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
export async function openConversation(demo: boolean, applicationId: string, userId: string, name: string) {
  if (!demo) return mapApiConversation(await apiRequest<Record<string, unknown>>("/api/conversations", { method: "POST", body: JSON.stringify({ applicationId: Number(applicationId) }) }))
  const data = readDemo(); let c = data.conversations.find((item) => item.applicationId === applicationId)
  if (!c) { c = { id: `demo-${Date.now()}`, workerId: userId === "demo-worker" ? userId : "demo-worker", workerName: userId === "demo-worker" ? name : "Sita Tamang", providerId: userId === "demo-worker" ? "demo-provider" : userId, providerName: userId === "demo-worker" ? "Himalayan Build Co." : name, jobId: undefined, jobTitle: "Marketplace conversation", applicationId, status: "OPEN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), unreadCount: 0, messages: [], reads: {} }; data.conversations.unshift(c); saveDemo(data) }
  return demoMap(c, userId)
}
export async function loadThread(demo: boolean, id: string, userId: string): Promise<Thread> {
  if (!demo) { const result = await apiRequest<{ conversation: Record<string, unknown>; messages: Array<Record<string, unknown>> }>(`/api/conversations/${id}`); return { conversation: mapApiConversation(result.conversation), messages: result.messages.map(mapApiMessage) } }
  const d=readDemo(), c=d.conversations.find((item)=>item.id===id); if(!c) throw new Error("Conversation not found"); c.reads[userId]=c.messages.filter(m=>m.senderId!==userId).map(m=>m.id); saveDemo(d); return {conversation:demoMap(c,userId),messages:c.messages}
}
export async function sendMessage(demo: boolean, id: string, userId: string, name: string, content: string) {
  if (!demo) return mapApiMessage(await apiRequest<Record<string, unknown>>(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }))
  const d=readDemo(), c=d.conversations.find((item)=>item.id===id); if(!c) throw new Error("Conversation not found"); const message:MessageItem={id:`demo-msg-${Date.now()}`,senderId:userId,senderName:name,content,createdAt:new Date().toISOString()}; c.messages.push(message); c.updatedAt=message.createdAt; c.reads[userId]??=[]; saveDemo(d); return message
}
export async function markConversationRead(demo: boolean, id: string, userId: string) {
  if (!demo) { await apiRequest<void>(`/api/conversations/${id}/read`, { method: "POST" }); return }
  const d=readDemo(), c=d.conversations.find((item)=>item.id===id); if(c){c.reads[userId]=c.messages.filter(m=>m.senderId!==userId).map(m=>m.id);saveDemo(d)}
}
function mapApiMessage(v: Record<string, unknown>): MessageItem { return { id:String(v.id), senderId:String(v.senderId), senderName:String(v.senderName||"User"), content:String(v.content||""), createdAt:String(v.createdAt||new Date().toISOString()), readAt:v.readAt as string|null|undefined } }
function mapApiConversation(v: Record<string, unknown>): ConversationItem { return { id:String(v.id), workerId:String(v.workerId), workerName:String(v.workerName||"Worker"), providerId:String(v.providerId), providerName:String(v.providerName||"Provider"), jobId:v.jobId==null?null:String(v.jobId), jobTitle:v.jobTitle==null?null:String(v.jobTitle), applicationId:v.applicationId==null?null:String(v.applicationId), status:String(v.status||"OPEN"), createdAt:String(v.createdAt||""), updatedAt:String(v.updatedAt||""), unreadCount:Number(v.unreadCount)||0, lastMessage:v.lastMessage&&typeof v.lastMessage==="object"?mapApiMessage(v.lastMessage as Record<string,unknown>):null } }
