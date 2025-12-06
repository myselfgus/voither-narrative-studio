import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Home, FileDown } from 'lucide-react';
import { Toaster, toast } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import TranscriptionInput, { TranscriptionInputs } from '@/components/TranscriptionInput';
import PipelineStages, { PipelineStage } from '@/components/PipelineStages';
import FinalReportPreview from '@/components/FinalReportPreview';
import { chatService } from '@/lib/chat';
import { getASLprompt, getVDLPprompt, getGEMprompt, getNarrativeprompt, getSOAPprompt } from '@/lib/llmPrompts';
import { exportToPdf } from '@/lib/pdf';
import { NarrativeReportData } from '@/types/report';
import { compileFromStages } from '@/lib/reportRenderer';
const initialStages: PipelineStage[] = [
  { name: 'ASL', status: 'pending', progress: 0, output: '' },
  { name: 'VDLP', status: 'pending', progress: 0, output: '' },
  { name: 'GEM', status: 'pending', progress: 0, output: '' },
  { name: 'Narrative', status: 'pending', progress: 0, output: '' },
  { name: 'SOAP', status: 'pending', progress: 0, output: '' },
];
const stagePromptMap = {
  ASL: getASLprompt,
  VDLP: getVDLPprompt,
  GEM: getGEMprompt,
  Narrative: getNarrativeprompt,
  SOAP: getSOAPprompt,
};
interface SessionData {
  inputs: Partial<TranscriptionInputs>;
  stages: PipelineStage[];
}
const ReportBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Partial<TranscriptionInputs>>({});
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalReport, setFinalReport] = useState<NarrativeReportData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const loadSession = useCallback(async (id: string) => {
    const res = await chatService.loadReportFromSession(id);
    if (res.success && res.data) {
      const sessionData = res.data as SessionData;
      setInputs(sessionData.inputs || {});
      setStages(sessionData.stages || initialStages);
      if (sessionData.stages?.every(s => s.status === 'complete')) {
        const compiledReport = compileFromStages(sessionData.stages, sessionData.inputs as TranscriptionInputs);
        setFinalReport(compiledReport);
      }
    } else {
      setInputs({});
      setStages(initialStages);
      setFinalReport(null);
      navigate('/builder', { replace: true });
    }
  }, [navigate]);
  useEffect(() => {
    const currentSessionId = searchParams.get('session');
    if (currentSessionId) {
      if (sessionId !== currentSessionId) {
        setSessionId(currentSessionId);
        chatService.setSessionId(currentSessionId);
        loadSession(currentSessionId);
      }
    } else {
      const newId = chatService.getSessionId();
      setSessionId(newId);
      chatService.setSessionId(newId);
      setInputs({});
      setStages(initialStages);
      setFinalReport(null);
    }
  }, [searchParams, sessionId, loadSession]);
  const handleInputsChange = useCallback((newInputs: Partial<TranscriptionInputs>) => {
    setInputs(prev => ({ ...prev, ...newInputs }));
  }, []);
  const saveSession = useCallback(async () => {
    if (sessionId) {
      const dataToSave: SessionData = { inputs, stages };
      await chatService.saveReportToSession(sessionId, dataToSave);
    }
  }, [sessionId, inputs, stages]);
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Object.keys(inputs).length > 0 || stages.some(s => s.status !== 'pending')) {
        saveSession();
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [inputs, stages, saveSession]);
  const handleStartAnalysis = async (data: TranscriptionInputs) => {
    setIsProcessing(true);
    setFinalReport(null);
    abortControllerRef.current = new AbortController();
    let currentSessionId = sessionId;
    if (!currentSessionId || !searchParams.get('session')) {
        const newId = chatService.getSessionId();
        chatService.setSessionId(newId);
        await chatService.createSession(`Análise de ${data.patientId}`);
        setSessionId(newId);
        currentSessionId = newId;
        navigate(`/builder?session=${newId}`, { replace: true });
    }
    setStages(initialStages.map(s => ({...s, output: ''})));
    toast.info("Iniciando análise...", { description: "O uso de IA está sujeito a limites de requisição." });
    try {
      let prevOutput = '';
      const completedStages: PipelineStage[] = [];
      for (let i = 0; i < initialStages.length; i++) {
        if (abortControllerRef.current.signal.aborted) break;
        const stageName = initialStages[i].name;
        setStages(prev => prev.map(s => s.name === stageName ? { ...s, status: 'running', progress: 50, output: '' } : s));
        const promptFn = stagePromptMap[stageName];
        const prompt = promptFn(data.transcription, data.patientId, prevOutput, data);
        const { success, output } = await chatService.sendMessage(prompt, 'voither', (chunk) => {
          setStages(prev => prev.map(s => s.name === stageName ? { ...s, output: s.output + chunk } : s));
        }, { signal: abortControllerRef.current.signal });
        if (abortControllerRef.current.signal.aborted) {
          toast.info("Análise abortada.");
          setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'pending', progress: 0 } : s));
          break;
        }
        if (success && output) {
          const completedStage = { name: stageName, status: 'complete' as const, progress: 100, output };
          setStages(prev => prev.map(s => s.name === stageName ? completedStage : s));
          completedStages.push(completedStage);
          prevOutput = output;
          if (stageName === 'Narrative') {
            const compiled = compileFromStages(completedStages, data);
            setFinalReport(compiled);
          }
        } else {
          setStages(prev => prev.map(s => s.name === stageName ? { ...s, status: 'error', progress: 100, output: "Falha na análise." } : s));
          toast.error(`Erro na etapa ${stageName}.`);
          break;
        }
      }
    } catch (error) {
      console.error("An error occurred during analysis:", error);
      toast.error("Ocorreu um erro inesperado durante a análise.");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };
  const handleExportPdf = () => {
    if (reportRef.current && inputs.patientId) {
      toast.info("Gerando PDF...");
      exportToPdf(reportRef.current, `voither-report-${inputs.patientId}`);
    } else {
      toast.error("Não foi possível gerar o PDF. Dados ausentes.");
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-surface-muted dark:bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-brand font-bold text-2xl text-text-primary tracking-tighter">VOITHER</span>
              <span className="font-display font-light text-text-secondary">HealthOS</span>
            </Link>
            <div className="flex items-center gap-4">
              {finalReport && (
                <Button onClick={handleExportPdf} disabled={!finalReport}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Gerar PDF
                </Button>
              )}
              <Link to="/" className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <Home className="w-4 h-4" />
                Página Inicial
              </Link>
              <ThemeToggle className="relative top-0 right-0" />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="py-8 md:py-10 lg:py-12 h-full">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 h-full">
              <div className="lg:overflow-y-auto">
                <TranscriptionInput
                  initialData={inputs}
                  onStartAnalysis={handleStartAnalysis}
                  onInputsChange={handleInputsChange}
                  isProcessing={isProcessing}
                />
              </div>
              <div className="lg:overflow-y-auto h-[80vh] lg:h-auto">
                {finalReport ? (
                  <FinalReportPreview data={finalReport} reportRef={reportRef} />
                ) : (
                  <PipelineStages stages={stages} patientId={inputs.patientId} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
};
export default ReportBuilder;