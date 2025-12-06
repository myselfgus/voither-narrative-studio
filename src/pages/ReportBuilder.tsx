import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDebounce } from 'react-use';
import { Save, FileDown, Edit, XCircle, Bot, FileText } from 'lucide-react';
import { Toaster, toast } from '@/components/ui/sonner';
import TranscriptionInput, { TranscriptionInputs } from '@/components/TranscriptionInput';
import PipelineStages, { PipelineStage } from '@/components/PipelineStages';
import FinalReportPreview from '@/components/FinalReportPreview';
import ReportEditor from '@/components/ReportEditor';
import { chatService } from '@/lib/chat';
import { getASLprompt, getVDLPprompt, getGEMprompt, getNarrativeprompt, getSOAPprompt } from '@/lib/llmPrompts';
import { NarrativeReportData } from '@/types/report';
import { compileFromStages } from '@/lib/reportRenderer';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const initialStages: PipelineStage[] = [
  { name: 'ASL', status: 'pending', progress: 0, output: '' },
  { name: 'VDLP', status: 'pending', progress: 0, output: '' },
  { name: 'GEM', status: 'pending', progress: 0, output: '' },
  { name: 'Narrative', status: 'pending', progress: 0, output: '' },
  { name: 'SOAP', status: 'pending', progress: 0, output: '' },
];
const stagePromptMap: Record<PipelineStage['name'], (transcription: string, patientId: string, prevOutput?: string, inputs?: Partial<TranscriptionInputs>) => string> = {
  ASL: getASLprompt,
  VDLP: getVDLPprompt,
  GEM: getGEMprompt,
  Narrative: getNarrativeprompt,
  SOAP: getSOAPprompt,
};
interface SessionData {
  inputs: Partial<TranscriptionInputs>;
  stages: PipelineStage[];
  lastSaved?: number;
  report?: NarrativeReportData;
}
const ReportBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Partial<TranscriptionInputs>>({});
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalReport, setFinalReport] = useState<NarrativeReportData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>('No session loaded.');
  const abortControllerRef = useRef<AbortController | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const loadSession = useCallback(async (id: string) => {
    const res = await chatService.loadReportFromSession(id);
    if (res.success && res.data) {
      const sessionData = res.data as SessionData;
      setInputs(sessionData.inputs || {});
      setStages(sessionData.stages || initialStages);
      if (sessionData.report) {
        setFinalReport(sessionData.report);
      } else if (sessionData.stages?.every(s => s.status === 'complete')) {
        const compiledReport = compileFromStages(sessionData.stages, sessionData.inputs as TranscriptionInputs);
        setFinalReport(compiledReport);
      }
      const lastSavedText = sessionData.lastSaved ? formatDistanceToNow(new Date(sessionData.lastSaved), { addSuffix: true, locale: ptBR }) : 'never';
      setSessionStatus(`Last saved: ${lastSavedText}`);
    } else {
      setInputs({});
      setStages(initialStages);
      setFinalReport(null);
      setSessionStatus('New unsaved session.');
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
      setSessionStatus('New unsaved session.');
    }
  }, [searchParams, sessionId, loadSession]);
  const handleInputsChange = useCallback((newInputs: Partial<TranscriptionInputs>) => {
    setInputs(prev => ({ ...prev, ...newInputs }));
  }, []);
  const saveSession = useCallback(async () => {
    if (sessionId) {
      const dataToSave: SessionData = { inputs, stages, report: finalReport || undefined, lastSaved: Date.now() };
      const res = await chatService.saveReportToSession(sessionId, dataToSave);
      if (res.success) {
        toast.success("Session saved!");
        setSessionStatus(`Last saved: just now`);
      } else {
        toast.error("Failed to save session.");
      }
    }
  }, [sessionId, inputs, stages, finalReport]);
  useDebounce(() => {
    if (sessionId && (stages.some(s => s.status === 'complete') || Object.keys(inputs).length > 0)) {
      saveSession();
    }
  }, 10000, [stages, inputs, saveSession]);
  const handleStartAnalysis = async (data: TranscriptionInputs) => {
    setIsProcessing(true);
    setFinalReport(null);
    setIsEditing(false);
    abortControllerRef.current = new AbortController();
    let currentSessionId = sessionId;
    if (!searchParams.get('session')) {
        const newId = chatService.getSessionId();
        chatService.setSessionId(newId);
        await chatService.createSession(`Análise de ${data.patientId}`);
        setSessionId(newId);
        currentSessionId = newId;
        navigate(`/builder?session=${newId}`, { replace: true });
    }
    await chatService.saveApiKey(currentSessionId!, data.apiKey);
    setStages(initialStages.map(s => ({...s, output: ''})));
    toast.info("Starting analysis...", { description: "AI usage is subject to request limits." });
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
          setStages(prev => prev.map(s => s.name === stageName ? { ...s, output: (s.output || '') + chunk } : s));
        }, { signal: abortControllerRef.current.signal, apiKey: data.apiKey });
        if (abortControllerRef.current.signal.aborted) {
          toast.info("Analysis aborted.");
          setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'pending', progress: 0 } : s));
          break;
        }
        if (success && output) {
          const completedStage = { name: stageName, status: 'complete' as const, progress: 100, output };
          setStages(prev => prev.map(s => s.name === stageName ? completedStage : s));
          completedStages.push(completedStage);
          prevOutput = JSON.stringify({ summary: `Output from ${stageName}`, content: output.substring(0, 500) });
          if (stageName === 'Narrative' || stageName === 'SOAP') {
            const compiled = compileFromStages(completedStages, data);
            setFinalReport(compiled);
          }
        } else {
          setStages(prev => prev.map(s => s.name === stageName ? { ...s, status: 'error', progress: 100, output: "Analysis failed." } : s));
          toast.error(`Error in stage ${stageName}.`, { description: "Check console for details or try again." });
          break;
        }
      }
      if (!abortControllerRef.current.signal.aborted) {
        toast.success("Analysis complete!", { description: "The final report has been generated." });
        await saveSession();
      }
    } catch (error) {
      console.error("An error occurred during analysis:", error);
      toast.error("An unexpected error occurred during analysis.");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  const handleExportPdf = async () => {
    if (reportRef.current && inputs.patientId) {
      toast.info("Generating PDF...");
      const { exportToPdf } = await import('@/lib/pdf');
      exportToPdf(reportRef.current, `voither-report-${inputs.patientId}`);
    } else {
      toast.error("Could not generate PDF. Missing data or preview not ready.");
    }
  };
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl text-text-primary">Report Builder</h1>
            <p className="text-muted-foreground text-sm">{sessionStatus}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSession} variant="outline" disabled={isProcessing}>
              <Save className="w-4 h-4 mr-2" /> Save Session
            </Button>
            {isProcessing && (
              <Button onClick={handleAbort} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" /> Abort
              </Button>
            )}
          </div>
        </div>
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border min-h-[80vh]">
          <ResizablePanel defaultSize={40} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-4">
                <TranscriptionInput
                  initialData={inputs}
                  onStartAnalysis={handleStartAnalysis}
                  onInputsChange={handleInputsChange}
                  isProcessing={isProcessing}
                />
              </div>
            </ScrollArea>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              <div className="p-2 border-b flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {finalReport ? <FileText className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-primary" />}
                  <h2 className="font-semibold">{finalReport ? "Final Report Preview" : "Analysis Pipeline"}</h2>
                </div>
                {finalReport && (
                  <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(!isEditing)} variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" /> {isEditing ? "View Preview" : "Edit Report"}
                    </Button>
                    <Button onClick={handleExportPdf} size="sm">
                      <FileDown className="w-4 h-4 mr-2" /> Export PDF
                    </Button>
                  </div>
                )}
              </div>
              <ScrollArea className="h-full">
                <div className="p-4">
                  {finalReport ? (
                    isEditing ? (
                      <ReportEditor
                        reportData={finalReport}
                        onUpdate={setFinalReport}
                        onSave={saveSession}
                      />
                    ) : (
                      <FinalReportPreview data={finalReport} reportRef={reportRef} />
                    )
                  ) : (
                    <PipelineStages stages={stages} patientId={inputs.patientId} />
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Toaster richColors closeButton />
    </AppLayout>
  );
};
export default ReportBuilder;