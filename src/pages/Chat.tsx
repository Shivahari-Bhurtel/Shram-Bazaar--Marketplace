import { FormEvent, useState } from 'react';
import { useApp } from '../store/AppContext';

type Message = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  time: string;
};

const suggestions = [
  'Find jobs that match my skills',
  'How do I improve my profile?',
  'Explain the application process',
];

const demoReplies = [
  'I can help with that. In the full assistant, I will search Shram Bazar jobs, profiles, and guidance to give you a tailored answer.',
  'That is a good place to start. Add your skills, availability, and work history to make your profile more useful for matching.',
  'Browse a job, review the details, and select Apply. You can track every application from My Applications.',
];

function formatTime() {
  return new Intl.DateTimeFormat('en-NP', { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

export default function Chat() {
  const { state } = useApp();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      text: `Hi ${state.currentUser?.name.split(' ')[0] || 'there'}! I’m your Shram Bazar assistant. Ask me about jobs, applications, or your profile.`,
      time: formatTime(),
    },
  ]);

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages(current => [
      ...current,
      { id: Date.now(), role: 'user', text, time: formatTime() },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: demoReplies[current.length % demoReplies.length],
        time: formatTime(),
      },
    ]);
    setDraft('');
  };

  const useSuggestion = (suggestion: string) => {
    setDraft(suggestion);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-50 px-4 py-6 sm:px-6 lg:py-10">
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <header className="border-b border-stone-200 bg-stone-900 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-semibold">S</div>
            <div>
              <p className="font-display text-xl font-semibold">Shram Bazar assistant</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-300">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Demo assistant · ready to help
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
                  {message.role === 'assistant' && (
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary">S</div>
                  )}
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'rounded-2xl rounded-br-md bg-primary px-4 py-3 text-white' : 'rounded-2xl rounded-tl-md bg-stone-100 px-4 py-3 text-stone-800'}`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`mt-1.5 text-[10px] ${message.role === 'user' ? 'text-white/65' : 'text-stone-400'}`}>{message.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 bg-stone-50 px-4 py-4 sm:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => useSuggestion(suggestion)}
                    className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-primary-100 hover:bg-primary-50 hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <label htmlFor="chat-message" className="sr-only">Message the Shram Bazar assistant</label>
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
                  placeholder="Ask about jobs, applications, or your profile..."
                  className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400"
                />
                <button type="submit" disabled={!draft.trim()} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400" aria-label="Send message" title="Send message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </form>
              <p className="mt-2 text-center text-[11px] text-stone-400">Demo mode · responses are placeholders until the assistant is connected.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}