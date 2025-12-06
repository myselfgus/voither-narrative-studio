/**
 * reportHtml.ts
 *
 * Generates a full, print-ready HTML string for a NarrativeReportData object.
 * The output includes a separate cover page (print-break-after-page) and the
 * body pages which include a persistent header and footer. Fonts used:
 * Josefin Sans, Space Grotesk, Roboto Mono (loaded from Google Fonts).
 *
 * This file exports a single named function: generateReportHtml
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NarrativeReportData, Section, Subsection, ContentBlock } from '@/types/report';
/**
 * Escape HTML content to avoid breaking the generated HTML
 * @param str possible unsafe string
 */
function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
/**
 * Generate HTML for a single content block
 */
function renderContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `<p class="paragraph">${escapeHtml(Array.isArray(block.content) ? block.content.join(' ') : block.content)}</p>`;
    case 'quote':
      return `<div class="quote">"${escapeHtml(String(block.content))}"</div>`;
    case 'list': {
      const items = Array.isArray(block.content)
        ? block.content.map(item => `<li>${escapeHtml(item)}</li>`).join('\n')
        : `<li>${escapeHtml(String(block.content))}</li>`;
      return `<ul class="list">${items}</ul>`;
    }
    default:
      return '';
  }
}
/**
 * Render a subsection (title + blocks)
 */
function renderSubsection(sub: Subsection): string {
  const blocksHtml = (sub.blocks || []).map(renderContentBlock).join('\n');
  return `
    <div class="subsection print-break-inside-avoid">
      <div class="subsection-title">
        <div class="subsection-line"></div>
        <span class="subsection-text">${escapeHtml(sub.title)}</span>
      </div>
      ${blocksHtml}
    </div>
  `;
}
/**
 * Render a Section including intro blocks and subsections
 */
function renderSection(section: Section): string {
  const introHtml = (section.intro || []).map(renderContentBlock).join('\n');
  const subsHtml = (section.subsections || []).map(renderSubsection).join('\n');
  return `
    <section class="report-section print-break-inside-avoid">
      <div class="section-title">
        <span>${escapeHtml(section.title)}</span>
        <div class="section-marker"></div>
      </div>
      <div class="section-body">
        ${introHtml}
        ${subsHtml}
      </div>
    </section>
  `;
}
/**
 * Generate the cover page HTML
 */
function generateCoverHtml(data: NarrativeReportData): string {
  const dateFormatted = (() => {
    try {
      const d = new Date(data.metadata.data_analise);
      return isNaN(d.getTime())
        ? escapeHtml(String(data.metadata.data_analise || ''))
        : escapeHtml(format(d, 'dd "de" MMMM yyyy', { locale: ptBR }));
    } catch {
      return escapeHtml(String(data.metadata.data_analise || ''));
    }
  })();
  return `
  <div class="cover-page print-break-after-page">
    <div class="cover-inner">
      <header class="cover-header">
        <h1 class="brand">
          <span class="brand-voither">VOITHER</span><span class="brand-healthos">HealthOS</span>
        </h1>
        <div class="bar" aria-hidden="true"></div>
      </header>
      <div class="cover-middle">
        <div class="doc-type">RELATÓRIO NARRATIVO</div>
        <h2 class="title">${escapeHtml(data.reportTitle)}</h2>
        <div class="quote">"${escapeHtml(data.keyQuote)}"</div>
      </div>
      <div class="cover-bottom">
        <div class="meta-grid">
          <div class="meta-left">
            <div class="meta-label">PACIENTE</div>
            <div class="meta-value">${escapeHtml(data.metadata.paciente_id)}</div>
            <div class="meta-sub">${escapeHtml(data.metadata.contexto)}</div>
          </div>
          <div class="meta-right">
            <div class="meta-label">MÉDICO RESPONSÁVEL</div>
            <div class="meta-value">${escapeHtml(data.metadata.medico_responsavel)}</div>
            <div class="meta-sub">${escapeHtml(data.metadata.crm)}</div>
          </div>
        </div>
        <div class="meta-date">${dateFormatted}</div>
      </div>
    </div>
  </div>
  `;
}
/**
 * Header HTML snippet to be included on each body page
 */
function generateHeaderHtml(data: NarrativeReportData): string {
  const dateText = (() => {
    try {
      const d = new Date(data.metadata.data_analise);
      return isNaN(d.getTime()) ? escapeHtml(String(data.metadata.data_analise || '')) : escapeHtml(format(d, "dd/MM/yyyy", { locale: ptBR }));
    } catch {
      return escapeHtml(String(data.metadata.data_analise || ''));
    }
  })();
  return `
  <header class="header">
    <div class="header-brand">
      <span class="header-voither">VOITHER</span><span class="header-healthos">HealthOS</span>
    </div>
    <div class="header-meta">${escapeHtml(data.metadata.paciente_id)} • ${dateText}</div>
  </header>
  `;
}
/**
 * Footer HTML snippet to be included on each body page
 */
