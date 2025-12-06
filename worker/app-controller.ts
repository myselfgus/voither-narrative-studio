import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo } from './types';
import type { Env } from './core-utils';
interface Room {
  peers: Set<string>;
  signals: any[];
}
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private reports = new Map<string, string>();
  private apiKeys = new Map<string, string>();
  private rooms = new Map<string, Room>();
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.env.VOITHER_D1) {
      try {
        const { results } = await this.env.VOITHER_D1.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Patients', 'Sessions')").all();
        const tableNames = results.map((r: any) => r.name);
        if (!tableNames.includes('Patients') || !tableNames.includes('Sessions')) {
          console.log('D1 schema missing. Applying migrations...');
          const migrationSQL = `
            DROP TABLE IF EXISTS Sessions;
            DROP TABLE IF EXISTS Patients;
            CREATE TABLE Patients (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                name TEXT NOT NULL,
                context TEXT,
                crm TEXT NOT NULL,
                metadata TEXT,
                created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
                updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
                UNIQUE(patient_id, crm)
            );
            CREATE TABLE Sessions (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                session_id TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                stages TEXT,
                report TEXT,
                created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
                last_active INTEGER DEFAULT (unixepoch()) NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES Patients(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_patient_id ON Patients(patient_id);
            CREATE INDEX IF NOT EXISTS idx_session_patient_id ON Sessions(patient_id);
          `;
          const statements = migrationSQL.split(';').filter(s => s.trim()).map(s => this.env.VOITHER_D1.prepare(s));
          await this.env.VOITHER_D1.batch(statements);
          console.log('D1 migration complete.');
        }
      } catch (e) {
        console.error("D1 migration check failed:", e);
      }
    } else {
      console.warn('D1 binding unavailable, skipping migration and sync.');
    }
    const storedSessions = await this.ctx.storage.get<Record<string, SessionInfo>>('sessions') || {};
    this.sessions = new Map(Object.entries(storedSessions));
    const storedReports = await this.ctx.storage.get<Record<string, string>>('reports') || {};
    this.reports = new Map(Object.entries(storedReports));
    const storedApiKeys = await this.ctx.storage.get<Record<string, string>>('apiKeys') || {};
    this.apiKeys = new Map(Object.entries(storedApiKeys));
    this.loaded = true;
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
    this.sessions.set(sessionId, { id: sessionId, title: title || `Chat ${new Date(now).toLocaleDateString()}`, createdAt: now, lastActive: now });
    await this.persistSessions();
  }
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      this.sessions.set(sessionId, session);
      await this.persistSessions();
    }
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
      if (this.env.VOITHER_D1) {
        try {
          await this.env.VOITHER_D1.prepare('DELETE FROM Sessions WHERE session_id = ?1').bind(sessionId).run();
        } catch (e) { console.error('Failed to delete session from D1:', e); }
      }
    }
    return deleted;
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }
  async setReportData(sessionId: string, data: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.sessions.has(sessionId)) {
      await this.addSession(sessionId, 'Novo Relatório');
    }
    this.reports.set(sessionId, data);
    await this.persistReports();
    if (this.env.VOITHER_D1) {
      try {
        const reportData = JSON.parse(data);
        const inputs = reportData.inputs || {};
        const patientId = inputs.patientId;
        const crm = inputs.crm;
        if (patientId && crm) {
          const patientResult = await this.env.VOITHER_D1.prepare(`SELECT id FROM Patients WHERE patient_id = ?1 AND crm = ?2`).bind(patientId, crm).first<{ id: string }>();
          const dbPatientId = patientResult?.id;
          if (dbPatientId) {
            const sessionUUID = crypto.randomUUID();
            await this.env.VOITHER_D1.prepare(`INSERT INTO Sessions (id, patient_id, session_id, title, stages, report, last_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch()) ON CONFLICT(session_id) DO UPDATE SET title=excluded.title, stages=excluded.stages, report=excluded.report, last_active=unixepoch()`).bind(sessionUUID, dbPatientId, sessionId, `Relatório para ${patientId}`, JSON.stringify(reportData.stages), data).run();
          }
        }
      } catch (e) {
        console.error('D1 Sync failed:', e);
      }
    }
  }
  async getReportData(sessionId: string): Promise<string | null> {
    await this.ensureLoaded();
    let report = this.reports.get(sessionId);
    if (report) return report;
    if (this.env.VOITHER_D1) {
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
      } catch (e) { console.error('D1 fallback failed:', e); }
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
  // WebRTC Signaling Logic
  async joinRoom(roomId: string, sessionId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { peers: new Set(), signals: [] };
    }
    room.peers.add(sessionId);
    this.rooms.set(roomId, room);
    return { success: true, peers: room.peers.size };
  }
  async leaveRoom(roomId: string, sessionId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.peers.delete(sessionId);
      if (room.peers.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    return { success: true };
  }
  async handleSignaling(roomId: string, data: any) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.signals.push(data);
      // In a real app, you'd broadcast this to other peers.
      // For this demo, we'll just store and clear.
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom) {
          currentRoom.signals.shift();
          if (currentRoom.signals.length === 0 && currentRoom.peers.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }, 300000); // 5 min TTL
    }
    return { success: true };
  }
  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();
    const url = new URL(request.url);
    if (url.pathname.startsWith('/webrtc')) {
      try {
        const { action, roomId, sessionId, data } = await request.json<any>();
        switch (action) {
          case 'join':
            return Response.json(await this.joinRoom(roomId || crypto.randomUUID(), sessionId));
          case 'leave':
            return Response.json(await this.leaveRoom(roomId, sessionId));
          case 'signal':
            return Response.json(await this.handleSignaling(roomId, data));
          default:
            return new Response('Invalid WebRTC action', { status: 400 });
        }
      } catch (e) {
        return new Response('Invalid JSON for WebRTC action', { status: 400 });
      }
    }
    return new Response('Not found', { status: 404 });
  }
}