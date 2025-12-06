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
        if (dataString.length > 1024 * 1024) { // 1MB limit
            return c.json({ success: false, error: 'Invalid or oversized data payload' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        await controller.setReportData(sessionId, dataString);
        return c.json({ success: true });
    });
    // Patient Management (D1-based)
    app.get('/api/patients', async (c) => {
        try {
            const { results } = await c.env.VOITHER_D1.prepare(
                `SELECT id, patient_id, name, context, crm, updated_at,
                 (SELECT COUNT(*) FROM Sessions WHERE Sessions.patient_id = Patients.id) as session_count
                 FROM Patients ORDER BY updated_at DESC`
            ).run();
            return c.json({ success: true, data: results });
        } catch (e: any) {
            console.error('Failed to fetch patients:', e);
            return c.json({ success: false, error: 'Database query failed' }, { status: 500 });
        }
    });
    app.get('/api/patients/:id', async (c) => {
        const patientId = c.req.param('id');
        try {
            const patient = await c.env.VOITHER_D1.prepare('SELECT * FROM Patients WHERE id = ?1').bind(patientId).first();
            if (!patient) {
                return c.json({ success: false, error: 'Patient not found' }, { status: 404 });
            }
            const { results: sessions } = await c.env.VOITHER_D1.prepare(
                'SELECT session_id, title, last_active, report FROM Sessions WHERE patient_id = ?1 ORDER BY last_active DESC'
            ).bind(patientId).run();
            return c.json({ success: true, data: { patient, sessions } });
        } catch (e: any) {
            console.error(`Failed to fetch patient ${patientId}:`, e);
            return c.json({ success: false, error: 'Database query failed' }, { status: 500 });
        }
    });
    // API Key Management
    app.post('/api/user/apikey', async (c) => {
        const { sessionId, key } = await c.req.json();
        if (!sessionId || !key) {
            return c.json({ success: false, error: 'sessionId and key are required' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        const result = await controller.setApiKey(sessionId, key);
        return c.json(result, result.success ? 200 : 400);
    });
    app.get('/api/user/apikey', async (c) => {
        const sessionId = c.req.query('sessionId');
        if (!sessionId) {
            return c.json({ success: false, error: 'sessionId is required' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        const key = await controller.getApiKey(sessionId, true); // Always masked for client
        return c.json({ success: true, data: { key } });
    });
}