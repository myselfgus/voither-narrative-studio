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
async function fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:${file.type};base64,${base64}`;
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Health Checks
    app.get('/api/health/d1', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ status: 'Unavailable' });
        try {
            await c.env.VOITHER_D1.prepare('SELECT 1').first();
            return c.json({ status: 'Connected', lastPing: new Date().toISOString() });
        } catch (e: any) {
            console.error("D1 Health Check Failed:", e);
            return c.json({ status: 'Error', error: e.message }, { status: 500 });
        }
    });
    app.get('/api/health/r2', async (c) => {
        if (!c.env.VOITHER_R2) return c.json({ status: 'Unavailable' });
        try {
            await c.env.VOITHER_R2.put('health-check.txt', 'ok');
            await c.env.VOITHER_R2.head('health-check.txt');
            return c.json({ status: 'Connected', lastPing: new Date().toISOString() });
        } catch (e: any) {
            console.error("R2 Health Check Failed:", e);
            return c.json({ status: 'Error', error: e.message }, { status: 500 });
        }
    });
    app.get('/api/health/ai', async (c) => {
        if (!c.env.CF_AI_BASE_URL || !c.env.CF_AI_API_KEY) return c.json({ status: 'Unavailable' });
        try {
            const response = await fetch(c.env.CF_AI_BASE_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${c.env.CF_AI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: '@cf/meta/llama-3-8b-instruct',
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                })
            });
            return c.json({ status: response.ok ? 'Connected' : 'Error', lastPing: new Date().toISOString() });
        } catch (e: any) {
            console.error("AI Gateway Health Check Failed:", e);
            return c.json({ status: 'Error', error: e.message }, { status: 500 });
        }
    });
    // Session Management
    app.get('/api/sessions', async (c) => {
        const controller = getAppController(c.env);
        const sessions = await controller.listSessions();
        return c.json({ success: true, data: sessions });
    });
    app.post('/api/sessions', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const { title, sessionId: providedSessionId, reportData, patient_id } = body;
        const sessionId = providedSessionId || crypto.randomUUID();
        await registerSession(c.env, sessionId, title || 'Novo Relatório');
        if (reportData) {
            const controller = getAppController(c.env);
            await controller.setReportData(sessionId, reportData, patient_id);
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
        if (dataString.length > 10 * 1024 * 1024) {
            return c.json({ success: false, error: 'Invalid or oversized data payload' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        await controller.setReportData(sessionId, dataString);
        return c.json({ success: true });
    });
    // Patient Management
    app.get('/api/patients', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database connection unavailable.' }, { status: 503 });
        try {
            const { results } = await c.env.VOITHER_D1.prepare(`SELECT id, patient_id, name, context, crm, created_at, updated_at, (SELECT COUNT(*) FROM Sessions WHERE Sessions.patient_id = Patients.id) as session_count FROM Patients ORDER BY updated_at DESC`).run();
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
    app.get('/api/patients/:id/health', async (c) => {
        if (!c.env.VOITHER_D1) return c.json({ success: false, error: 'Database unavailable' }, 503);
        const patientId = c.req.param('id');
        try {
            const sessionCountResult = await c.env.VOITHER_D1.prepare('SELECT COUNT(*) as count FROM Sessions WHERE patient_id = ?1').bind(patientId).first<{ count: number }>();
            const reportsResult = await c.env.VOITHER_D1.prepare('SELECT report FROM Sessions WHERE patient_id = ?1').bind(patientId).all<{ report: string }>();
            let recordingCount = 0;
            if (reportsResult.results) {
                for (const row of reportsResult.results) {
                    try {
                        const report = JSON.parse(row.report);
                        const recordings = report?.report?.recordings || report?.recordings || [];
                        recordingCount += Array.isArray(recordings) ? recordings.length : 0;
                    } catch { /* Gracefully fail */ }
                }
            }
            return c.json({ success: true, data: { sessions: sessionCountResult?.count || 0, recordings: recordingCount } });
        } catch (e) {
            console.error(`Failed to get health for patient ${patientId}:`, e);
            return c.json({ success: false, error: 'Database query failed' }, 500);
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
    // WebRTC Signaling
    app.post('/api/webrtc/join/:roomId?', async (c) => {
        const roomId = c.req.param('roomId') || crypto.randomUUID();
        const sessionId = c.req.query('sessionId');
        const controller = getAppController(c.env);
        await controller.fetch(new Request('http://dummy/webrtc', { method: 'POST', body: JSON.stringify({ action: 'join', roomId, sessionId }), headers: { 'Content-Type': 'application/json' } }));
        return c.json({ success: true, roomId, iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }], token: btoa(sessionId || '') });
    });
    // R2 Video Upload
    app.put('/api/video/:patientId/upload', async (c) => {
        const patientId = c.req.param('patientId');
        if (!patientId) return c.json({ success: false, error: 'Patient ID is required for upload' }, 400);
        const formData = await c.req.formData();
        const file = formData.get('video') as File;
        if (!file || file.size > 50 * 1024 * 1024) {
            return c.json({ success: false, error: 'Invalid file or file too large' }, 400);
        }
        const buffer = await file.arrayBuffer();
        if (!c.env.VOITHER_R2 || !c.env.R2_PUBLIC_ID) {
            console.warn("R2 binding not available. Falling back to base64 data URL.");
            const base64 = await fileToBase64(file);
            return c.json({ success: true, url: base64, uuid: crypto.randomUUID() });
        }
        try {
            const key = `video-calls/${patientId}/${crypto.randomUUID()}.webm`;
            await c.env.VOITHER_R2.put(key, buffer, { httpMetadata: { contentType: file.type } });
            const publicUrl = `https://pub-${c.env.R2_PUBLIC_ID}.r2.dev/${key}`;
            return c.json({ success: true, url: publicUrl, uuid: key.split('/').pop()?.split('.')[0] || crypto.randomUUID() });
        } catch (e) {
            console.error("R2 upload failed:", e);
            return c.json({ success: false, error: "Failed to upload video" }, 500);
        }
    });
    // Admin Terminal
    app.post('/api/terminal', async (c) => {
        const { command } = await c.req.json();
        const sanitizedCommand = String(command).trim();
        const adminKey = (c.env as any).ADMIN_KEY; // Assuming ADMIN_KEY is set in env
        if (adminKey && c.req.header('Authorization') !== adminKey) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        try {
            if (sanitizedCommand.toLowerCase().startsWith('select') && (sanitizedCommand.toLowerCase().includes('patients') || sanitizedCommand.toLowerCase().includes('sessions'))) {
                const stmt = c.env.VOITHER_D1.prepare(sanitizedCommand);
                const { results } = await stmt.all();
                return c.json({ success: true, output: JSON.stringify(results, null, 2) });
            }
            if (sanitizedCommand === 'ls r2') {
                if (!c.env.VOITHER_R2) return c.json({ success: false, error: 'R2 not configured' });
                const listed = await c.env.VOITHER_R2.list();
                const output = listed.objects.map(obj => `${obj.key}\t${obj.size} bytes`).join('\n');
                return c.json({ success: true, output: output || 'Bucket is empty.' });
            }
            if (sanitizedCommand === 'logs') {
                const controller = getAppController(c.env);
                const logs = await controller.getLogs();
                return c.json({ success: true, output: logs.join('\n') });
            }
            return c.json({ success: false, error: 'Invalid or disallowed command.' });
        } catch (e: any) {
            return c.json({ success: false, error: e.message });
        }
    });
}