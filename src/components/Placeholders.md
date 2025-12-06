# Voither Narrative Studio - JSON Placeholders
This document outlines the expected JSON structure for generating a clinical report.
## Root Level Fields
- `metadata`: (Object) Contains all metadata for the report.
- `reportTitle`: (String) The main title displayed on the cover page.
- `keyQuote`: (String) A significant quote from the patient, displayed on the cover page.
- `sections`: (Array) An array of section objects that form the body of the report.
## `metadata` Object
- `paciente_id`: (String) Patient's name or identifier.
- `contexto`: (String) Brief context for the analysis (e.g., "Análise Narrativa de Profundidade").
- `data_analise`: (String) Date of the analysis (e.g., "2024-08-15").
- `medico_responsavel`: (String) Name of the responsible doctor.
- `crm`: (String) The doctor's CRM number.
- `total_turnos`: (Number) Total turns in the conversation.
- `total_palavras`: (Number) Total words in the conversation.
- `duracao_estimada_consulta`: (String) Estimated duration of the consultation.
- `analista`: (String) Name of the analyst.
## `sections` Array
Each object in the `sections` array represents a major section of the report.
- `title`: (String) The title of the section.
- `intro`: (Array of `ContentBlock`) Content blocks that appear before any subsections.
- `subsections`: (Array of `Subsection`) An array of subsection objects.
### `Subsection` Object
- `title`: (String) The title of the subsection.
- `blocks`: (Array of `ContentBlock`) The content blocks within this subsection.
### `ContentBlock` Object
A content block can be one of three types:
- `{ "type": "paragraph", "content": "..." }`
  - `content`: (String) A single paragraph of text.
- `{ "type": "quote", "content": "..." }`
  - `content`: (String) A quote.
- `{ "type": "list", "content": ["...", "..."] }`
  - `content`: (Array of Strings) An array of list items.