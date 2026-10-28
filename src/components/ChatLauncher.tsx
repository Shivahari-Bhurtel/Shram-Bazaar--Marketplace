import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sendChatMessage, type ChatTurn } from '../services/shramAi';
import { useLanguage } from '../i18n/LanguageContext';

type LauncherMessage = ChatTurn & { id: string };

const makeWelcome = (language: 'en' | 'ne'): LauncherMessage => ({
  id: 'welcome',
  role: 'assistant',
  text: language === 'ne'
    ? 'नमस्ते! Gemini AI सँग काम र आवेदनबारे सोध्नुहोस्।'
    : "Hi! I'm Shrama AI, powered by Gemini. Ask me about work or applications.",
});

const quickQuestions = [
  { label: 'Find work', question: 'How can I find work that fits my skills?' },
  { label: 'My applications', question: 'How do job applications work?' },
  { label: 'Profile tips', question: 'How can I improve my worker profile?' },
];

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.5 14.2 9.8 21.5 12l-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2L12 2.5Z" fill="currentColor" />
      <path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2Z" fill="currentColor" opacity=".72" />
    </svg>
  );
}

export default function ChatLauncher() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<LauncherMessage[]>([makeWelcome(language)]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const sendingRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    setMessages(current => current.map(message => message.id === 'welcome' ? makeWelcome(language) : message));
  }, [language]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  const sendMessage = async (event?: FormEvent, textOverride?: string) => {
    event?.preventDefault();
    if (sendingRef.current) return;
    const text = (textOverride ?? draft).trim();
    if (!text) return;

    const priorHistory = messages.filter(message => message.id !== 'welcome').map(({ role, text: content }) => ({ role, text: content }));
    setMessages(current => [...current, { id: `launcher-${++messageIdRef.current}`, role: 'user', text }]);
    setDraft('');
    setError('');
    sendingRef.current = true;
    setSending(true);
    try {
      const response = await sendChatMessage(text, conversationId, [...priorHistory.slice(-19), { role: 'user', text }], language);
      setConversationId(response.conversation_id);
      setMessages(current => [...current, { id: `launcher-${++messageIdRef.current}`, role: 'assistant', text: response.answer }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach the chat service.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 sm:bottom-6 sm:left-6">
      {open && (
        <section
          aria-label="Shrama AI assistant"
          className="absolute bottom-[4.5rem] left-0 flex h-[min(30rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-950/15"
        >
          <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark px-5 py-4 text-white">
            <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner" aria-hidden="true">
              <SparkIcon className="h-6 w-6" />
            </div>
            <div className="relative min-w-0">
              <h2 className="text-sm font-bold tracking-wide">Shrama AI</h2>
              <p className="mt-0.5 text-xs text-white/75">Powered by Gemini</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div ref={messageListRef} aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-stone-200 bg-white text-stone-700 shadow-sm'}`}>
                  {message.text}
                </p>
              </div>
            ))}
            {messages.length === 1 && !sending && (
              <div className="space-y-2 pt-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">Try asking</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map(({ label, question }) => <button key={label} type="button" onClick={() => void sendMessage(undefined, question)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:bg-primary-50 hover:text-primary-ink"><SparkIcon className="h-3 w-3 text-primary-ink" />{label}</button>)}
                </div>
              </div>
            )}
            {sending && <p role="status" className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-500"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Thinking…</p>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">{error}</p>}
          </div>

          <form onSubmit={event => void sendMessage(event)} className="flex items-center gap-2 border-t border-stone-100 bg-white p-3">
            <label htmlFor="launcher-message" className="sr-only">Chat message</label>
            <input
              id="launcher-message"
              type="text"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Ask a question…"
              disabled={sending}
              className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-700 outline-none transition focus:ring-2 focus:ring-primary-100 placeholder:text-stone-400 disabled:opacity-60"
            />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? 'Close Shrama AI' : 'Open Shrama AI'}
        aria-expanded={open}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
            <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
          </svg>
        ) : (
          <SparkIcon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
        )}
      </button>
    </div>
  );
}
