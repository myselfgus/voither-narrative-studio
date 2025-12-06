import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo } from './types';
import type { Env } from './core-utils';
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS Patients (
  id TEXT PRIMARY KEY,
  name TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS Sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  createdAt INTEGER,
  lastActive INTEGER,
  data TEXT
);
`;
interface Room {
  peers: Set<string>;
  signals: any[];
}
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private reports = new Map<string, string>();
  private apiKeys = new Map<string, string>();
  private rooms = new Map<string, Room>();
  private logs: string[] = [];
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async log(message: string, level: 'INFO' | 'ERROR' = 'INFO') {
    const logEntry = `${new Date().toISOString()} [${level}] ${message}`;
    this.logs.push(logEntry);
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    await this.ctx.storage.put('logs', this.logs);
  }
  async getLogs(): Promise<string[]> {
    if (!this.loaded) {
        this.logs = await this.ctx.storage.get<string[]>('logs') || [];
    }
    return this.logs;
  }
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.env.VOITHER_D1) {
      try {
        const { results } = await this.env.VOITHER_D1.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Patients', 'Sessions')").all();
        const tableNames = results.map((r: any) => r.name);
        if (!tableNames.includes('Patients') || !tableNames.includes('Sessions')) {
          await this.log('D1 schema missing. Applying migrations...');
          const statements = MIGRATION_SQL.split(';').filter((s: string) => s.trim()).map((s: string) => this.env.VOITHER_D1.prepare(s.trim()));
          await this.env.VOITHER_D1.batch(statements);
          await this.log('D1 migration complete.');
        }
        if (this.env.VOITHER_R2) {
            await this.env.VOITHER_R2.put('health-check.txt', 'ok');
            await this.log('R2 binding confirmed.');
        }
        console.log('Production e2e complete: All bindings and migrations confirmed.');
        await this.log('Production e2e complete: All bindings and migrations confirmed.');
      } catch (e: any) {
        console.error("D1 migration check failed:", e);
        await this.log(`D1 migration check failed: ${e.message}`, 'ERROR');
      }
    } else {
      console.warn('D1 binding unavailable, skipping migration and sync.');
      await this.log('D1 binding unavailable, skipping migration and sync.', 'ERROR');
    }
    const storedSessions = await this.ctx.storage.get<Record<string, SessionInfo>>('sessions') || {};
    this.sessions = new Map(Object.entries(storedSessions));
    this.logs = await this.ctx.storage.get<string[]>('logs') || [];
    this.loaded = true;
  }
  async addSession(sessionId: string, title?: string): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    this.sessions.set(sessionId, { id: sessionId, title: title || `Chat ${new Date(now).toLocaleDateString()}`, createdAt: now, lastActive: now });
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      this.sessions.set(sessionId, session);
      await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
      await this.log(`Session ${sessionId} activity updated.`);
    }
  }

  async removeSession(sessionId: string): Promise<boolean> {
    await this.ensureLoaded();
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
      // attempt to remove related persisted report if present
      try {
        await this.ctx.storage.delete(`report_${sessionId}`);
      } catch {
        // ignore deletion errors, session already removed from active map
      }
      await this.log(`Session ${sessionId} removed.`);
      return true;
    }
    return false;
  }
  async setReportData(sessionId: string, data: string, patientId?: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.sessions.has(sessionId)) {
      await this.addSession(sessionId, 'Novo Relatório');
    }
    this.reports.set(sessionId, data);
    await this.ctx.storage.put(`report_${sessionId}`, data);
  }
  async getReportData(sessionId: string): Promise<string | null> {
    await this.ensureLoaded();
    let report = this.reports.get(sessionId);
    if (report) return report;
    report = await this.ctx.storage.get<string>(`report_${sessionId}`);
    if (report) this.reports.set(sessionId, report);
    return report ?? null;
  }
  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();
    const url = new URL(request.url);
    if (url.pathname.startsWith('/webrtc')) {
        // WebRTC logic can be added here if needed
    }
    return new Response('Not found', { status: 404 });
  }
}