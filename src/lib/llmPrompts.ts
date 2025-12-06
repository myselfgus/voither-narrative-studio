import { TranscriptionInputs } from "@/components/TranscriptionInput";
const jsonOnlySuffix = "Responda APENAS com um objeto JSON válido, sem nenhum texto adicional ou markdown.";
const getContextPrefix = (prevOutput?: string) => 
  prevOutput ? `Baseado na análise anterior:\n---\n${prevOutput.substring(0, 500)}...\n---\n\n` : '';
export const getASLprompt = (transcription: string, patientId: string, prevOutput?: string): string => `
${getContextPrefix(prevOutput)}Você é um assistente de análise linguística clínica.
Analise a seguinte transcrição para o paciente ${patientId}:
---
${transcription}
---
Sua tarefa é identificar os elementos semânticos e linguísticos chave.
${jsonOnlySuffix}
O JSON deve ter a seguinte estrutura:
{
  "semantic_elements": [
    {
      "theme": "string (o tema principal discutido, ex: 'Relação com a família')",
      "examples": ["string (uma ou mais citações diretas da transcrição que exemplificam o tema)"],
      "insights": "string (uma breve análise do significado clínico do tema)"
    }
  ],
  "summary": "string (um resumo conciso dos principais pontos linguísticos e semânticos)"
}
`;
export const getVDLPprompt = (transcription: string, patientId: string, prevOutput?: string): string => `
${getContextPrefix(prevOutput)}Você é um especialista em psicologia e linguística.
Analise a seguinte transcrição para o paciente ${patientId}:
---
${transcription}
---
Sua tarefa é mapear a linguagem do paciente para um vocabulário descritivo de linguagem psicológica.
${jsonOnlySuffix}
O JSON deve ter a seguinte estrutura:
{
  "psychological_descriptors": [
    {
      "descriptor": "string (um termo psicológico descritivo, ex: 'Cognição Ruminativa')",
      "evidence": ["string (citações da transcrição que suportam o descritor)"],
      "explanation": "string (uma explicação de como a evidência se conecta ao descritor)"
    }
  ],
  "dominant_patterns": ["string (liste os padrões de linguagem psicológica mais dominantes)"]
}
`;
export const getGEMprompt = (transcription: string, patientId: string, prevOutput?: string): string => `
${getContextPrefix(prevOutput)}Você é um analista de emoções e IA.
Analise a seguinte transcrição para o paciente ${patientId}:
---
${transcription}
---
Sua tarefa é avaliar a granularidade emocional expressa na transcrição.
${jsonOnlySuffix}
O JSON deve ter a seguinte estrutura:
{
  "emotional_granularity_score": "number (uma pontuação de 1 a 10, onde 1 é baixa granularidade e 10 é alta)",
  "identified_emotions": [
    {
      "emotion": "string (a emoção específica identificada, ex: 'Ansiedade', 'Frustração')",
      "intensity": "string ('Baixa', 'Média', 'Alta')",
      "expressions": ["string (exemplos de como a emoção foi expressa)"]
    }
  ],
  "analysis": "string (uma análise sobre a complexidade e diferenciação emocional do paciente)"
}
`;
export const getNarrativeprompt = (transcription: string, patientId: string, prevOutput?: string, inputs?: Partial<TranscriptionInputs>): string => {
  const metadata = { 
    paciente_id: patientId, 
    contexto: "Análise de Transcrição", 
    data_analise: new Date().toISOString().split('T')[0], 
    medico_responsavel: inputs?.professionalName || "A ser preenchido", 
    crm: inputs?.crm || "A ser preenchido", 
    total_turnos: 0, 
    total_palavras: 0, 
    duracao_estimada_consulta: "N/A", 
    analista: "Voither HealthOS" 
  };
  return `
${getContextPrefix(prevOutput)}Você é um roteirista clínico e assistente de IA.
Analise a seguinte transcrição para o paciente ${patientId}:
---
${transcription}
---
Sua tarefa é estruturar a transcrição em um formato de relatório narrativo. Use os metadados fornecidos.
${jsonOnlySuffix}
O JSON deve ter a estrutura de um objeto NarrativeReportData, contendo 'metadata', 'reportTitle', 'keyQuote', e 'sections'.
{
  "metadata": ${JSON.stringify(metadata)},
  "reportTitle": "string (um título criativo e clínico para o relatório)",
  "keyQuote": "string (a citação mais impactante da transcrição)",
  "sections": [
    {
      "title": "string (título da seção, ex: 'História da Moléstia Atual')",
      "intro": [],
      "subsections": [
        {
          "title": "string (título da subseção)",
          "blocks": [
            { "type": "paragraph", "content": "string (parágrafo narrativo baseado na transcrição)" },
            { "type": "quote", "content": "string (citação relevante)" }
          ]
        }
      ]
    }
  ]
}
`;
};
export const getSOAPprompt = (transcription: string, patientId: string, prevOutput?: string): string => `
${getContextPrefix(prevOutput)}Você é um médico assistente de IA.
Analise a seguinte transcrição para o paciente ${patientId}:
---
${transcription}
---
Sua tarefa é gerar notas clínicas estruturadas no formato SOAP.
${jsonOnlySuffix}
O JSON deve ter a seguinte estrutura:
{
  "subjective": "string (queixas do paciente, história, sentimentos, conforme relatado por ele)",
  "objective": "string (observações objetivas do terapeuta sobre o comportamento, afeto, fala do paciente)",
  "assessment": "string (avaliação e diagnóstico diferencial com base nas informações subjetivas e objetivas)",
  "plan": "string (plano de tratamento, próximos passos, intervenções recomendadas)"
}
`;
export const getCompileReportPrompt = (prevStages: string): string => `
Compile as seguintes análises JSON de diferentes estágios em um único e coeso relatório narrativo.
---
${prevStages}
---
Sua tarefa é sintetizar as informações em uma estrutura NarrativeReportData.
${jsonOnlySuffix}
`;