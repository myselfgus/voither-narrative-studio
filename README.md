# Voither Narrative Studio
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/myselfgus/voither-narrative-studio)
Voither Narrative Studio is a polished web application built with Cloudflare Workers that enables healthcare professionals to upload pre-formatted clinical JSON data, validate and enrich it using an orchestrated LLM via the Cloudflare AI Gateway (alias: "voither"), and generate multi-page, print-ready A4 PDF reports. The system emphasizes a separate cover page and body pages with persistent headers and footers, ensuring compliance with medical documentation standards.
This project provides an intuitive interface for JSON upload, LLM-driven content normalization, inline editing, live A4 preview, and seamless PDF export. It leverages Cloudflare's edge infrastructure for secure, scalable AI processing without exposing API keys to the client.
## Features
- **JSON Upload & Validation**: Securely upload and locally validate structured clinical JSON (patient metadata, sessions, etc.) before AI processing.
- **LLM Orchestration**: Integrate with Cloudflare AI Gateway ("voither") for content enrichment, field completion, language normalization, and structuring into narrative sections/subsections.
- **Report Builder**: Editable structured editor for metadata, sections, and content blocks; live WYSIWYG A4 preview with separate cover page and header/footer on body pages.
- **PDF Export**: Client-side print preview and export using html2pdf.js or window.print fallback, optimized for A4 printing with proper pagination and fonts.
- **Persistent Storage**: Uses Cloudflare D1 for long-term storage of patient and session data, and Durable Objects for active session management.
- **Patient Management**: Centralized directory to view all patients and their associated reports.
- **Responsive UI**: Mobile-first design with shadcn/ui components, Tailwind CSS, and framer-motion for smooth interactions.
- **Security & Compliance**: All AI calls routed through Workers; no client-side API key exposure; built-in error handling and validation.
- **AI Limits Notice**: Clear indicators for Cloudflare AI request limits to manage usage.
## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS (v3), shadcn/ui, framer-motion, lucide-react, sonner (toasts), date-fns.
- **Backend**: Cloudflare Workers, Hono (routing), Agents SDK (Durable Objects), OpenAI SDK (via AI Gateway).
- **Database**: Cloudflare D1 for SQL-based persistence.
- **State Management**: Zustand (client-side slices).
- **AI Integration**: Cloudflare AI Gateway with MCP (Model Context Protocol) support.
- **PDF Handling**: html2pdf.js (client-side export).
- **TypeScript**: Full type safety with Zod validation.
- **Deployment**: Cloudflare Workers for edge deployment.
## Quick Start
### Prerequisites
- Node.js (v18+) or Bun (recommended for faster setup).
- Cloudflare account with Workers enabled.
- Wrangler CLI installed and configured.
- Configure environment variables: `CF_AI_BASE_URL` (your AI Gateway URL) and `CF_AI_API_KEY` (your API key).
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
     "CF_AI_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai"
   }
   ```
4. **Create and Bind D1 Database**:
   ```sh
   # Create the D1 database
   npx wrangler d1 create voither-d1
   # The command will output the binding configuration. Add it to your wrangler.jsonc file:
   "d1_databases": [
     {
       "binding": "VOITHER_D1",
       "database_name": "voither-d1",
       "database_id": "your-database-id"
     }
   ]
   # Run the database migrations
   npx wrangler d1 execute voither-d1 --file=./worker/migrations.sql
   ```
5. Generate TypeScript types for Workers:
   ```
   bun run cf-typegen
   ```
## Usage
### Local Development
Start the development server:
```
bun run dev
```
The app will be available at `http://localhost:3000`.
### API Endpoints
- `POST /api/chat/:sessionId/chat`: Send orchestration prompt with JSON data.
- `GET /api/sessions`: List active sessions from Durable Object.
- `GET /api/patients`: List all patients from D1.
- `GET /api/patients/:id`: Get a specific patient and their sessions from D1.
Sessions are managed via Durable Objects (AppController) and persisted to D1.
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
1.  Navigate to the **Builder** page.
2.  Fill in the form and start an analysis.
3.  Once complete, the session is saved automatically to D1.
4.  Navigate to the **Patients** page to see the newly created patient record.
5.  Click "View Dashboard" to see the session associated with that patient.
6.  Export the PDF from the dashboard or the exports page.
## Code Quality
Run ESLint to check for code quality issues:
```sh
bun run lint
```
To automatically fix issues:
```sh
bun run lint:fix
```
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/myselfgus/voither-narrative-studio)
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