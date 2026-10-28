export type ChatTurn = { role: 'user' | 'assistant'; text: string };

export type ChatResponse = {
  answer: string;
  conversation_id: string;
  source_files: string[];
};

export type ResumeAnalysisResponse = {
  answer: string;
  conversation_id: string;
};

const apiUrl = (import.meta.env.VITE_SHRAM_AI_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export type ChatLanguage = 'en' | 'ne';

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  history: ChatTurn[],
  language: ChatLanguage = 'en',
): Promise<ChatResponse> {
  const response = await fetch(`${apiUrl}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId, history, language }),
  });

  if (!response.ok) {
    let detail = `Chat service returned ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* use status message */ }
    throw new Error(detail);
  }
  return response.json() as Promise<ChatResponse>;
}

export async function sendResumeAnalysis(
  file: File,
  message: string,
  conversationId: string | null,
  history: ChatTurn[],
  language: ChatLanguage = 'en',
): Promise<ResumeAnalysisResponse> {
  const form = new FormData();
  form.set('file', file);
  form.set('message', message);
  if (conversationId) form.set('conversation_id', conversationId);
  form.set('history', JSON.stringify(history));
  form.set('language', language);

  const response = await fetch(`${apiUrl}/api/v1/resume-analysis`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    let detail = `Resume analysis failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* use status message */ }
    throw new Error(detail);
  }
  return response.json() as Promise<ResumeAnalysisResponse>;
}
