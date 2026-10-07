import { useRef, useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
};

type Thread = {
  id: string;
  title: string;
  messages: Message[];
};

const suggestions = [
  { title: 'Find work that fits me', detail: 'Explore jobs that match my skills' },
  { title: 'Improve my profile', detail: 'Get tips to stand out to employers' },
  { title: 'Understand applications', detail: 'Learn what happens after I apply' },
  { title: 'Hiring on Shrama', detail: 'Get help posting and managing a job' },
];

const demoReplies = [
  'I can help with that. Once the Shrama assistant is connected, I’ll look across jobs, profiles, and support resources to give you a tailored answer.',
  'A good next step is to add your skills, availability, and work history to your profile. These details help employers understand what you can do.',
  'Browse a job, review its requirements, and select Apply. You can follow updates from your My Applications page.',
];

function formatTime() {
  return new Intl.DateTimeFormat('en-NP', { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function makeWelcome(name: string): Message {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    text: `Hello${name ? `, ${name}` : ''}. I can help you navigate jobs, applications, and hiring on Shrama. What would you like to work on?`,
    time: formatTime(),
  };
}

function ChatIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4.5A7.5 7.5 0 1 1 20 11.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5" />
    </svg>
  );
}

export default function Chat() {
  const { state } = useApp();
  const firstName = state.currentUser?.name.split(' ')[0] || '';
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState('thread-start');
  const [threads, setThreads] = useState<Thread[]>([
    { id: 'thread-start', title: 'New chat', messages: [makeWelcome(firstName)] },
  ]);
  const idCounter = useRef(0);
  const activeThread = threads.find(thread => thread.id === activeThreadId) ?? threads[0];

  const startNewChat = () => {
    const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setThreads(current => [{ id, title: 'New chat', messages: [makeWelcome(firstName)] }, ...current]);
    setActiveThreadId(id);
    setDraft('');
    setSidebarOpen(false);
  };

  const deleteThread = (threadId: string) => {
    const remaining = threads.filter(thread => thread.id !== threadId);
    if (remaining.length === 0) {
      const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setThreads([{ id, title: 'New chat', messages: [makeWelcome(firstName)] }]);
      setActiveThreadId(id);
      return;
    }
    setThreads(remaining);
    if (activeThreadId === threadId) setActiveThreadId(remaining[0].id);
  };

  const sendMessage = (event?: FormEvent, textOverride?: string) => {
    event?.preventDefault();
    const text = (textOverride ?? draft).trim();
    if (!text || !activeThread) return;

    const userMessage: Message = { id: `message-${++idCounter.current}`, role: 'user', text, time: formatTime() };
    const assistantMessage: Message = {
      id: `message-${++idCounter.current}`,
      role: 'assistant',
      text: demoReplies[(activeThread.messages.length - 1) % demoReplies.length],
      time: formatTime(),
    };
    setThreads(current => current.map(thread => thread.id === activeThread.id
      ? {
          ...thread,
          title: thread.messages.length === 1 ? text.slice(0, 36) + (text.length > 36 ? '…' : '') : thread.title,
          messages: [...thread.messages, userMessage, assistantMessage],
        }
      : thread));
    setDraft('');
  };

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden bg-white text-stone-800">
      {sidebarOpen && <button aria-label="Close conversation sidebar" onClick={() => setSidebarOpen(false)} className="absolute inset-0 z-30 bg-stone-950/30 md:hidden" />}

      <aside className={`${sidebarOpen ? 'absolute inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)]' : 'hidden'} shrink-0 flex-col border-r border-stone-200 bg-stone-50 md:relative md:flex md:w-64`}>
        <div className="relative flex flex-col items-center px-4 pb-4 pt-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm"><ChatIcon className="h-6 w-6" /></div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-stone-950">Shrama assistant</p>
            <p className="mt-1 text-sm font-medium text-stone-600">Help for work and hiring</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="absolute right-3 top-4 rounded-lg p-2 text-stone-500 hover:bg-stone-200 md:hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="px-3 py-3">
          <button onClick={startNewChat} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left text-base font-bold text-stone-900 shadow-sm transition-colors hover:border-primary-100 hover:bg-primary-50 hover:text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
            New chat
            <span className="ml-auto text-xs font-semibold text-stone-500">⌘ K</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          <p className="mb-3 px-2 text-sm font-bold uppercase tracking-[0.12em] text-stone-600">Recent chats</p>
          <div className="space-y-1">
            {threads.map(thread => (
              <div key={thread.id} className={`group flex items-center rounded-xl transition-colors ${activeThreadId === thread.id ? 'bg-stone-200/80' : 'hover:bg-stone-200/60'}`}>
                <button
                  onClick={() => { setActiveThreadId(thread.id); setSidebarOpen(false); }}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-3 text-left text-base ${activeThreadId === thread.id ? 'font-semibold text-stone-950' : 'font-medium text-stone-700 hover:text-stone-950'}`}
                >
                  <ChatIcon className="h-4 w-4 shrink-0 text-stone-400" />
                  <span className="truncate">{thread.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteThread(thread.id)}
                  aria-label={`Delete chat: ${thread.title}`}
                  title="Delete chat"
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 opacity-0 transition-all hover:bg-primary-50 hover:text-primary-dark focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-200 px-4 py-3">
          <p className="text-xs leading-relaxed text-stone-500">Assistant responses are examples until the Shrama AI service is connected.</p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-12 shrink-0 items-center border-b border-stone-100 px-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open conversation sidebar" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-7">
            {activeThread?.messages.map((message, index) => (
              <div key={message.id} className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'items-start'}`}>
                {message.role === 'assistant' && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><ChatIcon className="h-4 w-4" /></div>
                )}
                <div className={`max-w-[88%] ${message.role === 'user' ? 'rounded-3xl rounded-br-lg bg-stone-100 px-4 py-3 sm:px-5' : 'min-w-0 flex-1 pt-1'}`}>
                  {message.role === 'assistant' && <p className="mb-1.5 text-xs font-bold text-stone-900">Shrama assistant</p>}
                  <p className={`whitespace-pre-wrap font-sans leading-7 ${message.id.startsWith('welcome-') ? 'text-lg font-medium text-stone-900 sm:text-xl sm:leading-8' : 'text-base text-stone-700'}`}>{message.text}</p>
                  {!(index === 0 && message.role === 'assistant' && activeThread.messages.length === 1) && (
                    <p className={`mt-2 text-[10px] ${message.role === 'user' ? 'text-stone-400' : 'text-stone-400'}`}>{message.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeThread?.messages.length === 1 && (
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => setDraft(suggestion.detail)}
                  className="group rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/50 sm:p-6"
                >
                  <span className="block text-base font-bold leading-snug text-stone-900 group-hover:text-primary sm:text-lg">{suggestion.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-stone-600 sm:text-base">{suggestion.detail}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 px-3 pb-9 pt-2 sm:px-6 sm:pb-11">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-3xl border border-stone-300 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-stone-400 focus-within:shadow-md sm:px-4">
              <label htmlFor="chat-message" className="sr-only">Message the Shrama assistant</label>
              <textarea
                id="chat-message"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Message Shrama assistant"
                className="max-h-36 min-h-12 flex-1 resize-none border-0 bg-transparent px-1 py-3 text-base leading-relaxed text-stone-800 outline-none placeholder:text-stone-400"
              />
              <button type="submit" disabled={!draft.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400" aria-label="Send message" title="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7 7-7 7 7" /></svg>
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-stone-400">Shrama assistant is in preview. Responses are sample text and may not reflect your account or live job listings.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
