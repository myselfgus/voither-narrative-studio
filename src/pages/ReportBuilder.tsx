import React, { useState, useRef } from 'react';
import { FileUp, Bot, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster, toast } from '@/components/ui/sonner';
import UploadJson from '@/components/UploadJson';
import ReportPreview from '@/components/ReportPreview';
import { NarrativeReportData } from '@/types/report';
import { validateReportData } from '@/lib/reportRenderer';
import { getValidationPrompt } from '@/lib/llmPrompts';
import { chatService } from '@/lib/chat';
import { openPrintPreview } from '@/lib/pdf';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
const ReportBuilder: React.FC = () => {
  const [reportData, setReportData] = useState<NarrativeReportData | null>(null);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const reportPreviewRef = useRef<HTMLDivElement>(null);
  const handleJsonParsed = (jsonData: any) => {
    const { valid, errors, normalized } = validateReportData(jsonData);
    if (valid && normalized) {
      setReportData(normalized);
      toast.success('JSON validado e carregado com sucesso.');
    } else {
      toast.error('Erro na validação do JSON.', {
        description: errors.join(' '),
      });
    }
  };
  const handleEnrichWithLLM = async () => {
    if (!reportData) {
      toast.warning('Nenhum dado de relatório para processar.');
      return;
    }
    setIsProcessingLLM(true);
    toast.info('Iniciando orquestração com IA...', {
      description: 'Aguarde enquanto validamos e enriquecemos seu relatório.',
    });
    const prompt = getValidationPrompt(reportData);
    let llmResponseJson = '';
    try {
      await chatService.sendMessage(prompt, 'voither', (chunk) => {
        llmResponseJson += chunk;
      });
      // Clean up potential markdown fences
      const cleanedJson = llmResponseJson.replace(/```json\n|```/g, '').trim();
      const enrichedData = JSON.parse(cleanedJson);
      const { valid, normalized } = validateReportData(enrichedData);
      if (valid && normalized) {
        setReportData(normalized);
        toast.success('Relatório enriquecido pela IA com sucesso!');
      } else {
         throw new Error('A IA retornou um JSON com estrutura inválida.');
      }
    } catch (error) {
      console.error('LLM processing error:', error);
      toast.error('Falha no processamento da IA.', {
        description: 'Não foi possível processar a resposta. Por favor, tente novamente.',
      });
    } finally {
      setIsProcessingLLM(false);
    }
  };
  return (
    <div className="min-h-screen bg-surface-muted dark:bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-brand font-bold text-2xl text-text-primary tracking-tighter">VOITHER</span>
              <span className="font-display font-light text-text-secondary">HealthOS</span>
            </Link>
            <div className="flex items-center gap-4">
              {reportData && (
                <>
                  <Button variant="outline" onClick={() => openPrintPreview(reportPreviewRef.current)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Visualizar PDF
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </>
              )}
              <ThemeToggle className="relative top-0 right-0" />
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5" /> 1. Importar Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <UploadJson onJsonParsed={handleJsonParsed} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> 2. Orquestração IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary mb-4">Use a IA para validar, enriquecer e formatar o conteúdo do seu relatório.</p>
                  <Button onClick={handleEnrichWithLLM} disabled={!reportData || isProcessingLLM} className="w-full">
                    {isProcessingLLM ? 'Processando...' : 'Validar e Enriquecer com IA'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>3. Visualização do Relatório</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto bg-surface-muted p-4 rounded-b-lg">
                  <ReportPreview data={reportData} reportRef={reportPreviewRef} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Toaster richColors closeButton />
    </div>
  );
};
export default ReportBuilder;