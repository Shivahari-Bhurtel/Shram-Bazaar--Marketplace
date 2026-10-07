import { useState } from 'react';

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-5 z-50 sm:bottom-6 sm:left-6">
      {open && (
        <section
          aria-label="Shrama chat assistant"
          className="absolute bottom-[4.5rem] left-0 flex h-[min(28rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-950/15"
        >
          <header className="flex items-center gap-3 bg-primary px-5 py-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 18.5 3 21l1.5-5A8.5 8.5 0 1 1 7.5 18.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Shrama assistant</h2>
              <p className="mt-0.5 text-xs text-white/75">Chat support</p>
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

          <div className="flex flex-1 flex-col justify-end bg-stone-50 p-4">
            <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-stone-800">Hello! How can we help?</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">Help with finding work, applications, or hiring on Shrama.</p>
            </div>
            <p className="mt-4 text-center text-[11px] font-medium text-stone-400">AI chat integration coming soon</p>
          </div>

          <form onSubmit={event => event.preventDefault()} className="flex items-center gap-2 border-t border-stone-100 bg-white p-3">
            <input
              type="text"
              aria-label="Chat message"
              placeholder="Chat assistant coming soon"
              disabled
              className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-3 text-sm text-stone-600 placeholder:text-stone-400 disabled:cursor-not-allowed"
            />
            <button type="submit" aria-label="Send message" disabled className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white opacity-50 disabled:cursor-not-allowed">
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
        aria-label={open ? 'Close Shrama chat' : 'Open Shrama chat'}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
            <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 18.5 3 21l1.5-5A8.5 8.5 0 1 1 7.5 18.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5" />
          </svg>
        )}
      </button>
    </div>
  );
}
