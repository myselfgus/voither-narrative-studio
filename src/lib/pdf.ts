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
// This function generates a self-contained HTML string for the report.
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
          .print-break-after-page { break-after: page; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
        body { font-family: 'Nunito Sans', sans-serif; }
        .page { width: 210mm; min-height: 297mm; background: white; }
      </style>
    </head>
    <body>
      <div class="page print-break-after-page">${coverHTML}</div>
      <div class="page p-[20mm] flex flex-col">
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
    toast.error("Elemento do relatório não encontrado para exportação.");
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
    toast.error("Falha ao exportar PDF.");
  });
};