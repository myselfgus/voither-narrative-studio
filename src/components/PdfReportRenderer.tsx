import React from 'react';
import { NarrativeReportData, Section as ReportSectionType, ContentBlock, Subsection } from '@/types/report';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateReportHtml } from '@/lib/reportHtml';
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