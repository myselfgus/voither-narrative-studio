import React from 'react';
import { NarrativeReportData, Section as ReportSectionType, ContentBlock, Subsection } from '@/types/report';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
const generateCoverHtml = (data: NarrativeReportData): string => {
  const { metadata, reportTitle, keyQuote } = data;
  const formattedDate = format(new Date(metadata.data_analise), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  return `
    <div class="w-full h-[297mm] flex flex-col justify-between p-[20mm] bg-surface print:p-0 relative overflow-hidden print-break-after-page">
      <div class="absolute top-[-150px] right-[-150px] w-[600px] h-[600px] bg-surface-subtle rounded-full blur-3xl -z-10 opacity-50 print:hidden"></div>
      <header class="pt-8">
        <h1 class="text-5xl mb-2 leading-none">
          <span class="font-brand font-bold text-text-primary tracking-tighter">VOITHER</span><span class="font-display font-light text-text-quaternary">HealthOS</span>
        </h1>
        <div class="h-1.5 w-24 bg-text-primary mt-6"></div>
      </header>
      <div class="flex flex-col justify-center flex-grow pr-12 my-12">
        <span class="block font-mono text-[10px] font-medium text-text-tertiary uppercase tracking-widest leading-none mb-8 text-text-secondary tracking-[0.3em]">Relatório Narrativo</span>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-text-primary leading-[0.95] tracking-tight mb-10 leading-tight">${escapeHtml(reportTitle)}</h1>
        <div class="pl-6 border-l-2 border-border-strong/20">
          <p class="font-serif italic text-2xl text-text-secondary leading-relaxed">"${escapeHtml(keyQuote)}"</p>
        </div>
      </div>
      <div class="pb-8 pt-8 border-t border-border grid grid-cols-2 gap-12">
        <div>
          <span class="block font-mono text-[10px] font-medium text-text-tertiary uppercase tracking-widest leading-none mb-1.5">Paciente</span>
          <span class="block font-display text-2xl font-medium text-text-primary mb-1">${escapeHtml(metadata.paciente_id)}</span>
          <span class="block font-sans font-light text-sm text-text-secondary">${escapeHtml(metadata.contexto)}</span>
        </div>
        <div>
          <span class="block font-mono text-[10px] font-medium text-text-tertiary uppercase tracking-widest leading-none mb-1.5">Médico Responsável</span>
          <span class="block font-display text-xl font-medium text-text-primary mb-1">${escapeHtml(metadata.medico_responsavel)}</span>
          <span class="block font-sans font-light text-sm text-text-secondary">${escapeHtml(metadata.crm)}</span>
        </div>
        <div class="col-span-2 flex justify-between items-end mt-2">
          <span class="font-mono text-xs font-light text-text-secondary tracking-wide">${formattedDate}</span>
        </div>
      </div>
    </div>
  `;
};
const generateBlockHtml = (block: ContentBlock): string => {
  switch (block.type) {
    case 'paragraph':
      return `<p class="font-sans font-light text-[15px] text-text-primary leading-8 text-justify mb-5 last:mb-0">${escapeHtml(Array.isArray(block.content) ? block.content.join(' ') : block.content)}</p>`;
    case 'quote':
      return `<div class="my-8 pl-6 border-l-4 border-text-primary py-2"><p class="font-sans text-xl font-light italic text-text-primary leading-relaxed">"${escapeHtml(block.content as string)}"</p></div>`;
    case 'list':
      return `<div class="my-6 pl-4">${(block.content as string[]).map(item => `
        <div class="flex gap-4 items-baseline mb-3">
          <span class="font-mono text-text-primary/40 font-bold text-[10px] mt-2 shrink-0">•</span>
          <span class="font-sans font-light text-[15px] text-text-primary leading-relaxed text-justify">${escapeHtml(item)}</span>
        </div>`).join('')}
      </div>`;
    default:
      return '';
  }
};
const generateSubsectionHtml = (sub: Subsection): string => `
  <div class="mb-10 last:mb-0 print-break-inside-avoid">
    <h3 class="font-display text-lg font-bold text-text-secondary tracking-tight mb-4 flex items-center gap-3">
      <span class="w-8 h-[1px] bg-text-tertiary"></span>
      ${escapeHtml(sub.title)}
    </h3>
    ${(sub.blocks || []).map(generateBlockHtml).join('')}
  </div>
`;
const generateSectionHtml = (section: ReportSectionType): string => `
  <section class="mb-16 print-break-inside-avoid">
    <div class="border-b border-border-strong pb-4 mb-8 mt-12 flex items-end justify-between print-break-after-avoid">
      <h2 class="font-display font-bold text-2xl text-text-primary uppercase tracking-tight max-w-[80%]">${escapeHtml(section.title)}</h2>
      <div class="h-2 w-2 bg-text-primary mb-1"></div>
    </div>
    ${(section.intro || []).map(generateBlockHtml).join('')}
    ${section.subsections && section.subsections.length > 0 ? `<div class="mt-8">${section.subsections.map(generateSubsectionHtml).join('')}</div>` : ''}
  </section>
`;
const generateBodyHtml = (data: NarrativeReportData): string => {
  const { metadata } = data;
  const formattedDate = format(new Date(metadata.data_analise), "dd/MM/yyyy", { locale: ptBR });
  return `
    <div class="p-[20mm] min-h-[297mm] flex flex-col print:p-0 print-padding">
      <header class="border-b border-border pb-4 mb-12 flex justify-between items-end print:mb-8 print-break-inside-avoid">
        <div class="flex flex-col">
          <h1 class="text-xl leading-none select-none">
            <span class="font-brand font-bold text-text-primary tracking-tighter">VOITHER</span><span class="font-display font-light text-text-tertiary">HealthOS</span>
          </h1>
        </div>
        <div class="text-right">
          <span class="font-mono text-xs font-light text-text-secondary tracking-wide">${escapeHtml(metadata.paciente_id)} • ${formattedDate}</span>
        </div>
      </header>
      <div class="space-y-4 flex-grow">
        ${(data.sections || []).map(generateSectionHtml).join('')}
      </div>
      <footer class="mt-auto pt-12 border-t border-border print-break-inside-avoid">
        <div class="flex justify-between items-end">
          <div class="flex flex-col">
            <div class="font-display font-bold text-xl text-text-primary leading-none uppercase tracking-wide mb-1">${escapeHtml(metadata.medico_responsavel)}</div>
            <div class="font-mono text-sm font-light text-text-secondary">${escapeHtml(metadata.crm)}</div>
            <div class="font-sans font-thin text-[10px] text-text-tertiary mt-1 uppercase tracking-widest">Médico Psiquiatra</div>
          </div>
          <div class="text-right opacity-60">
            <p class="font-mono text-[9px] text-text-quaternary uppercase tracking-[0.2em] leading-relaxed">
              Voither HealthOS<br/>
              Narrative Engine V1 • ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  `;
};
export const generateReportHtml = (data: NarrativeReportData): string => {
  const cover = generateCoverHtml(data);
  const body = generateBodyHtml(data);
  return cover + body;
};
interface PdfReportRendererProps {
  data: NarrativeReportData;
  reportRef: React.RefObject<HTMLDivElement>;
  useHtml?: boolean;
}
const PdfReportRenderer: React.FC<PdfReportRendererProps> = ({ data, reportRef, useHtml = false }) => {
  const reportHtml = useHtml ? generateReportHtml(data) : '';
  return (
    <div
      id="report-section"
      ref={reportRef}
      className="max-w-[210mm] mx-auto bg-surface shadow-2xl print:shadow-none print:max-w-none"
      {...(useHtml && { dangerouslySetInnerHTML: { __html: reportHtml } })}
    >
      {/* This div will be populated by dangerouslySetInnerHTML when useHtml is true */}
    </div>
  );
};
export default PdfReportRenderer;