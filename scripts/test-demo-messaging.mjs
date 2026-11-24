import assert from "node:assert/strict"
import { createServer } from "vite"

const values = new Map()
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
}

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom" })
try {
  const messaging = await vite.ssrLoadModule("/src/services/messaging.ts")
  const providerId = messaging.resolveDemoMessagingIdentity(true, "provider", "provider-account-1", "Owner", "Himalayan Build Co.")
  const otherProviderId = messaging.resolveDemoMessagingIdentity(true, "provider", "provider-account-2", "Other Provider", "Different Company")
  const showcaseDemo = messaging.shouldUseLocalDemoMessaging(false, "provider", "provider-account-1", "Owner", "Himalayan Build Co.")
  assert.equal(providerId, "demo-provider", "the seeded provider organization resolves to the showcase ID")
  assert.equal(otherProviderId, "provider-account-2", "other demo providers keep their own identity")
  assert.equal(messaging.shouldUseLocalDemoMessaging(false, "provider", "provider-account-1", "Owner", "Himalayan Build Co."), true, "the named showcase provider loads seed data even when backend mode is enabled")
  assert.equal(messaging.resolveDemoMessagingIdentity(false, "provider", "provider-account-1", "Owner", "Himalayan Build Co."), "demo-provider", "the named showcase provider receives the seed sender identity")
  assert.equal(messaging.shouldUseLocalDemoMessaging(false, "provider", "provider-account-demo", "Demo Provider", "Showcase Account"), true, "the explicitly named Demo Provider loads showcase data")
  assert.equal(messaging.shouldUseLocalDemoMessaging(false, "provider", "provider-account-2", "Other Provider", "Different Company"), false, "other real providers stay on their backend inbox")
  assert.equal(messaging.shouldUseLocalDemoMessaging(false, "worker", "worker-account-ram", "Ram Bahadur Thapa"), true, "workers represented in the seed use the matching local thread")
  assert.equal(messaging.resolveDemoMessagingIdentity(false, "worker", "worker-account-ram", "Ram Bahadur Thapa"), "demo-worker-ram", "seeded worker identities use the JSON sender IDs")
  assert.equal(messaging.shouldUseLocalDemoMessaging(false, "worker", "worker-account-other", "Other Worker"), false, "other workers stay on their normal inbox")

  assert.equal(showcaseDemo, true)
  messaging.resetDemoProviderMessages()
  values.set("shram_bazaar_demo_provider_messages_v1", JSON.stringify({ conversations: [] }))
  let inbox = await messaging.listConversations(showcaseDemo, providerId)
  assert.equal(inbox.length, 8, "all conversations from the JSON seed load")
  assert.equal(inbox[0].id, "demo-conv-101", "the most recently updated seeded conversation appears first")
  assert.equal(inbox[0].lastMessage.id, "demo-conv-101-m7", "the final seeded message is the preview")
  assert.ok(inbox.some((conversation) => conversation.workerName === "Maya Gurung" && conversation.jobTitle === "Deep Cleaning — Bhaktapur"))
  assert.ok(inbox.some((conversation) => conversation.unreadCount > 0), "unread state is derived from the seed read lists")
  assert.equal((await messaging.listConversations(true, "demo-worker-ram")).length, 1, "workers only see their own seeded conversations")
  for (const conversation of inbox) {
    const history = await messaging.loadThread(showcaseDemo, conversation.id, providerId)
    assert.equal(history.conversation.workerName, conversation.workerName, "conversation selection retains the embedded worker name")
    assert.equal(history.conversation.jobTitle, conversation.jobTitle, "conversation selection retains job context")
    assert.ok(history.messages.every((message, index) => index === 0 || history.messages[index - 1].createdAt <= message.createdAt), "every conversation is chronological")
    assert.ok(history.messages.every((message) => message.senderId === providerId || message.senderId === conversation.workerId), "message direction is represented by sender IDs")
  }

  const thread = await messaging.loadThread(showcaseDemo, "demo-conv-101", providerId)
  assert.equal(thread.messages.length, 7, "all messages load without duplication")
  assert.equal(thread.messages[0].senderId, "demo-worker", "worker message sender IDs remain intact")
  assert.equal(thread.messages[1].senderId, providerId, "provider sender IDs remain intact")
  assert.ok(thread.messages.every((message, index) => index === 0 || thread.messages[index - 1].createdAt <= message.createdAt), "messages are chronological")
  inbox = await messaging.listConversations(showcaseDemo, providerId)
  assert.equal(inbox.find((conversation) => conversation.id === "demo-conv-101").unreadCount, 0, "opening a conversation marks its unread worker messages read")

  const sent = await messaging.sendMessage(showcaseDemo, "demo-conv-101", providerId, "Himalayan Build Co.", "I will send the location pin shortly.", "JOB_PROVIDER")
  assert.equal(sent.senderId, providerId, "provider sends use the provider ID")
  assert.equal(sent.senderRole, "JOB_PROVIDER", "provider sends retain the provider role")
  inbox = await messaging.listConversations(showcaseDemo, providerId)
  assert.equal(inbox[0].id, "demo-conv-101", "sending updates activity and moves the conversation to the top")
  assert.equal(inbox[0].lastMessage.content, sent.content, "sending updates the inbox preview")
  await messaging.loadThread(showcaseDemo, "demo-conv-102", providerId)
  const returnedThread = await messaging.loadThread(showcaseDemo, "demo-conv-101", providerId)
  assert.equal(returnedThread.messages.at(-1).id, sent.id, "sent messages persist when switching conversations")
  assert.equal((await messaging.listConversations(true, otherProviderId)).length, 0, "other provider accounts cannot see seeded messages")
  assert.equal((await messaging.listConversations(true, otherProviderId)).length, 0, "other demo providers do not load the local seed")

  const shared = await messaging.openConversation(showcaseDemo, "new-showcase-application", providerId, "Himalayan Build Co.", { actorRole: "provider", workerId: "worker-account-99", workerName: "Laxmi Sherpa", providerId, providerName: "Himalayan Build Co.", jobId: "missing-job", jobTitle: "Seasonal Farm Work — Chitwan" })
  assert.equal(shared.workerName, "Laxmi Sherpa", "new application conversations use their embedded worker context")
  assert.equal((await messaging.listConversations(true, "worker-account-99")).some((conversation) => conversation.id === shared.id), true, "a worker can see a conversation created by the showcase provider")
  await messaging.sendMessage(showcaseDemo, shared.id, "worker-account-99", "Laxmi Sherpa", "I can start on Monday.", "JOB_SEEKER")
  assert.equal((await messaging.listConversations(showcaseDemo, providerId)).find((conversation) => conversation.id === shared.id).lastMessage.content, "I can start on Monday.", "both participants share updates for showcase conversations")

  messaging.resetDemoProviderMessages()
  inbox = await messaging.listConversations(showcaseDemo, providerId)
  assert.equal(inbox.length, 8, "reset restores the seed conversation set")
  assert.notEqual(inbox[0].lastMessage.content, sent.content, "reset removes locally sent demo messages")
  console.log("Demo messaging service checks passed.")
} finally {
  await vite.close()
}
