import React from 'react';
import { NarrativeReportData, Section as ReportSectionType, ContentBlock } from '@/types/report';
import {
  DisplayBrand,
  DisplayH1,
  MonoLabel,
  MonoMeta,
  BodyParagraph,
  BodyListItem,
  BodyBlockquote,
  Section,
  SubSection
} from './report/DocumentComponents';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export const Header: React.FC<{ patientId: string; date: string }> = ({ patientId, date }) => (
  <header className="border-b border-border pb-4 mb-12 flex justify-between items-end print:mb-8 print-break-inside-avoid">
    <div className="flex flex-col">
      <h1 className="text-xl leading-none select-none">
        <DisplayBrand>VOITHER</DisplayBrand><span className="font-display font-light text-text-tertiary">HealthOS</span>
      </h1>
    </div>
    <div className="text-right">
      <MonoMeta>{patientId} • {format(new Date(date), "dd/MM/yyyy", { locale: ptBR })}</MonoMeta>
    </div>
  </header>
);
export const Footer: React.FC<{ doctor: string; crm: string }> = ({ doctor, crm }) => (
  <footer className="mt-auto pt-12 border-t border-border print-break-inside-avoid">
    <div className="flex justify-between items-end">
      <div className="flex flex-col">
        <div className="font-display font-bold text-xl text-text-primary leading-none uppercase tracking-wide mb-1">{doctor}</div>
        <div className="font-mono text-sm font-light text-text-secondary">{crm}</div>
        <div className="font-sans font-thin text-[10px] text-text-tertiary mt-1 uppercase tracking-widest">Médico Psiquiatra</div>
      </div>
      <div className="text-right opacity-60">
        <p className="font-mono text-[9px] text-text-quaternary uppercase tracking-[0.2em] leading-relaxed">
          Voither HealthOS<br/>
          Narrative Engine V1 • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  </footer>
);
export const CoverPage: React.FC<{ data: NarrativeReportData }> = ({ data }) => (
  <div className="w-full h-[297mm] flex flex-col justify-between p-[20mm] bg-surface print:p-0 relative overflow-hidden">
    <div className="absolute top-[-150px] right-[-150px] w-[600px] h-[600px] bg-surface-subtle rounded-full blur-3xl -z-10 opacity-50 print:hidden"></div>
    <header className="pt-8">
      <h1 className="text-5xl mb-2 leading-none">
        <DisplayBrand>VOITHER</DisplayBrand><span className="font-display font-light text-text-quaternary">HealthOS</span>
      </h1>
      <div className="h-1.5 w-24 bg-text-primary mt-6"></div>
    </header>
    <div className="flex flex-col justify-center flex-grow pr-12 my-12">
      <MonoLabel className="mb-8 text-text-secondary tracking-[0.3em]">Relatório Narrativo</MonoLabel>
      <DisplayH1 className="mb-10 leading-tight">{data.reportTitle}</DisplayH1>
      <div className="pl-6 border-l-2 border-border-strong/20">
        <p className="font-serif italic text-2xl text-text-secondary leading-relaxed">"{data.keyQuote}"</p>
      </div>
    </div>
    <div className="pb-8 pt-8 border-t border-border grid grid-cols-2 gap-12">
      <div>
        <MonoLabel>Paciente</MonoLabel>
        <span className="block font-display text-2xl font-medium text-text-primary mb-1">{data.metadata.paciente_id}</span>
        <span className="block font-sans font-light text-sm text-text-secondary">{data.metadata.contexto}</span>
      </div>
      <div>
        <MonoLabel>Médico Responsável</MonoLabel>
        <span className="block font-display text-xl font-medium text-text-primary mb-1">{data.metadata.medico_responsavel}</span>
        <span className="block font-sans font-light text-sm text-text-secondary">{data.metadata.crm}</span>
      </div>
      <div className="col-span-2 flex justify-between items-end mt-2">
        <MonoMeta>
          {format(new Date(data.metadata.data_analise), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </MonoMeta>
      </div>
    </div>
  </div>
);
export const BlockRenderer: React.FC<{ block: ContentBlock }> = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      return <BodyParagraph>{Array.isArray(block.content) ? block.content.join(' ') : block.content}</BodyParagraph>;
    case 'quote':
      return <BodyBlockquote>{block.content}</BodyBlockquote>;
    case 'list':
      return (
        <div className="my-6 pl-4">
          {Array.isArray(block.content) && block.content.map((item, i) => (
            <BodyListItem key={i}>{item}</BodyListItem>
          ))}
        </div>
      );
    default:
      return null;
  }
};
export const SectionRenderer: React.FC<{ section: ReportSectionType }> = ({ section }) => (
  <Section title={section.title}>
    {(section.intro || []).map((block, idx) => <BlockRenderer key={`intro-${idx}`} block={block} />)}
    {section.subsections && section.subsections.length > 0 && (
      <div className="mt-8">
        {section.subsections.map((sub, idx) => (
          <SubSection key={`sub-${idx}`} title={sub.title}>
            {(sub.blocks || []).map((block, bIdx) => <BlockRenderer key={`block-${bIdx}`} block={block} />)}
          </SubSection>
        ))}
      </div>
    )}
  </Section>
);
interface PdfReportRendererProps {
  data: NarrativeReportData;
  reportRef: React.RefObject<HTMLDivElement>;
}
const PdfReportRenderer: React.FC<PdfReportRendererProps> = ({ data, reportRef }) => {
  return (
    <div ref={reportRef} className="max-w-[210mm] mx-auto bg-surface shadow-2xl print:shadow-none print:max-w-none">
      <div className="print-break-after-page">
        <CoverPage data={data} />
      </div>
      <div className="p-[20mm] min-h-[297mm] flex flex-col print:p-0 print-padding">
        <Header patientId={data.metadata.paciente_id} date={data.metadata.data_analise} />
        <div className="space-y-4 flex-grow">
          {(data.sections || []).map((section, idx) => (
            <SectionRenderer key={idx} section={section} />
          ))}
        </div>
        <Footer doctor={data.metadata.medico_responsavel} crm={data.metadata.crm} />
      </div>
    </div>
  );
};
export default PdfReportRenderer;