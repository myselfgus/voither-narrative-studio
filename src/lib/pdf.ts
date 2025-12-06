import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { NarrativeReportData } from '@/types/report';
export const exportToPdf = (elementOrHtml: HTMLElement | string, filename: string): void => {
  if (!elementOrHtml) {
    toast.error("Report element not found for export.");
    return;
  }
  const options = {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: ['css'], after: '.print-break-after-page', avoid: '.print-break-inside-avoid' }
  };
  const worker = html2pdf().set(options);
  if (typeof elementOrHtml === 'string') {
    worker.from(elementOrHtml).save().catch(err => {
      console.error("PDF export failed:", err);
      toast.error("Failed to export PDF.");
    });
  } else {
    worker.from(elementOrHtml.cloneNode(true)).save().catch(err => {
      console.error("PDF export failed:", err);
      toast.error("Failed to export PDF.");
    });
  }
};
// Helper to wrap text in canvas
const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
};
export const generateCoverThumbnail = async (data: NarrativeReportData): Promise<string> => {
  const canvas = document.createElement('canvas');
  const scale = 2; // For higher resolution
  canvas.width = 300 * scale;
  canvas.height = 400 * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(scale, scale);
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 300, 400);
  // Brand
  ctx.font = 'bold 24px "Josefin Sans", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('VOITHER', 20, 40);
  ctx.font = '24px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('HealthOS', 125, 40);
  // Bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 55, 60, 3);
  // Title
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  wrapText(ctx, data.reportTitle, 150, 140, 260, 26);
  // Quote
  ctx.font = 'italic 16px "Roboto Mono", monospace';
  ctx.fillStyle = '#334155';
  wrapText(ctx, `"${data.keyQuote}"`, 150, 210, 260, 20);
  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 300);
  ctx.lineTo(280, 300);
  ctx.stroke();
  // Metadata
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(data.metadata.paciente_id, 20, 325);
  ctx.font = '12px "Roboto Mono", monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText(data.metadata.contexto, 20, 340);
  ctx.font = 'bold 12px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(data.metadata.medico_responsavel, 160, 325);
  ctx.font = '12px "Roboto Mono", monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText(data.metadata.crm, 160, 340);
  return canvas.toDataURL('image/png');
};
export const generatePrintableHtml = (elementId: string, title: string): string => {
  const content = document.getElementById(elementId)?.innerHTML;
  if (!content) return '';
  const stylesAndScripts = Array.from(document.querySelectorAll('link[rel="stylesheet"], style, script'))
    .filter(el => {
      const src = (el as HTMLScriptElement).src || '';
      const inner = el.innerHTML;
      return (
        el.tagName === 'LINK' ||
        el.tagName === 'STYLE' ||
        (el.tagName === 'SCRIPT' && (src.includes('tailwindcss') || inner.includes('tailwind.config')))
      );
    })
    .map(el => el.outerHTML)
    .join('\n');
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${stylesAndScripts}
        <style>
          body { background-color: #334155; min-height: 100vh; padding: 40px 0; display: flex; flex-direction: column; align-items: center; }
          #preview-container { background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 210mm; width: 100%; margin: 0 auto; }
          .header-bar { position: fixed; top: 0; left: 0; width: 100%; background: #0f172a; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 50; }
          @media print {
            body { background: white; padding: 0; display: block; }
            #preview-container { box-shadow: none; max-width: none; margin: 0; width: 100%; }
            .header-bar { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
           <div class="flex flex-col">
             <span class="font-bold text-lg">Visualização de Impressão</span>
             <span class="text-xs text-gray-400">Verifique o layout antes de salvar</span>
           </div>
           <div class="flex gap-4">
             <button onclick="window.close()" class="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">FECHAR</button>
             <button onclick="window.print()" class="bg-white text-slate-900 px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-2">
               <span>SALVAR PDF</span>
             </button>
           </div>
        </div>
        <div style="height: 80px;" class="print:hidden"></div>
        <div id="preview-container">${content}</div>
        <div style="height: 40px;" class="print:hidden"></div>
      </body>
    </html>
  `;
};
export const openPrintPreview = (elementId: string, title: string) => {
  const html = generatePrintableHtml(elementId, title);
  if (html) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      toast.error("Popup blocked", { description: "Please allow popups for this site to see the print preview." });
    }
  } else {
    toast.error("Could not generate print preview.");
  }
};