function generateFooterHtml(data: NarrativeReportData): string {
  return `
  <footer class="footer">
    <div class="footer-left">
      <div class="footer-name">${escapeHtml(data.metadata.medico_responsavel)}</div>
      <div class="footer-crm">${escapeHtml(data.metadata.crm)}</div>
      <div class="footer-role">MÉDICO PSIQUIATRA</div>
    </div>
    <div class="footer-right">
      <div class="footer-brand">VOITHER HEALTHOS</div>
      <div class="footer-engine">NARRATIVE ENGINE V1 • ${new Date().getFullYear()}</div>
    </div>
  </footer>
  `;
}
/**
 * Full page CSS (inline) for consistent PDF rendering.
 * Keep styles self-contained to avoid relying on external Tailwind at print time.
 */
const baseStyles = `
  /* Reset & base */
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Roboto Mono", monospace; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Fonts loaded via Google link in head */
  @page { size: A4; margin: 0; }
  .cover-page { width: 210mm; height: 297mm; display: flex; align-items: stretch; }
  .cover-inner { padding: 20mm; display: flex; flex-direction: column; justify-content: space-between; width: 100%; background: #ffffff; }
  .brand { font-family: "Josefin Sans", sans-serif; font-weight: 700; font-size: 40px; margin: 0; color: #0f172a; }
  .brand-healthos { font-family: "Space Grotesk", sans-serif; font-weight: 300; margin-left: 8px; color: #cbd5e1; font-size: 26px; }
  .bar { width: 80px; height: 6px; background: #0f172a; margin-top: 12px; margin-bottom: 24px; }
  .doc-type { font-family: "Roboto Mono", monospace; font-size: 10px; letter-spacing: 0.3em; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; }
  .title { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 42px; color: #0f172a; line-height: 1.05; margin: 0 0 18px 0; }
  .quote { font-family: "Roboto Mono", monospace; font-size: 16px; font-style: italic; color: #334155; border-left: 3px solid #cbd5e1; padding-left: 14px; margin: 0 0 36px 0; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .meta-label { font-family: "Roboto Mono", monospace; font-size: 10px; color: #94a3b8; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 6px; }
  .meta-value { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 20px; color: #0f172a; }
  .meta-sub { font-family: "Roboto Mono", monospace; font-size: 12px; color: #334155; }
  /* Body pages - ensure header+footer stay visually separated and content paged */
  .body-page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; page-break-inside: avoid; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 18px; }
  .header-voither { font-family: "Josefin Sans", sans-serif; font-weight: 700; font-size: 18px; color: #0f172a; }
  .header-healthos { font-family: "Space Grotesk", sans-serif; font-weight: 400; color: #334155; margin-left: 8px; }
  .header-meta { font-family: "Roboto Mono", monospace; font-size: 12px; color: #94a3b8; }
  .content { flex: 1 1 auto; }
  .section-title { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 18px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
  .section-marker { width: 8px; height: 8px; background: #0f172a; }
  .paragraph { font-family: "Roboto Mono", monospace; font-size: 13px; color: #0f172a; line-height: 1.8; text-align: justify; margin-bottom: 18px; }
  .quote { font-family: "Roboto Mono", monospace; font-size: 15px; font-style: italic; color: #0f172a; border-left: 4px solid #0f172a; padding: 12px 16px; background: #f8fafc; margin: 18px 0; line-height: 1.6; }
  .list { margin: 10px 0 18px 20px; font-family: "Roboto Mono", monospace; font-size: 13px; color: #0f172a; }
  .subsection-title { display: flex; align-items: center; gap: 12px; margin-top: 28px; margin-bottom: 16px; }
  .subsection-line { width: 24px; height: 1px; background: #94a3b8; }
  .subsection-text { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 14px; color: #334155; }
  .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #94a3b8; }
  .footer-name { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 14px; text-transform: uppercase; color: #0f172a; }
  .footer-crm { font-family: "Roboto Mono", monospace; font-size: 11px; color: #94a3b8; }
  .footer-role { font-family: "Roboto Mono", monospace; font-size: 10px; color: #94a3b8; text-transform: uppercase; }
  /* Print helpers */
  .print-break-after-page { page-break-after: always; }
  .print-break-inside-avoid { break-inside: avoid; }
`;
/**
 * Main export - generate a complete HTML string representing the report.
 *
 * @param data NarrativeReportData
 * @returns string full HTML
 */
export function generateReportHtml(data: NarrativeReportData): string {
  // Build sections HTML
  const sectionsHtml = (data.sections || []).map(renderSection).join('\n');
  // Compose body pages: header + content + footer inside a body-page container
  const headerHtml = generateHeaderHtml(data);
  const footerHtml = generateFooterHtml(data);
  // The content area can contain many sections; we will split into pages by relying
  // on CSS page breaks. Here we put all body content inside a single content wrapper.
  const bodyContent = `
    <div class="body-page">
      ${headerHtml}
      <main class="content">
        ${sectionsHtml}
      </main>
      ${footerHtml}
    </div>
  `;
  // Cover
  const coverHtml = generateCoverHtml(data);
  // Full HTML
  const full = `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Relatório - ${escapeHtml(data.metadata.paciente_id)}</title>
      <!-- Google Fonts -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&family=Space+Grotesk:wght@400;500;700&family=Roboto+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div id="report-root" style="background: #fff; width: 210mm; margin: 0 auto;">
        ${coverHtml}
        ${bodyContent}
      </div>
    </body>
  </html>
  `;
  return full;
}