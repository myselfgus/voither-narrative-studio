import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo } from './types';
import type { Env } from './core-utils';
// 🤖 AI Extension Point: Add session management features
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private reports = new Map<string, string>();
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
      this.loaded = true;
    }
  }
  private async persistSessions(): Promise<void> {
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }
  private async persistReports(): Promise<void> {
    await this.ctx.storage.put('reports', Object.fromEntries(this.reports));
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
    if (deleted) {
      await this.persistSessions();
      await this.persistReports();
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
    // Ensure session exists before setting data
    if (!this.sessions.has(sessionId)) {
      await this.addSession(sessionId, 'Novo Relatório');
    }
    this.reports.set(sessionId, data);
    await this.persistReports();
  }
  async getReportData(sessionId: string): Promise<string | null> {
    await this.ensureLoaded();
    return this.reports.get(sessionId) || null;
  }
}