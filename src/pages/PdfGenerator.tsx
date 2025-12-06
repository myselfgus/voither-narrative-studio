import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'sonner';
import { Bot, FileDown, FileText, Loader2, Save } from 'lucide-react';
import UploadJson from '@/components/UploadJson';
import PdfReportRenderer from '@/components/PdfReportRenderer';
import { NarrativeReportData } from '@/types/report';
import { chatService } from '@/lib/chat';
import { getJsonEnrichPrompt } from '@/lib/llmPrompts';
import { exportToPdf } from '@/lib/pdf';
import * as z from 'zod';
const reportSchema = z.object({
  metadata: z.object({
    paciente_id: z.string(),
    contexto: z.string(),
    data_analise: z.string(),
    medico_responsavel: z.string(),
    crm: z.string(),
  }),
  reportTitle: z.string(),
  keyQuote: z.string(),
  sections: z.array(z.any()),
});
const PdfGenerator: React.FC = () => {
  const [rawJson, setRawJson] = useState<any | null>(null);
  const [enrichedReport, setEnrichedReport] = useState<NarrativeReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const handleJsonParsed = (jsonData: any) => {
    const result = reportSchema.safeParse(jsonData);
    if (result.success) {
      setRawJson(jsonData);
      setEnrichedReport(result.data as NarrativeReportData);
      toast.success("JSON validado e carregado com sucesso.");
    } else {
      toast.error("Esquema JSON inválido.", {
        description: "O JSON não corresponde à estrutura NarrativeReportData necessária.",
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
    toast.info("Enriquecendo dados com IA...", { description: "Isso pode levar um momento." });
    const prompt = getJsonEnrichPrompt(rawJson);
    const { success, output } = await chatService.sendMessage(prompt, 'voither');
    if (success && output) {
      try {
        const enrichedData = JSON.parse(output);
        const result = reportSchema.safeParse(enrichedData);
        if (result.success) {
          setEnrichedReport(result.data as NarrativeReportData);
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
    const res = await chatService.createSession(`Relatório para ${enrichedReport.metadata.paciente_id}`, enrichedReport);
    if (res.success) {
      toast.success("Sessão salva com sucesso!");
    } else {
      toast.error("Falha ao salvar a sessão.");
    }
  }, [enrichedReport]);
  const handleExportPdf = () => {
    if (reportRef.current && enrichedReport) {
      toast.info("Gerando PDF...");
      exportToPdf(reportRef.current, `voither-report-${enrichedReport.metadata.paciente_id}`);
    } else {
      toast.error("Não foi possível gerar o PDF. Faltando dados ou a visualização não está pronta.");
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
          <div className="flex gap-2">
            <Button onClick={handleSaveSession} variant="outline" disabled={!enrichedReport}>
              <Save className="w-4 h-4 mr-2" /> Salvar Sessão
            </Button>
            <Button onClick={handleExportPdf} disabled={!enrichedReport}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border min-h-[80vh]">
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
                    <Button onClick={handleEnrich} disabled={!rawJson || isProcessing} className="w-full">
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
              </div>
              <ScrollArea className="h-full bg-surface-muted p-4 md:p-8">
                {enrichedReport ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <PdfReportRenderer data={enrichedReport} reportRef={reportRef} />
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