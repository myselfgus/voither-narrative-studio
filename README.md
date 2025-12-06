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
### Database & Storage Setup
1.  **Create D1 Database**:
    ```sh
    # Create the D1 database
    wrangler d1 create voither-d1
    # The command will output the binding configuration. Add the `database_id` to your wrangler.jsonc file.
    # Run the database migrations
    wrangler d1 execute voither-d1 --file=./worker/migrations.sql
    ```
2.  **Create R2 Bucket**:
    ```sh
    # Create the R2 bucket
    wrangler r2 bucket create voither-videos
    # Make the bucket public for video playback (optional, requires custom domain for production)
    # Update wrangler.jsonc with the bucket_name.
    ```
3.  **Set Production Secrets**:
    ```sh
    # Set your AI Gateway API key
    wrangler secret put CF_AI_API_KEY --env production
    # Set a key for accessing the admin terminal
    wrangler secret put ADMIN_KEY --env production
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
The app will be available at `http://localhost:3000`.
## Deployment
Deploy to Cloudflare Workers for development preview:
1. Ensure `wrangler.jsonc` is configured with your account ID and bindings.
2. Build the frontend:
   ```
   bun run build
   ```
3. Deploy:
   ```
   wrangler deploy
   ```
### Production Deployment
For a production environment, use the `--env production` flag to use secrets.
```sh
wrangler deploy --env production
```
### E2E Flow Simulation
To test the end-to-end flow:
1.  **JSON Flow**: Navigate to the **PDF Generator**. Upload a valid JSON. The patient should be created/updated in D1. Click "Enrich" (or "Preview Raw"). Export the PDF. Check the **Patients** dashboard to see the new record.
2.  **Video Flow**: Navigate to the **Video Wall**. Create a new patient if needed. Start a call, then hang up. The recording will be uploaded to R2, and a session linking to it will be created in D1. View the recording in the **Patient Dashboard**.
## Code Quality
Run ESLint to check for code quality issues:
```sh
bun run lint
```
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/myselfgus/voither-narrative-studio)
## License
MIT License. See [LICENSE](LICENSE) for details.