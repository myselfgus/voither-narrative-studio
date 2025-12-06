# Voither Narrative Studio
[cloudflarebutton]
Voither Narrative Studio is a polished web application built with Cloudflare Workers that enables healthcare professionals to upload pre-formatted clinical JSON data, validate and enrich it using an orchestrated LLM via the Cloudflare AI Gateway (alias: "voither"), and generate multi-page, print-ready A4 PDF reports. The system emphasizes a separate cover page and body pages with persistent headers and footers, ensuring compliance with medical documentation standards.
This project provides an intuitive interface for JSON upload, LLM-driven content normalization, inline editing, live A4 preview, and seamless PDF export. It leverages Cloudflare's edge infrastructure for secure, scalable AI processing without exposing API keys to the client.
## Features
- **JSON Upload & Validation**: Securely upload and locally validate structured clinical JSON (patient metadata, sessions, etc.) before AI processing.
- **LLM Orchestration**: Integrate with Cloudflare AI Gateway ("voither") for content enrichment, field completion, language normalization, and structuring into narrative sections/subsections.
- **Report Builder**: Editable structured editor for metadata, sections, and content blocks; live WYSIWYG A4 preview with separate cover page and header/footer on body pages.
- **PDF Export**: Client-side print preview and export using html2pdf.js or window.print fallback, optimized for A4 printing with proper pagination and fonts.
- **Session Management**: Persistent sessions via Durable Objects for history, re-runs, and quick access to previous reports.
- **Responsive UI**: Mobile-first design with shadcn/ui components, Tailwind CSS, and framer-motion for smooth interactions.
- **Security & Compliance**: All AI calls routed through Workers; no client-side API key exposure; built-in error handling and validation.
- **AI Limits Notice**: Clear indicators for Cloudflare AI request limits to manage usage.
## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS (v3), shadcn/ui, framer-motion, lucide-react, sonner (toasts), date-fns.
- **Backend**: Cloudflare Workers, Hono (routing), Agents SDK (Durable Objects), OpenAI SDK (via AI Gateway).
- **State Management**: Zustand (client-side slices).
- **AI Integration**: Cloudflare AI Gateway with MCP (Model Context Protocol) support; tools for web search and weather (extensible).
- **PDF Handling**: html2pdf.js (client-side export).
- **TypeScript**: Full type safety with Zod validation.
- **Deployment**: Cloudflare Workers for edge deployment.
## Quick Start
### Prerequisites
- Node.js (v18+) or Bun (recommended for faster setup).
- Cloudflare account with Workers enabled.
- Configure environment variables: `CF_AI_BASE_URL` (your AI Gateway URL) and `CF_AI_API_KEY` (your API key). Optional: `SERPAPI_KEY` for web search tools.
### Installation
1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd voither-narrative-studio
   ```
2. Install dependencies using Bun:
   ```
   bun install
   ```
3. Set up environment variables in `wrangler.jsonc` (under `vars`):
   ```
   "vars": {
     "CF_AI_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai",
     "CF_AI_API_KEY": "{your_api_key}"
   }
   ```
4. Generate TypeScript types for Workers:
   ```
   bun run cf-typegen
   ```
## Usage
### Local Development
Start the development server:
```
bun run dev
```
The app will be available at `http://localhost:3000`. Upload a sample JSON file (structured with fields like `paciente_id`, `contexto`, `data_analise`, etc.) via the home page to test the workflow:
1. **Upload JSON**: Select a file or paste content. Local validation checks schema compliance.
2. **Run LLM Enrichment**: Click "Validate & Enrich" to send to `/api/chat/:sessionId/chat` with model="voither". Watch streaming progress in the preview.
3. **Edit & Preview**: Modify fields in the left editor; right pane shows live A4 preview (cover separate, body with headers/footers).
4. **Export PDF**: Use "Preview for PDF" to open a print-friendly window or direct download.
### API Endpoints
- `POST /api/chat/:sessionId/chat`: Send orchestration prompt with JSON data (body: `{message: prompt, model: "voither", data: json}`).
- `GET /api/sessions`: List saved sessions.
- `POST /api/sessions`: Create new session.
- `DELETE /api/sessions/:sessionId`: Delete session.
- `POST /api/user/apikey`: Securely store an API key for a session.
Sessions are managed via Durable Objects (AppController). AI calls use the "voither" gateway alias for orchestrated LLM processing.
## Deployment
Deploy to Cloudflare Workers for production:
1. Ensure `wrangler.jsonc` is configured with your account ID and bindings.
2. Build the frontend:
   ```
   bun run build
   ```
3. Deploy:
   ```
   bun run deploy
   ```
   Or use Wrangler CLI:
   ```
   npx wrangler deploy
   ```
The app will be live at `https://{project-name}.{account_id}.workers.dev`. Assets are served via Cloudflare's SPA handling.
### Production Deployment
For a production environment, it's recommended to use secrets for sensitive data like API keys.
1.  **Set Secret**:
    ```sh
    npx wrangler secret put CF_AI_API_KEY --env production
    ```
2.  **Deploy to Production**:
    ```sh
    bun run deploy:prod
    ```
### E2E Flow Simulation
To test the end-to-end flow:
1.  Navigate to the **PDF Generator** page.
2.  Upload a valid `sample.json` file.
3.  Click **Enrich with AI** and wait for completion.
4.  Optionally, edit the generated report.
5.  Click **Export PDF** and verify the downloaded file.
6.  Navigate to the **Exports** page to see the saved session and download artifacts.
7.  Check the browser console for any errors. API keys are handled server-side and should not be visible.
## Code Quality
Run ESLint to check for code quality issues:
```sh
bun run lint
```
To automatically fix issues:
```sh
bun run lint:fix
```
[cloudflarebutton]
### Environment Variables in Production
Set via Cloudflare Dashboard (Workers > Settings > Variables & Secrets):
- `CF_AI_BASE_URL`: Your AI Gateway endpoint.
- `CF_AI_API_KEY`: Securely stored as a secret.
### Monitoring
Use Cloudflare's built-in observability for Worker logs and metrics. AI usage is rate-limited; monitor via the dashboard.
## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.
Follow TypeScript and ESLint rules. Focus on visual excellence and responsive design.
## License
MIT License. See [LICENSE](LICENSE) for details.