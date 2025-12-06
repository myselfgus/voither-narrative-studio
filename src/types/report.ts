export interface Metadata {
  paciente_id: string;
  contexto: string;
  data_analise: string;
  total_turnos: number;
  total_palavras: number;
  duracao_estimada_consulta: string;
  analista: string;
  medico_responsavel: string;
  crm: string;
}
export interface ContentBlock {
  type: 'paragraph' | 'quote' | 'list';
  content: string | string[];
}
export interface Subsection {
  title: string;
  blocks: ContentBlock[];
}
export interface Section {
  title: string;
  intro: ContentBlock[];
  subsections: Subsection[];
}
export interface NarrativeReportData {
  metadata: Metadata;
  reportTitle: string;
  keyQuote: string;
  sections: Section[];
}