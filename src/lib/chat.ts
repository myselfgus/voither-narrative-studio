import type { SessionInfo } from '../../worker/types';
import { NarrativeReportData } from '@/types/report';
class ChatService {
  private sessionId: string;
  private baseUrl: string;
  private preLLMData?: string;
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
  storePreLLMData(data: NarrativeReportData): void {
    this.preLLMData = JSON.stringify(data, null, 2);
  }
  getPreLLMData(): string | null {
    return this.preLLMData || null;
  }
  async sendMessage(
    message: string,
    model?: string,
    onChunk?: (chunk: string) => void
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model, stream: !!onChunk }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) onChunk(chunk);
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false };
    }
  }
  async createSession(title?: string, reportData?: NarrativeReportData): Promise<{ success: boolean; data?: { sessionId: string }; error?: string }> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sessionId: this.sessionId, reportData: reportData ? JSON.stringify(reportData) : undefined })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
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
  async saveReportToSession(sessionId: string, reportData: NarrativeReportData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.stringify(reportData) })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to save report' };
    }
  }
  async loadReportFromSession(sessionId: string): Promise<{ success: boolean; data?: NarrativeReportData; error?: string }> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/data`);
      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.error || 'Report not found' };
      }
      const result = await response.json();
      return { success: true, data: JSON.parse(result.data) };
    } catch (error) {
      return { success: false, error: 'Failed to load report' };
    }
  }
}
export const chatService = new ChatService();