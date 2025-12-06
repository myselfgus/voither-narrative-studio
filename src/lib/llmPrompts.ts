import { NarrativeReportData } from "@/types/report";
export const getValidationPrompt = (jsonData: any): string => {
  const jsonString = JSON.stringify(jsonData, null, 2);
  return `
    You are a clinical report assistant for Voither HealthOS. Your task is to validate and enrich a JSON object representing a clinical narrative report.
    Analyze the following JSON data:
    \`\`\`json
    ${jsonString}
    \`\`\`
    Follow these instructions precisely:
    1.  **Validate Schema**: Ensure the JSON conforms to the NarrativeReportData structure. The root must have \`metadata\`, \`reportTitle\`, \`keyQuote\`, and \`sections\`.
    2.  **Enrich Metadata**: If any fields in the \`metadata\` object are missing or empty (e.g., \`total_turnos\`, \`total_palavras\`), provide realistic placeholder values. For dates, use the current date if missing.
    3.  **Structure Content**: The \`sections\` array contains the main content. Each section should have a title, an optional intro, and subsections. Each subsection must have a title and an array of content blocks (\`blocks\`).
    4.  **Normalize Content Blocks**: Ensure all content blocks are valid. A block must have a \`type\` ('paragraph', 'quote', 'list') and \`content\`.
        - For paragraphs and quotes, \`content\` must be a string.
        - For lists, \`content\` must be an array of strings.
    5.  **Improve Clinical Tone**: Review all paragraph content. Subtly rephrase sentences to have a more formal, objective, and clinical tone suitable for a psychiatric report. Do not change the core meaning.
    6.  **Generate Missing Content**: If the \`sections\` array is empty or incomplete, generate plausible sections, subsections, and content blocks based on the \`metadata.contexto\` and \`reportTitle\`. A typical report includes sections like "História da Moléstia Atual", "Exame Psíquico", and "Hipótese Diagnóstica".
    7.  **Output**: Your final output must be ONLY the complete, validated, and enriched JSON object. Do not include any explanatory text, markdown formatting, or anything else outside of the JSON structure. The output must be parsable by \`JSON.parse()\`.
    Return the final JSON object now.
  `;
};