import type { SessionInfo, Message } from '../../worker/types';
import { NarrativeReportData } from '@/types/report';
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
const createFallbackReport = (errorMessage: string): NarrativeReportData => ({
  metadata: {
    paciente_id: 'Fallback Data',
    contexto: 'Error during processing',
    data_analise: new Date().toISOString(),
    medico_responsavel: 'N/A',
    crm: 'N/A',
    total_turnos: 0,
    total_palavras: 0,
    duracao_estimada_consulta: 'N/A',
    analista: 'System',
  },
  reportTitle: 'Error Generating Report',
  keyQuote: 'An error occurred.',
  sections: [{
    title: 'Processing Error',
    intro: [{ type: 'paragraph', content: `Failed to process the request. Please check your connection and try again. Details: ${errorMessage}` }],
    subsections: [],
  }],
});
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
  ): Promise<{ success: boolean; output?: string; fallbackReport?: NarrativeReportData }> {
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
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(`[ChatService:${this.sessionId}] Status ${response.status}. Retrying in ${delayMs}ms...`);
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
          const messages: Message[] = result.data?.messages || [];
          fullOutput = messages.length > 0 ? messages[messages.length - 1].content : '';
        }
        return { success: true, output: escapeHtml(fullOutput) };
      } catch (error: any) {
        console.error(`[ChatService:${this.sessionId}] SendMessage failed on attempt ${attempt + 1}:`, error);
        if (error.name === 'AbortError') {
          return { success: false, output: 'Request aborted by user.' };
        }
        if (attempt === maxRetries - 1) {
          return { success: false, output: `Error: ${error.message}`, fallbackReport: createFallbackReport(error.message) };
        }
      }
    }
    const finalError = 'An unknown error occurred after multiple retries.';
    return { success: false, output: finalError, fallbackReport: createFallbackReport(finalError) };
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
  async listPatients(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to list patients' };
    }
  }
  async getPatient(patientId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to get patient details' };
    }
  }
  async createPatient(patientData: { patient_id: string; name: string; context?: string; crm: string; metadata?: any }): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[ChatService] createPatient failed:', error);
      return { success: false, error: error.message || 'Failed to create patient' };
    }
  }
}
export const chatService = new ChatService();