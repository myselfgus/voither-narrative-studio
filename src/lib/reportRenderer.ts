import { NarrativeReportData } from "@/types/report";
interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized: NarrativeReportData | null;
}
export const validateReportData = (json: any): ValidationResult => {
  const errors: string[] = [];
  if (typeof json !== 'object' || json === null) {
    return { valid: false, errors: ['Invalid JSON object.'], normalized: null };
  }
  // Check root level fields
  if (!json.metadata) errors.push('Missing required field: metadata');
  if (!json.reportTitle) errors.push('Missing required field: reportTitle');
  if (!json.keyQuote) errors.push('Missing required field: keyQuote');
  if (!Array.isArray(json.sections)) errors.push('Field "sections" must be an array.');
  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }
  // Basic normalization
  const normalized: NarrativeReportData = {
    metadata: {
      paciente_id: json.metadata.paciente_id || 'N/A',
      contexto: json.metadata.contexto || 'N/A',
      data_analise: json.metadata.data_analise || new Date().toISOString().split('T')[0],
      medico_responsavel: json.metadata.medico_responsavel || 'N/A',
      crm: json.metadata.crm || 'N/A',
      total_turnos: json.metadata.total_turnos || 0,
      total_palavras: json.metadata.total_palavras || 0,
      duracao_estimada_consulta: json.metadata.duracao_estimada_consulta || 'N/A',
      analista: json.metadata.analista || 'Voither HealthOS',
    },
    reportTitle: json.reportTitle,
    keyQuote: json.keyQuote,
    sections: json.sections.map((section: any) => ({
      title: section.title || 'Untitled Section',
      intro: Array.isArray(section.intro) ? section.intro : [],
      subsections: Array.isArray(section.subsections) ? section.subsections.map((sub: any) => ({
        title: sub.title || 'Untitled Subsection',
        blocks: Array.isArray(sub.blocks) ? sub.blocks : [],
      })) : [],
    })),
  };
  return { valid: true, errors: [], normalized };
};
export const prepareCoverData = (data: NarrativeReportData) => {
  return {
    metadata: data.metadata,
    reportTitle: data.reportTitle,
    keyQuote: data.keyQuote,
    sections: [], // Cover doesn't need sections
  };
};