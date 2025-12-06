import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FileUp, Bot, Download, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Toaster, toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import UploadJson from '@/components/UploadJson';
import ReportEditor from '@/components/ReportEditor';
import ReportPreview from '@/components/ReportPreview';
import DiffModal from '@/components/DiffModal';
import { NarrativeReportData } from '@/types/report';
import { validateReportData } from '@/lib/reportRenderer';
import { getValidationPrompt } from '@/lib/llmPrompts';
import { chatService } from '@/lib/chat';
import { exportToPdf } from '@/lib/pdf';
import { ThemeToggle } from '@/components/ThemeToggle';
const ReportBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<NarrativeReportData | null>(null);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [preLLMData, setPreLLMData] = useState<string | null>(null);
  const [postLLMData, setPostLLMData] = useState<string | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const reportPreviewRef = useRef<HTMLDivElement>(null);
  const loadSessionData = useCallback(async (id: string) => {
    setIsLoadingSession(true);
    const res = await chatService.loadReportFromSession(id);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      toast.error("Falha ao carregar sessão", { description: res.error });
      navigate('/builder', { replace: true });
    }
    setIsLoadingSession(false);
  }, [navigate]);
  useEffect(() => {
    const currentSessionId = searchParams.get('session');
    if (currentSessionId) {
      if (sessionId !== currentSessionId) {
        setSessionId(currentSessionId);
        chatService.setSessionId(currentSessionId);
        loadSessionData(currentSessionId);
      } else {
        setIsLoadingSession(false);
      }
    } else {
      const newSessionId = chatService.getSessionId();
      setSessionId(newSessionId);
      chatService.setSessionId(newSessionId);
      setReportData(null);
      setIsLoadingSession(false);
    }
  }, [searchParams, sessionId, loadSessionData]);
  const handleJsonParsed = async (jsonData: any) => {
    const { valid, errors, normalized } = validateReportData(jsonData);
    if (valid && normalized) {
      setReportData(normalized);
      toast.success('JSON validado e carregado com sucesso.');
      const res = await chatService.createSession(normalized.reportTitle, normalized);
      if (res.success && res.data) {
        navigate(`/builder?session=${res.data.sessionId}`, { replace: true });
      }
    } else {
      toast.error('Erro na validação do JSON.', { description: errors.join(' ') });
    }
  };
  const handleEnrichWithLLM = async (retryCount = 0): Promise<void> => {
    if (!reportData) {
      toast.warning('Nenhum dado de relatório para processar.');
      return;
    }
    setIsProcessingLLM(true);
    toast.info('Iniciando orquestração com IA...', { id: 'llm-process' });
    const originalDataString = JSON.stringify(reportData, null, 2);
    setPreLLMData(originalDataString);
    const prompt = getValidationPrompt(reportData);
    let llmResponseJson = '';
    try {
      await chatService.sendMessage(prompt, 'voither', (chunk) => {
        llmResponseJson += chunk;
      });
      const cleanedJson = llmResponseJson.replace(/```json\n|```/g, '').trim();
      const enrichedData = JSON.parse(cleanedJson);
      const { valid, normalized } = validateReportData(enrichedData);
      if (valid && normalized) {
        setReportData(normalized);
        setPostLLMData(JSON.stringify(normalized, null, 2));
        toast.success('Relatório enriquecido pela IA!', { id: 'llm-process', description: 'Clique em "Ver Alterações" para revisar.' });
      } else {
        throw new Error('A IA retornou um JSON com estrutura inválida.');
      }
    } catch (error) {
      console.error('LLM processing error:', error);
      if (retryCount < 2) {
        toast.warning(`Tentativa ${retryCount + 1} falhou. Tentando novamente...`, { id: 'llm-process' });
        setTimeout(() => handleEnrichWithLLM(retryCount + 1), 2000 * (retryCount + 1));
        return;
      } else {
        toast.error('Falha no processamento da IA.', { id: 'llm-process', description: 'Por favor, tente novamente mais tarde.' });
      }
    }
    setIsProcessingLLM(false);
  };
  const handleSave = useCallback(async () => {
    if (sessionId && reportData) {
      const res = await chatService.saveReportToSession(sessionId, reportData);
      if (res.success) {
        toast.success("Relatório salvo com sucesso!");
      } else {
        toast.error("Falha ao salvar o relatório.", { description: res.error });
      }
    }
  }, [sessionId, reportData]);
  const renderEditorContent = () => {
    if (isLoadingSession) {
      return <Skeleton className="h-96 w-full" />;
    }
    if (reportData) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <ReportEditor reportData={reportData} onUpdate={setReportData} onSave={handleSave} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Orquestração IA</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary mb-2">Use a IA para validar, enriquecer e formatar o conteúdo.</p>
              <Button onClick={() => handleEnrichWithLLM()} disabled={isProcessingLLM} className="w-full">
                {isProcessingLLM ? 'Processando...' : 'Validar e Enriquecer com IA'}
              </Button>
              {postLLMData && (
                <Button onClick={() => setIsDiffModalOpen(true)} variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" /> Ver Alterações
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5" /> Importar Dados</CardTitle>
          <CardDescription>Comece importando um arquivo JSON com os dados clínicos.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadJson onJsonParsed={handleJsonParsed} />
        </CardContent>
      </Card>
    );
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
                  <Button variant="outline" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
                  <Button onClick={() => exportToPdf(reportPreviewRef.current!, reportData.metadata.paciente_id)}>
                    <Download className="w-4 h-4 mr-2" /> Baixar PDF
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
              {renderEditorContent()}
            </div>
            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Visualização do Relatório</CardTitle></CardHeader>
                <CardContent className="h-[calc(100vh-12rem)] overflow-y-auto bg-surface-muted p-4 rounded-b-lg">
                  <ReportPreview data={reportData} reportRef={reportPreviewRef} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {preLLMData && postLLMData && (
        <DiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          oldData={preLLMData}
          newData={postLLMData}
        />
      )}
      <Toaster richColors closeButton />
    </div>
  );
};
export default ReportBuilder;