import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession } from "./core-utils";
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
            const url = new URL(c.req.url);
            url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
            return agent.fetch(new Request(url.toString(), {
                method: c.req.method,
                headers: c.req.header(),
                body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
            }));
        } catch (error) {
            console.error('Agent routing error:', error);
            return c.json({ success: false, error: API_RESPONSES.AGENT_ROUTING_FAILED }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Session Management (DO-based for active sessions)
    app.get('/api/sessions', async (c) => {
        const controller = getAppController(c.env);
        const sessions = await controller.listSessions();
        return c.json({ success: true, data: sessions });
    });
    app.post('/api/sessions', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const { title, sessionId: providedSessionId, reportData } = body;
        const sessionId = providedSessionId || crypto.randomUUID();
        await registerSession(c.env, sessionId, title || 'Novo Relatório');
        if (reportData) {
            const controller = getAppController(c.env);
            await controller.setReportData(sessionId, reportData);
        }
        return c.json({ success: true, data: { sessionId, title } });
    });
    app.delete('/api/sessions/:sessionId', async (c) => {
        const sessionId = c.req.param('sessionId');
        const deleted = await unregisterSession(c.env, sessionId);
        if (!deleted) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
        return c.json({ success: true, data: { deleted: true } });
    });
    app.get('/api/sessions/:sessionId/data', async (c) => {
        const sessionId = c.req.param('sessionId');
        const controller = getAppController(c.env);
        const data = await controller.getReportData(sessionId);
        if (data === null) return c.json({ success: false, error: 'Report data not found' }, { status: 404 });
        try {
            return c.json({ success: true, data: JSON.parse(data) });
        } catch (e) {
            return c.json({ success: false, error: 'Stored data is not valid JSON.' }, { status: 500 });
        }
    });
    app.put('/api/sessions/:sessionId/data', async (c) => {
        const sessionId = c.req.param('sessionId');
        const { data } = await c.req.json();
        const dataString = JSON.stringify(data);
        if (dataString.length > 10 * 1024 * 1024) { // 10MB limit for recordings
            return c.json({ success: false, error: 'Invalid or oversized data payload' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        await controller.setReportData(sessionId, dataString);
        return c.json({ success: true });
    });
    // Patient Management (D1-based)
    app.get('/api/patients', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database connection unavailable.' }, { status: 503 });
        try {
            const { results } = await c.env.VOITHER_D1.prepare(`SELECT id, patient_id, name, context, crm, updated_at, (SELECT COUNT(*) FROM Sessions WHERE Sessions.patient_id = Patients.id) as session_count FROM Patients ORDER BY updated_at DESC`).run();
            return c.json({ success: true, data: results });
        } catch (e: any) {
            console.error('Failed to fetch patients:', e);
            return c.json({ success: false, error: 'Database query failed' }, { status: 500 });
        }
    });
    app.get('/api/patients/:id', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database connection unavailable.' }, { status: 503 });
        const patientId = c.req.param('id');
        try {
            const patient = await c.env.VOITHER_D1.prepare('SELECT * FROM Patients WHERE id = ?1').bind(patientId).first();
            if (!patient) return c.json({ success: false, error: 'Patient not found' }, { status: 404 });
            const { results: sessions } = await c.env.VOITHER_D1.prepare('SELECT session_id, title, last_active, report FROM Sessions WHERE patient_id = ?1 ORDER BY last_active DESC').bind(patientId).run();
            return c.json({ success: true, data: { patient, sessions } });
        } catch (e: any) {
            console.error(`Failed to fetch patient ${patientId}:`, e);
            return c.json({ success: false, error: 'Database query failed' }, { status: 500 });
        }
    });
    app.post('/api/patients', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database connection unavailable.' }, 503);
        const { patient_id, name, context, crm, metadata } = await c.req.json();
        if (!patient_id || !name || !crm) return c.json({ success: false, error: 'Required fields: patient_id, name, crm' }, 400);
        try {
            const uuid = crypto.randomUUID();
            const result = await c.env.VOITHER_D1.prepare(`INSERT INTO Patients (id, patient_id, name, context, crm, metadata, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch(), unixepoch()) ON CONFLICT(patient_id, crm) DO UPDATE SET name=excluded.name, context=excluded.context, metadata=excluded.metadata, updated_at=unixepoch() RETURNING id`).bind(uuid, patient_id, name, context || '', crm, JSON.stringify(metadata || {})).first<{ id: string }>();
            if (result?.id) {
                return c.json({ success: true, data: { id: result.id } });
            }
            const existing = await c.env.VOITHER_D1.prepare('SELECT id FROM Patients WHERE patient_id = ?1 AND crm = ?2').bind(patient_id, crm).first<{ id: string }>();
            return c.json({ success: true, data: { id: existing?.id } });
        } catch (e) {
            console.error('D1 insert error:', e);
            return c.json({ success: false, error: 'Database error' }, 500);
        }
    });
    app.put('/api/patients/:id', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database unavailable' }, 503);
        const patientId = c.req.param('id');
        const { name, context, metadata } = await c.req.json();
        if (!name) return c.json({ success: false, error: 'Name required' }, 400);
        try {
            const info = await c.env.VOITHER_D1.prepare('UPDATE Patients SET name=?1, context=?2, metadata=?3, updated_at=unixepoch() WHERE id=?4').bind(name, context || '', JSON.stringify(metadata || {}), patientId).run();
            if (info.changes === 0) return c.json({ success: false, error: 'Patient not found' }, 404);
            return c.json({ success: true });
        } catch (e) {
            return c.json({ success: false, error: 'Database error' }, 500);
        }
    });
    app.delete('/api/patients/:id', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database unavailable' }, 503);
        const patientId = c.req.param('id');
        try {
            const info = await c.env.VOITHER_D1.prepare('DELETE FROM Patients WHERE id=?1').bind(patientId).run();
            return c.json({ success: info.changes > 0 });
        } catch (e) {
            return c.json({ success: false, error: 'Database error' }, 500);
        }
    });
    // WebRTC Signaling (placeholder)
    app.post('/api/webrtc/:type/:sessionId', async (c) => {
        const { type, sessionId } = c.req.param();
        const body = await c.req.json();
        const controller = getAppController(c.env);
        // This is a simplified signaling mechanism using a DO.
        // In a production scenario, you'd use a more robust system like WebSockets or a dedicated service.
        await controller.signal(sessionId, { type, ...body });
        return c.json({ success: true });
    });
}