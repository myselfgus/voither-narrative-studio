import React from 'react';
import { NarrativeReportData, Section as ReportSection, ContentBlock } from '@/types/report';
import { Display, Mono, Body, Section, SubSection } from './report/DocumentComponents';
const Header = ({ patientId, date }: { patientId: string; date: string }) => (
  <header className="border-b border-border pb-4 mb-12 flex justify-between items-end print:mb-8 print-break-after-avoid">
    <div className="flex flex-col">
      <h1 className="text-xl leading-none select-none">
        <Display.Brand>VOITHER</Display.Brand><span className="font-display font-light text-text-tertiary">HealthOS</span>
      </h1>
    </div>
    <div className="text-right">
      <Mono.Meta>{patientId} • {new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Mono.Meta>
    </div>
  </header>
);
const Footer = ({ doctor, crm }: { doctor: string; crm: string }) => (
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
const CoverPage: React.FC<{ data: NarrativeReportData }> = ({ data }) => (
  <div className="w-full h-[297mm] flex flex-col justify-between p-[20mm] bg-surface print:p-0 print-break-after-page relative overflow-hidden border-b">
     <div className="absolute top-[-150px] right-[-150px] w-[600px] h-[600px] bg-surface-subtle rounded-full blur-3xl -z-10 opacity-50 print:hidden"></div>
     <header className="pt-8">
        <h1 className="text-5xl mb-2 leading-none">
          <Display.Brand>VOITHER</Display.Brand><span className="font-display font-light text-text-quaternary">HealthOS</span>
        </h1>
        <div className="h-1.5 w-24 bg-text-primary mt-6"></div>
     </header>
     <div className="flex flex-col justify-center flex-grow pr-12 my-12">
        <Mono.Label className="mb-8 text-text-secondary tracking-[0.3em]">Relatório Narrativo</Mono.Label>
        <Display.H1 className="mb-10 leading-tight">{data.reportTitle}</Display.H1>
        <div className="pl-6 border-l-2 border-border-strong/20">
           <p className="font-serif italic text-2xl text-text-secondary leading-relaxed">"{data.keyQuote}"</p>
        </div>
     </div>
     <div className="pb-8 pt-8 border-t border-border grid grid-cols-2 gap-12">
        <div>
           <Mono.Label>Paciente</Mono.Label>
           <span className="block font-display text-2xl font-medium text-text-primary mb-1">{data.metadata.paciente_id}</span>
           <span className="block font-sans font-light text-sm text-text-secondary">{data.metadata.contexto}</span>
        </div>
        <div>
           <Mono.Label>Médico Responsável</Mono.Label>
           <span className="block font-display text-xl font-medium text-text-primary mb-1">{data.metadata.medico_responsavel}</span>
           <span className="block font-sans font-light text-sm text-text-secondary">{data.metadata.crm}</span>
        </div>
        <div className="col-span-2 flex justify-between items-end mt-2">
           <Mono.Meta>
             {new Date(data.metadata.data_analise).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
           </Mono.Meta>
        </div>
     </div>
  </div>
);
const BlockRenderer: React.FC<{ block: ContentBlock }> = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      return <Body.Paragraph>{Array.isArray(block.content) ? block.content.join(' ') : block.content}</Body.Paragraph>;
    case 'quote':
      return <Body.Blockquote>{block.content}</Body.Blockquote>;
    case 'list':
      return (
        <div className="my-6 pl-4">
           {Array.isArray(block.content) && block.content.map((item, i) => (
             <Body.ListItem key={i}>{item}</Body.ListItem>
           ))}
        </div>
      );
    default:
      return null;
  }
};
const SectionRenderer: React.FC<{ section: ReportSection }> = ({ section }) => (
  <Section title={section.title}>
    {section.intro && section.intro.map((block, idx) => <BlockRenderer key={`intro-${idx}`} block={block} />)}
    {section.subsections && section.subsections.length > 0 && (
      <div className="mt-8">
        {section.subsections.map((sub, idx) => (
          <SubSection key={`sub-${idx}`} title={sub.title}>
             {sub.blocks.map((block, bIdx) => <BlockRenderer key={`block-${bIdx}`} block={block} />)}
          </SubSection>
        ))}
      </div>
    )}
  </Section>
);
interface ReportPreviewProps {
  data: NarrativeReportData | null;
  reportRef: React.RefObject<HTMLDivElement>;
}
const ReportPreview: React.FC<ReportPreviewProps> = ({ data, reportRef }) => {
  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-muted rounded-lg">
        <p className="text-text-tertiary">Aguardando dados para visualização...</p>
      </div>
    );
  }
  return (
    <div ref={reportRef} className="max-w-[210mm] mx-auto bg-surface shadow-2xl print:shadow-none print:max-w-none">
      <CoverPage data={data} />
      <div className="p-[20mm] min-h-[297mm] flex flex-col print:p-0 print-padding">
        <Header patientId={data.metadata.paciente_id} date={data.metadata.data_analise} />
        <div className="space-y-4">
           {data.sections.map((section, idx) => (
             <SectionRenderer key={idx} section={section} />
           ))}
        </div>
        <Footer doctor={data.metadata.medico_responsavel} crm={data.metadata.crm} />
      </div>
    </div>
  );
};
export default ReportPreview;