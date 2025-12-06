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
    // Get report data for a session
    app.get('/api/sessions/:sessionId/data', async (c) => {
        const sessionId = c.req.param('sessionId');
        const controller = getAppController(c.env);
        const data = await controller.getReportData(sessionId);
        if (data === null) return c.json({ success: false, error: 'Report data not found' }, { status: 404 });
        try {
            // Attempt to parse to ensure it's valid JSON before sending
            JSON.parse(data);
            return c.json({ success: true, data: JSON.parse(data) });
        } catch (e) {
            // If it's not JSON, it might be legacy string data.
            // For robustness, we can wrap it or handle it, but for now, we'll return an error for consistency.
            return c.json({ success: false, error: 'Stored data is not valid JSON.' }, { status: 500 });
        }
    });
    // Update report data for a session
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
}