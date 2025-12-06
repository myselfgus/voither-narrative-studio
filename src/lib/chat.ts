import type { SessionInfo } from '../../worker/types';
const escapeHtml = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
class ChatService {
  private sessionId: string;
  private baseUrl: string;
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }
  getSessionId(): string {
    return this.sessionId;
  }
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }
  newSession(): void {
    this.setSessionId(crypto.randomUUID());
  }
  switchSession(sessionId: string): void {
    this.setSessionId(sessionId);
  }
  async sendMessage(
    message: string,
    model: string = 'voither',
    onChunk?: (chunk: string) => void,
    options?: { data?: any; signal?: AbortSignal; apiKey?: string }
  ): Promise<{ success: boolean; output?: string }> {
    if (options?.data && JSON.stringify(options.data).length > 1024 * 1024) {
      return { success: false, output: "Error: Payload too large. Please keep transcriptions under 1MB." };
    }
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options?.apiKey && { 'X-Api-Key': options.apiKey }) },
          body: JSON.stringify({ message, model, stream: !!onChunk, data: options?.data }),
          signal: options?.signal,
        });
        if (response.status === 429 && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(`Rate limited. Retrying in ${delayMs}ms...`);
          await delay(delayMs);
          continue;
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let fullOutput = '';
        if (onChunk && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
              fullOutput += chunk;
              onChunk(chunk);
            }
          }
        } else {
          const result = await response.json();
          fullOutput = result.data?.messages?.[result.data.messages.length - 1]?.content || '';
        }
        return { success: true, output: escapeHtml(fullOutput) };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          return { success: false };
        }
        if (attempt === maxRetries - 1) {
          console.error('Failed to send message after multiple retries:', error);
          return { success: false, output: `Error: ${error.message}` };
        }
      }
    }
    return { success: false, output: 'An unknown error occurred after retries.' };
  }
  async createSession(title?: string, reportData?: any): Promise<{ success: boolean; data?: { sessionId: string }; error?: string }> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sessionId: this.sessionId, reportData: reportData ? JSON.stringify(reportData) : undefined })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success) {
        this.setSessionId(result.data.sessionId);
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create session' };
    }
  }
  async listSessions(): Promise<{ success: boolean; data?: SessionInfo[]; error?: string }> {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to list sessions' };
    }
  }
  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to delete session' };
    }
  }
  async saveReportToSession(sessionId: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to save report' };
    }
  }
  async loadReportFromSession(sessionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/data`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Report not found' }));
        return { success: false, error: err.error || 'Report not found' };
      }
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to load report' };
    }
  }
  async saveApiKey(sessionId: string, key: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch('/api/user/apikey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, key }),
    });
    return response.json();
  }
  async getApiKey(sessionId: string): Promise<{ success: boolean; data?: { key: string | null } }> {
    const response = await fetch(`/api/user/apikey?sessionId=${sessionId}`);
    return response.json();
  }
}
export const chatService = new ChatService();