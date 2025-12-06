import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { NarrativeReportData } from '@/types/report';
export const exportToPdf = (element: HTMLElement, filename: string): void => {
  if (!element) {
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
  html2pdf().from(element.cloneNode(true)).set(options).save().catch(err => {
    console.error("PDF export failed:", err);
    toast.error("Failed to export PDF.");
  });
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