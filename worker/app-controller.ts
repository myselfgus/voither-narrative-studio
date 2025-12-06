import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo } from './types';
import type { Env } from './core-utils';
// ��� AI Extension Point: Add session management features
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private reports = new Map<string, string>();
  private apiKeys = new Map<string, string>(); // Store API keys per session
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedSessions = await this.ctx.storage.get<Record<string, SessionInfo>>('sessions') || {};
      this.sessions = new Map(Object.entries(storedSessions));
      const storedReports = await this.ctx.storage.get<Record<string, string>>('reports') || {};
      this.reports = new Map(Object.entries(storedReports));
      const storedApiKeys = await this.ctx.storage.get<Record<string, string>>('apiKeys') || {};
      this.apiKeys = new Map(Object.entries(storedApiKeys));
      this.loaded = true;
    }
  }
  private async persistSessions(): Promise<void> {
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }
  private async persistReports(): Promise<void> {
    await this.ctx.storage.put('reports', Object.fromEntries(this.reports));
  }
  private async persistApiKeys(): Promise<void> {
    await this.ctx.storage.put('apiKeys', Object.fromEntries(this.apiKeys));
  }
  async addSession(sessionId: string, title?: string): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    this.sessions.set(sessionId, {
      id: sessionId,
      title: title || `Chat ${new Date(now).toLocaleDateString()}`,
      createdAt: now,
      lastActive: now
    });
    await this.persistSessions();
  }
  async removeSession(sessionId: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.sessions.delete(sessionId);
    this.reports.delete(sessionId);
    this.apiKeys.delete(sessionId);
    if (deleted) {
      await this.persistSessions();
      await this.persistReports();
      await this.persistApiKeys();
      // Also delete from D1
      try {
        await this.env.VOITHER_D1.prepare('DELETE FROM Sessions WHERE session_id = ?1').bind(sessionId).run();
      } catch (e) {
        console.error('Failed to delete session from D1:', e);
      }
    }
    return deleted;
  }
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      await this.persistSessions();
    }
  }
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.title = title;
      await this.persistSessions();
      return true;
    }
    return false;
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    await this.ensureLoaded();
    return this.sessions.get(sessionId) || null;
  }
  async setReportData(sessionId: string, data: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.sessions.has(sessionId)) {
      await this.addSession(sessionId, 'Novo Relatório');
    }
    this.reports.set(sessionId, data);
    await this.persistReports();
    // D1 Sync Logic
    try {
      const reportData = JSON.parse(data);
      const inputs = reportData.inputs || {};
      const patientId = inputs.patientId;
      const crm = inputs.crm;
      if (patientId && crm) {
        // 1. Find Patient ID from D1
        const patientResult = await this.env.VOITHER_D1.prepare(
          `SELECT id FROM Patients WHERE patient_id = ?1 AND crm = ?2`
        ).bind(patientId, crm).first<{ id: string }>();
        const dbPatientId = patientResult?.id;
        if (dbPatientId) {
          // 2. Upsert Session
          const sessionUUID = crypto.randomUUID();
          await this.env.VOITHER_D1.prepare(
            `INSERT INTO Sessions (id, patient_id, session_id, title, stages, report, last_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch())
             ON CONFLICT(session_id) DO UPDATE SET title=excluded.title, stages=excluded.stages, report=excluded.report, last_active=unixepoch()`
          ).bind(sessionUUID, dbPatientId, sessionId, `Relatório para ${patientId}`, JSON.stringify(reportData.stages), data).run();
        }
      }
    } catch (e) {
      console.error('D1 Sync failed:', e);
    }
  }
  async getReportData(sessionId: string): Promise<string | null> {
    await this.ensureLoaded();
    let report = this.reports.get(sessionId);
    if (report) return report;
    // Fallback to D1
    try {
      const { results } = await this.env.VOITHER_D1.prepare('SELECT report FROM Sessions WHERE session_id = ?1').bind(sessionId).run<{ report: string }>();
      if (results && results.length > 0) {
        report = results[0].report;
        if (report) {
          this.reports.set(sessionId, report);
          await this.persistReports();
          return report;
        }
      }
    } catch (e) {
      console.error('D1 fallback failed:', e);
    }
    return null;
  }
  async setApiKey(sessionId: string, key: string): Promise<{ success: boolean; message?: string }> {
    await this.ensureLoaded();
    if (typeof key !== 'string' || !key.startsWith('sk-') || key.length < 20) {
      return { success: false, message: 'Invalid API key format.' };
    }
    this.apiKeys.set(sessionId, key);
    await this.persistApiKeys();
    return { success: true };
  }
  async getApiKey(sessionId: string, masked: boolean = true): Promise<string | null> {
    await this.ensureLoaded();
    const key = this.apiKeys.get(sessionId);
    if (!key) return null;
    if (masked) {
      return `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;
    }
    return key;
  }
}