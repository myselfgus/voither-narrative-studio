import { NarrativeReportData, Section } from "@/types/report";
import { PipelineStage } from "@/components/PipelineStages";
import { TranscriptionInputs } from "@/components/TranscriptionInput";
import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';
const safeJsonParse = (jsonString: string, fallback: any = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback;
  }
};
export const compileFromStages = (stages: PipelineStage[], inputs: TranscriptionInputs): NarrativeReportData => {
  const narrativeStage = stages.find(s => s.name === 'Narrative');
  const soapStage = stages.find(s => s.name === 'SOAP');
  let baseReport: NarrativeReportData = safeJsonParse(narrativeStage?.output);
  if (!baseReport) {
    // Fallback if narrative parsing fails
    baseReport = {
      metadata: {
        paciente_id: inputs.patientId,
        contexto: "An��lise de Transcrição",
        data_analise: new Date().toISOString().split('T')[0],
        medico_responsavel: inputs.professionalName,
        crm: inputs.crm,
        total_turnos: 0,
        total_palavras: 0,
        duracao_estimada_consulta: "N/A",
        analista: "Voither HealthOS",
      },
      reportTitle: `Relatório para ${inputs.patientId}`,
      keyQuote: "Citação chave não gerada.",
      sections: [],
    };
  } else {
    // Ensure metadata from inputs is used
    baseReport.metadata.paciente_id = inputs.patientId;
    baseReport.metadata.medico_responsavel = inputs.professionalName;
    baseReport.metadata.crm = inputs.crm;
  }
  // Add SOAP notes as a new section
  if (soapStage?.output) {
    const soapData = safeJsonParse(soapStage.output);
    if (soapData) {
      const soapSection: Section = {
        title: "Notas Clínicas (SOAP)",
        intro: [],
        subsections: [
          { title: "Subjetivo (S)", blocks: [{ type: 'paragraph', content: soapData.subjective || '' }] },
          { title: "Objetivo (O)", blocks: [{ type: 'paragraph', content: soapData.objective || '' }] },
          { title: "Avaliação (A)", blocks: [{ type: 'paragraph', content: soapData.assessment || '' }] },
          { title: "Plano (P)", blocks: [{ type: 'paragraph', content: soapData.plan || '' }] },
        ],
      };
      baseReport.sections.push(soapSection);
    }
  }
  return baseReport;
};
export const computeDiffHtml = (oldText: string, newText: string): string => {
  const dmp = new DiffMatchPatch();
  const diff = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diff);
  return dmp.diff_prettyHtml(diff);
};