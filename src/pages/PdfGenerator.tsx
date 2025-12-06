import React, { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useDebounce } from 'react-use';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster, toast } from 'sonner';
import { Bot, FileDown, FileText, Loader2, Save, Eye, Code } from 'lucide-react';
import UploadJson from '@/components/UploadJson';
import PdfReportRenderer from '@/components/PdfReportRenderer';
import { generateReportHtml } from '@/lib/reportHtml';
import { NarrativeReportData } from '@/types/report';
import { chatService } from '@/lib/chat';
import { getJsonEnrichPrompt } from '@/lib/llmPrompts';
import { openPrintPreview } from '@/lib/pdf';
import * as z from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
const ReportEditor = lazy(() => import('@/components/ReportEditor'));
const reportSchema = z.object({
  metadata: z.object({
    paciente_id: z.string().min(1, "paciente_id is required"),
    contexto: z.string().min(1, "contexto is required"),
    data_analise: z.string().min(1, "data_analise is required"),
    medico_responsavel: z.string().min(1, "medico_responsavel is required"),
    crm: z.string().min(1, "crm is required"),
  }).passthrough(),
  reportTitle: z.string().min(1, "reportTitle is required"),
  keyQuote: z.string().min(1, "keyQuote is required"),
  sections: z.array(z.any()).min(1, "sections array must not be empty"),
});
const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[match]!));
const PdfGenerator: React.FC = () => {
  const [rawJson, setRawJson] = useState<any | null>(null);
  const [enrichedReport, setEnrichedReport] = useState<NarrativeReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const handleJsonParsed = (jsonData: any) => {
    const result = reportSchema.safeParse(jsonData);
    if (result.success) {
      setRawJson(jsonData);
      setEnrichedReport(result.data as unknown as NarrativeReportData);
      toast.success("JSON validado e carregado com sucesso.");
    } else {
      toast.error("Esquema JSON inválido.", {
        description: result.error.format()._errors.join('; '),
      });
      setRawJson(null);
      setEnrichedReport(null);
    }
  };
  const handleEnrich = async () => {
    if (!rawJson) {
      toast.error("Nenhum JSON para enriquecer.");
      return;
    }
    setIsProcessing(true);
    setEnrichedReport(null); // Clear previous report to show skeleton
    toast.info("Enriquecendo dados com IA...", { description: "Isso pode levar um momento." });
    const prompt = getJsonEnrichPrompt(rawJson);
    const { success, output } = await chatService.sendMessage(prompt, 'voither');
    if (success && output) {
      try {
        const sanitizedOutput = escapeHtml(output);
        const enrichedData = JSON.parse(sanitizedOutput);
        const result = reportSchema.safeParse(enrichedData);
        if (result.success) {
          setEnrichedReport(result.data as unknown as NarrativeReportData);
          toast.success("Dados enriquecidos com sucesso!");
        } else {
          throw new Error("A saída da IA não corresponde ao esquema.");
        }
      } catch (error) {
        toast.error("Falha ao analisar a resposta da IA.", { description: "A resposta não era um JSON válido." });
      }
    } else {
      toast.error("Falha ao enriquecer os dados.");
    }
    setIsProcessing(false);
  };
  const handleSaveSession = useCallback(async () => {
    if (!enrichedReport) {
      toast.error("Nenhum relatório para salvar.");
      return;
    }
    const sessionData = {
      inputs: {
        patientId: enrichedReport.metadata.paciente_id,
        crm: enrichedReport.metadata.crm,
        professionalName: enrichedReport.metadata.medico_responsavel,
      },
      stages: [], // No stages in this flow
      report: enrichedReport,
    };
    const res = await chatService.createSession(`Relatório para ${enrichedReport.metadata.paciente_id}`, sessionData);
    if (res.success) {
      toast.success("Sessão salva com sucesso!");
    } else {
      toast.error("Falha ao salvar a sessão.");
    }
  }, [enrichedReport]);
  useDebounce(() => {
    if (enrichedReport) {
      handleSaveSession();
    }
  }, 10000, [enrichedReport, handleSaveSession]);
  const handleExportPdf = async () => {
    if (enrichedReport) {
      toast.info("Gerando PDF...");
      const { exportToPdf } = await import('@/lib/pdf');
      const htmlString = generateReportHtml(enrichedReport);
      exportToPdf(htmlString, `voither-report-${enrichedReport.metadata.paciente_id}`);
    } else {
      toast.error("Não foi possível gerar o PDF. Faltando dados.");
    }
  };
  const handleOpenPreview = () => {
    if (reportRef.current && enrichedReport) {
      openPrintPreview('report-section', `Relatório - ${enrichedReport.metadata.paciente_id}`);
    } else {
      toast.error("Não foi possível abrir a visualização.");
    }
  };
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl text-text-primary">Gerador de PDF a partir de JSON</h1>
            <p className="text-muted-foreground">Faça o upload, enriqueça com IA e exporte seu relatório.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleOpenPreview} variant="outline" disabled={!enrichedReport} className="min-h-11 px-4">
              <Eye className="w-4 h-4 mr-2" /> Visualizar Impressão
            </Button>
            <Button onClick={handleSaveSession} variant="outline" disabled={!enrichedReport} className="min-h-11 px-4">
              <Save className="w-4 h-4 mr-2" /> Salvar Sessão
            </Button>
            <Button onClick={handleExportPdf} disabled={!enrichedReport} className="min-h-11 px-4">
              <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border min-h-[80vh] flex-col md:flex-row">
          <ResizablePanel defaultSize={40} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>1. Upload de JSON</CardTitle>
                    <CardDescription>Faça o upload de um arquivo JSON com a estrutura do relatório.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UploadJson onJsonParsed={handleJsonParsed} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>2. Enriquecer com IA</CardTitle>
                    <CardDescription>Use a IA para preencher dados ausentes e refinar o conteúdo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleEnrich} disabled={!rawJson || isProcessing} className="w-full min-h-11">
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                      {isProcessing ? 'Processando...' : 'Enriquecer com IA'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              <div className="p-2 border-b flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Visualização do Relatório</h2>
                </div>
                <Button onClick={() => setShowHtml(!showHtml)} variant="outline" size="sm">
                  {showHtml ? <Eye className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
                  {showHtml ? 'Ver Preview' : 'Ver HTML'}
                </Button>
              </div>
              <ScrollArea className="h-full bg-surface-muted p-4 md:p-8">
                {isProcessing ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : enrichedReport ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {showHtml ? (
                      <pre className="text-xs whitespace-pre-wrap p-4 bg-gray-900 text-gray-100 rounded-md">
                        {generateReportHtml(enrichedReport)}
                      </pre>
                    ) : (
                      <PdfReportRenderer data={enrichedReport} reportRef={reportRef} useHtml={true} />
                    )}
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <p>Faça o upload de um JSON para ver a visualização.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Toaster richColors closeButton />
    </AppLayout>
  );
};
export default PdfGenerator;