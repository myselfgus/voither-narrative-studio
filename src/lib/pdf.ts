import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { NarrativeReportData } from '@/types/report';
import { renderToString } from 'react-dom/server';
import React from 'react';
import {
  CoverPage,
  Header,
  Footer,
  SectionRenderer,
} from '@/components/ReportPreview';
import { PipelineStage } from '@/components/PipelineStages';
import { TranscriptionInputs } from '@/components/TranscriptionInput';
const generateReportHTML = (data: NarrativeReportData): string => {
  const coverHTML = renderToString(React.createElement(CoverPage, { data }));
  const bodyContentHTML = data.sections.map((section, idx) =>
    renderToString(React.createElement(SectionRenderer, { key: idx, section }))
  ).join('');
  const headerHTML = renderToString(React.createElement(Header, { patientId: data.metadata.paciente_id, date: data.metadata.data_analise }));
  const footerHTML = renderToString(React.createElement(Footer, { doctor: data.metadata.medico_responsavel, crm: data.metadata.crm }));
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório - ${data.metadata.paciente_id}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,400;0,6..12,700;1,6..12,400&family=Roboto+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
      <script>
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                sans: ['"Nunito Sans"', 'sans-serif'],
                mono: ['"Roboto Mono"', 'monospace'],
                display: ['"Space Grotesk"', 'sans-serif'],
                brand: ['"Josefin Sans"', 'sans-serif'],
              },
              colors: {
                surface: { DEFAULT: '#ffffff', subtle: '#f8fafc', muted: '#f1f5f9' },
                text: { primary: '#0f172a', secondary: '#334155', tertiary: '#94a3b8', quaternary: '#cbd5e1' },
                border: { DEFAULT: '#e2e8f0', strong: '#0f172a' }
              },
            },
          },
        }
      </script>
      <style>
        @media print {
          @page { size: A4; margin: 0; }
          .page { page-break-after: always; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
        body { font-family: 'Nunito Sans', sans-serif; background: #eee; }
        .page { width: 210mm; min-height: 297mm; background: white; margin: 1cm auto; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); }
        .content-page { display: flex; flex-direction: column; padding: 20mm; }
      </style>
    </head>
    <body>
      <div class="page">${coverHTML}</div>
      <div class="page content-page">
        ${headerHTML}
        <div class="flex-grow">${bodyContentHTML}</div>
        ${footerHTML}
      </div>
    </body>
    </html>
  `;
};
export const exportToPdf = (element: HTMLElement, filename: string): void => {
  if (!element) {
    toast.error("Report element not found for export.");
    return;
  }
  const options = {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css'], after: '.print-break-after-page', avoid: '.print-break-inside-avoid' }
  };
  html2pdf().from(element.cloneNode(true)).set(options).save().catch(err => {
    console.error("PDF export failed:", err);
    toast.error("Failed to export PDF.");
  });
};
export const generateStagePdf = async (stage: PipelineStage, inputs: TranscriptionInputs): Promise<Blob | null> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>${stage.name} - ${inputs.patientId}</title></head>
    <body>
      <h1>${stage.name} Analysis for ${inputs.patientId}</h1>
      <pre>${JSON.stringify(JSON.parse(stage.output), null, 2)}</pre>
    </body>
    </html>
  `;
  try {
    const pdfBlob = await html2pdf().from(html).outputPdf('blob');
    return pdfBlob;
  } catch (error) {
    console.error(`Failed to generate PDF for stage ${stage.name}:`, error);
    toast.error(`Failed to generate PDF for stage ${stage.name}.`);
    return null;
  }
};