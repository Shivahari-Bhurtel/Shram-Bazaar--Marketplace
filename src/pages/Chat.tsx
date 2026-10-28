import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';
import { sendChatMessage, sendResumeAnalysis } from '../services/shramAi';
import { useLanguage } from '../i18n/LanguageContext';

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const RESUME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

type MessageAttachment = { name: string; extension: string; size: number };

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
  attachment?: MessageAttachment;
};

type Thread = {
  id: string;
  title: string;
  messages: Message[];
  conversationId?: string;
};

const suggestions = [
  { title: 'Find work that fits me', detail: 'Explore jobs that match my skills' },
  { title: 'Improve my profile', detail: 'Get tips to stand out to employers' },
  { title: 'Understand applications', detail: 'Learn what happens after I apply' },
  { title: 'Hiring on Shrama', detail: 'Get help posting and managing a job' },
];

function formatTime() {
  return new Intl.DateTimeFormat('en-NP', { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function makeWelcome(name: string, language: 'en' | 'ne'): Message {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    text: language === 'ne'
      ? `${name ? `${name}, ` : ''}नमस्ते। काम, आवेदन र भर्नाबारे म सहयोग गर्छु। के जान्न चाहनुहुन्छ?`
      : `Hello${name ? `, ${name}` : ''}. I can help you navigate jobs, applications, and hiring on Shrama. What would you like to work on?`,
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

function renderInlineText(text: string) {
  return text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={index} className="font-bold text-stone-950"><em>{part.slice(3, -3)}</em></strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-stone-950">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-stone-800">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-ink">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function AssistantResponse({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);

  return (
    <div className="space-y-4 text-lg leading-8 tracking-normal text-stone-700 sm:text-[19px] sm:leading-9">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.every(line => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-1.5 pl-5 marker:text-primary-ink">
              {lines.map((line, lineIndex) => <li key={lineIndex} className="pl-1">{renderInlineText(line.replace(/^[-*]\s+/, ''))}</li>)}
            </ul>
          );
        }
        if (lines.every(line => /^\d+[.)]\s+/.test(line))) {
          return (
            <ol key={index} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary-ink">
              {lines.map((line, lineIndex) => <li key={lineIndex} className="pl-1">{renderInlineText(line.replace(/^\d+[.)]\s+/, ''))}</li>)}
            </ol>
          );
        }
        if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
          return <h3 key={index} className="pt-1 text-xl font-bold leading-snug tracking-tight text-stone-950 sm:text-2xl">{renderInlineText(lines[0].replace(/^#{1,3}\s+/, ''))}</h3>;
        }
        return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInlineText(line)}</span>)}</p>;
      })}
    </div>
  );
}

