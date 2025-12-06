import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat';
import { User, ArrowLeft, Bot, FileArchive, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  context: string;
  updated_at: number;
}
interface Session {
  session_id: string;
  title: string;
  last_active: number;
  report: string; // JSON string
  clinician_name?: string;
  crm?: string;
}
interface Document {
  id: string;
  type: 'pdf' | 'video' | 'audio';
  url: string;
  name: string;
  timestamp: number;
  insight?: string;
  isGeneratingInsight?: boolean;
  metadata?: {
    clinician_name?: string;
    crm?: string;
  };
}
const PatientDashboard: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const res = await chatService.getPatient(patientId);
    if (res.success && res.data) {
      setPatient(res.data.patient);
      const sessionsWithClinician: Session[] = res.data.sessions.map((s: Session) => {
        try {
          const report = JSON.parse(s.report || '{}');
          const clinician = report?.metadata?.clinician || {};
          return { ...s, clinician_name: clinician.name, crm: clinician.crm };
        } catch {
          return s;
        }
      });
      const allDocs: Document[] = sessionsWithClinician.flatMap((s: Session) => {
        try {
          const report = JSON.parse(s.report);
          const recordings = (report?.report?.recordings || report?.recordings || []).map((r: any) => ({
            id: `${s.session_id}-${r.timestamp}`, type: r.type, url: r.url,
            name: `Recording from ${new Date(r.timestamp).toLocaleDateString()}`,
            timestamp: r.timestamp,
          }));
          const pdfs = [{
            id: s.session_id, type: 'pdf', url: `/builder?session=${s.session_id}`,
            name: s.title, timestamp: s.last_active * 1000,
            metadata: { clinician_name: s.clinician_name, crm: s.crm }
          }];
          return [...pdfs, ...recordings];
        } catch { return []; }
      });
      setDocuments(allDocs);
    } else {
      toast.error('Failed to load patient data.', { description: res.error });
    }
    setLoading(false);
  }, [patientId]);
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);
  const generateSummary = async () => {
    if (!patient) return;
    setIsGeneratingSummary(true);
    toast.info("Generating patient summary...");
    const res = await chatService.getPatient(patient.id);
    if (!res.success) {
      toast.error("Could not fetch latest session data for summary.");
      setIsGeneratingSummary(false);
      return;
    }
    const prompt = `Summarize key patterns from this patient's sessions: ${JSON.stringify(res.data.sessions)}. Provide a concise summary as a single string.`;
    const { success, output } = await chatService.sendMessage(prompt, 'voither');
    if (success && output) {
      setSummary(output);
      toast.success("Summary generated!");
      console.log("GenAI Patient Dashboard: Summary and insights for patient", patient.id);
    } else {
      toast.error("Failed to generate summary.");
    }
    setIsGeneratingSummary(false);
  };
  const generateInsightForDoc = async (docId: string) => {
    setDocuments(docs => docs.map(d => d.id === docId ? { ...d, isGeneratingInsight: true } : d));
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const prompt = `Generate a concise clinical insight for this document: Type: ${doc.type}, Name: ${doc.name}, URL/Reference: ${doc.url}.`;
    const { success, output } = await chatService.sendMessage(prompt, 'voither');
    if (success && output) {
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, insight: output, isGeneratingInsight: false } : d));
      toast.success("Insight generated!");
    } else {
      toast.error("Failed to generate insight.");
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, isGeneratingInsight: false } : d));
    }
  };
  if (loading) {
    return <AppLayout><div className="text-center p-12"><Skeleton className="h-10 w-64 mx-auto mb-4" /><Skeleton className="h-6 w-48 mx-auto" /></div></AppLayout>;
  }
  if (!patient) {
    return <AppLayout><div className="text-center p-12">Patient not found.</div></AppLayout>;
  }
  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-4"><Link to="/patients"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory</Link></Button>
          <h1 className="font-display font-bold text-4xl text-text-primary flex items-center gap-3"><User className="w-8 h-8" />{patient.name}</h1>
          <p className="text-muted-foreground font-mono">{patient.patient_id}</p>
        </div>
        <Button onClick={generateSummary} disabled={isGeneratingSummary}><Bot className="w-4 h-4 mr-2" /> {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}</Button>
      </div>
      {summary && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8 glass rounded-macos"><CardHeader><CardTitle>AI Summary</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{summary}</p></CardContent></Card>
        </motion.div>
      )}
      <Card className="glass rounded-macos">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive /> Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <motion.div key={doc.id} className="group hover-elevate flex flex-col">
                  <Card className="h-full flex flex-col">
                    <CardContent className="p-4">
                      {doc.type === 'video' && <video src={doc.url} className="w-full aspect-video rounded-md bg-black object-cover" controls aria-label={`Video recording from ${new Date(doc.timestamp).toLocaleDateString()}`} />}
                      {doc.type === 'audio' && <audio src={doc.url} className="w-full" controls aria-label={`Audio recording from ${new Date(doc.timestamp).toLocaleDateString()}`} />}
                      {doc.type === 'pdf' && <Link to={doc.url} className="block"><div className="aspect-video bg-surface-subtle rounded-md flex items-center justify-center text-muted-foreground">PDF Preview</div></Link>}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2">
                      <div className="flex justify-between w-full items-center">
                        <span className="text-xs text-muted-foreground truncate">{doc.name}</span>
                        <Badge variant="outline">{doc.type}</Badge>
                      </div>
                      {doc.insight && <p className="text-xs text-muted-foreground mt-2 p-2 bg-surface-subtle rounded-md w-full">{doc.insight}</p>}
                      <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => generateInsightForDoc(doc.id)} disabled={doc.isGeneratingInsight}>
                        {doc.isGeneratingInsight ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Bot className="w-3 h-3 mr-2" />}
                        {doc.isGeneratingInsight ? 'Generating...' : 'Generate Insight'}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg"><h3 className="text-lg font-medium text-muted-foreground">No documents found.</h3></div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};
export default PatientDashboard;