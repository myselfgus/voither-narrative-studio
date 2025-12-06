export const openPrintPreview = (contentElement: HTMLElement | null): void => {
  if (!contentElement) {
    console.error("Content element for printing not found.");
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to view the print preview.');
    return;
  }
  // Capture essential styles and fonts from the main document's head
  const stylesAndScripts = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Voither HealthOS - Relatório Clínico</title>
        ${stylesAndScripts}
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['"Nunito Sans"', 'sans-serif'],
                  mono: ['"Roboto Mono"', 'monospace'],
                  display: ['"Space Grotesk"', 'sans-serif'],
                  brand: ['"Josefin Sans"', 'sans-serif'],
                },
                colors: {
                  surface: { DEFAULT: '#ffffff', subtle: '#f8fafc', muted: '#f1f5f9' },
                  text: { primary: '#0f172a', secondary: '#334155', tertiary: '#94a3b8', quaternary: '#cbd5e1' },
                  border: { DEFAULT: '#e2e8f0', strong: '#0f172a' }
                },
                letterSpacing: { tighter: '-0.05em', tight: '-0.025em', normal: '0em', wide: '0.05em', widest: '0.25em' },
              },
            },
          }
        </script>
        <style>
          body {
            background-color: #334155; /* A dark slate for the preview background */
            padding: 40px 0;
            display: flex;
            justify-content: center;
          }
          #preview-container {
            background: white;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            width: 210mm;
            margin: 0 auto;
          }
          .header-bar {
            position: fixed; top: 0; left: 0; width: 100%;
            background: #0f172a; color: white; padding: 1rem 2rem;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 50;
          }
          @media print {
            body { background: white; padding: 0; display: block; }
            #preview-container { box-shadow: none; margin: 0; width: 100%; }
            .header-bar { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
           <div>
             <span class="font-bold text-lg">Visualização de Impressão</span>
             <span class="text-xs text-gray-400">Verifique o layout antes de salvar como PDF.</span>
           </div>
           <div class="flex gap-4">
             <button onclick="window.close()" class="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">FECHAR</button>
             <button onclick="window.print()" class="bg-white text-slate-900 px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg">SALVAR PDF</button>
           </div>
        </div>
        <div style="height: 80px;" class="print:hidden"></div>
        <div id="preview-container">
          ${contentElement.innerHTML}
        </div>
        <div style="height: 40px;" class="print:hidden"></div>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};