export default function Chat() {
  const { state } = useApp();
  const { language } = useLanguage();
  const firstName = state.currentUser?.name.split(' ')[0] || '';
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState('thread-start');
  const [threads, setThreads] = useState<Thread[]>([
    { id: 'thread-start', title: 'New chat', messages: [makeWelcome(firstName, language)] },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [processingResume, setProcessingResume] = useState(false);
  const idCounter = useRef(0);
  const sendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeThread = threads.find(thread => thread.id === activeThreadId) ?? threads[0];

  useEffect(() => {
    setThreads(current => current.map(thread => ({
      ...thread,
      messages: thread.messages.map(message => message.id.startsWith('welcome-')
        ? { ...message, text: makeWelcome(firstName, language).text }
        : message),
    })));
  }, [firstName, language]);

  const startNewChat = () => {
    const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setThreads(current => [{ id, title: 'New chat', messages: [makeWelcome(firstName, language)] }, ...current]);
    setActiveThreadId(id);
    setDraft('');
    setSelectedFile(null);
    setAttachmentError('');
    setAttachmentMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSidebarOpen(false);
  };

  const deleteThread = (threadId: string) => {
    const remaining = threads.filter(thread => thread.id !== threadId);
    if (remaining.length === 0) {
      const id = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setThreads([{ id, title: 'New chat', messages: [makeWelcome(firstName, language)] }]);
      setActiveThreadId(id);
      return;
    }
    setThreads(remaining);
    if (activeThreadId === threadId) setActiveThreadId(remaining[0].id);
  };

  const sendMessage = async (event?: FormEvent, textOverride?: string) => {
    event?.preventDefault();
    if (sendingRef.current) return;
    const text = (textOverride ?? draft).trim();
    const resumeFile = textOverride === undefined ? selectedFile : null;
    if ((!text && !resumeFile) || !activeThread) return;
    const displayText = text || (resumeFile ? 'Please analyze my resume.' : '');

    const userMessage: Message = {
      id: `message-${++idCounter.current}`,
      role: 'user',
      text: displayText,
      time: formatTime(),
      attachment: resumeFile ? {
        name: resumeFile.name,
        extension: resumeFile.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: resumeFile.size,
      } : undefined,
    };
    const priorHistory = activeThread.messages
      .filter(message => !message.id.startsWith('welcome-'))
      .map(({ role, text }) => ({ role, text }));
    setThreads(current => current.map(thread => thread.id === activeThread.id
      ? {
          ...thread,
          title: thread.messages.length === 1 ? (text || resumeFile?.name || 'Resume analysis').slice(0, 36) + ((text || resumeFile?.name || '').length > 36 ? '…' : '') : thread.title,
          messages: [...thread.messages, userMessage],
        }
      : thread));
    setDraft('');
    setError('');
    setAttachmentError('');
    setAttachmentMenuOpen(false);
    sendingRef.current = true;
    setSending(true);
    setProcessingResume(!!resumeFile);
    try {
      const result = resumeFile
        ? await sendResumeAnalysis(resumeFile, text, activeThread.conversationId ?? null, priorHistory.slice(-20), language)
        : await sendChatMessage(text, activeThread.conversationId ?? null, [...priorHistory.slice(-19), { role: 'user', text }], language);
      const assistantMessage: Message = {
        id: `message-${++idCounter.current}`,
        role: 'assistant',
        text: result.answer,
        time: formatTime(),
      };
      setThreads(current => current.map(thread => thread.id === activeThread.id
        ? { ...thread, conversationId: result.conversation_id, messages: [...thread.messages, assistantMessage] }
        : thread));
      if (resumeFile) {
        setSelectedFile(current => current === resumeFile ? null : current);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach the chat service.');
    } finally {
      sendingRef.current = false;
      setSending(false);
      setProcessingResume(false);
    }
  };

  const handleFileSelection = (file?: File) => {
    setAttachmentMenuOpen(false);
    setAttachmentError('');
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!(extension in RESUME_TYPES)) {
      setAttachmentError('Choose a PDF or DOCX resume.');
      return;
    }
    if (file.type !== RESUME_TYPES[extension]) {
      setAttachmentError('The file type does not match its extension. Please choose a valid PDF or DOCX.');
      return;
    }
    if (!file.size || file.size > MAX_RESUME_BYTES) {
      setAttachmentError(file.size ? 'Resume files must be 10 MB or smaller.' : 'The selected file is empty.');
      return;
    }
    setSelectedFile(file);
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
          <button onClick={startNewChat} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left text-base font-bold text-stone-900 shadow-sm transition-colors hover:border-primary-100 hover:bg-primary-50 hover:text-primary-ink">
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
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 opacity-0 transition-all hover:bg-primary-50 hover:text-primary-ink focus-visible:opacity-100 group-hover:opacity-100"
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
          <p className="text-xs leading-relaxed text-stone-500">AI chat prototype. Answers are generated by Gemini and are not based on verified Shram Bazar documents.</p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-12 shrink-0 items-center border-b border-stone-100 px-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open conversation sidebar" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/35 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-8">
            {activeThread?.messages.map((message, index) => (
              <div key={message.id} className={`flex gap-3.5 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'items-start'}`}>
                {message.role === 'assistant' && (
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/15 ring-1 ring-primary/10"><ChatIcon className="h-[18px] w-[18px]" /></div>
                )}
                <div className={`${message.role === 'user' ? 'max-w-[88%] rounded-3xl rounded-br-lg border border-primary-100 bg-primary-50/80 px-4 py-3 shadow-sm sm:px-5' : 'min-w-0 flex-1 pt-0.5'}`}>
                  {message.role === 'assistant'
                    ? <AssistantResponse text={message.text} />
                    : <p className="whitespace-pre-wrap text-[15px] leading-7 text-stone-800 sm:text-base">{message.text}</p>}
                  {message.attachment && (
                    <div className="mt-3 flex max-w-full items-center gap-2.5 rounded-xl border border-primary-100 bg-white/80 px-3 py-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[9px] font-bold tracking-wide text-primary-ink">{message.attachment.extension}</span>
                      <span className="min-w-0"><span className="block truncate text-xs font-semibold text-stone-800">{message.attachment.name}</span><span className="mt-0.5 block text-[10px] text-stone-500">Resume · {formatFileSize(message.attachment.size)}</span></span>
                    </div>
                  )}
                  {!(index === 0 && message.role === 'assistant' && activeThread.messages.length === 1) && (
                    <p className={`mt-2.5 text-[11px] font-medium text-stone-400 ${message.role === 'user' ? 'text-right' : ''}`}>{message.time}</p>
                  )}
                </div>
              </div>
            ))}
            {sending && <div role="status" className="flex items-center gap-3 text-sm text-stone-500"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{processingResume ? 'Reading and analyzing your resume…' : 'Shrama assistant is thinking…'}</div>}
          </div>

          {activeThread?.messages.length === 1 && (
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => void sendMessage(undefined, `${suggestion.title}: ${suggestion.detail}`)}
                  disabled={sending}
                  className="group rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/50 sm:p-6"
                >
                  <span className="block text-base font-bold leading-snug text-stone-900 group-hover:text-primary-ink sm:text-lg">{suggestion.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-stone-600 sm:text-base">{suggestion.detail}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 px-3 pb-9 pt-2 sm:px-6 sm:pb-11">
          <div className="mx-auto max-w-3xl">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-[10px] font-bold text-primary-ink">{selectedFile.name.split('.').pop()?.toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-stone-800">{selectedFile.name}</span><span className="text-xs text-stone-500">{selectedFile.name.split('.').pop()?.toUpperCase()} resume · {formatFileSize(selectedFile.size)}</span></span>
                <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={sending} aria-label={`Remove ${selectedFile.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg></button>
              </div>
            )}
            {(attachmentError || error) && <div role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{attachmentError || error}<button type="button" onClick={() => { setAttachmentError(''); setError(''); }} className="ml-2 font-semibold underline">Dismiss</button></div>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              aria-label="Choose a PDF or DOCX resume"
              onChange={event => { handleFileSelection(event.target.files?.[0]); event.target.value = ''; }}
            />
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-3xl border border-stone-300 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-stone-400 focus-within:shadow-md sm:px-4">
              <div className="relative mb-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Add an attachment"
                  aria-haspopup="menu"
                  aria-expanded={attachmentMenuOpen}
                  disabled={sending}
                  onClick={() => setAttachmentMenuOpen(open => !open)}
                  onKeyDown={event => { if (event.key === 'Escape') setAttachmentMenuOpen(false); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-primary-ink disabled:opacity-50"
                ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg></button>
                {attachmentMenuOpen && <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"><button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-stone-500" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" /></svg>Upload from device</button><p className="px-3 pb-1 pt-0.5 text-[10px] text-stone-400">PDF or DOCX · max 10 MB</p></div>}
              </div>
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
                disabled={sending}
                className="max-h-36 min-h-12 flex-1 resize-none border-0 bg-transparent px-1 py-3 font-sans text-[15px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 sm:text-base"
              />
              <button type="submit" disabled={(!draft.trim() && !selectedFile) || sending} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400" aria-label="Send message" title="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7 7-7 7 7" /></svg>
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-stone-400">Gemini AI-chat prototype. Resume files are sent to Gemini for analysis; uploads are not saved by this service. Live job matching is not connected.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
