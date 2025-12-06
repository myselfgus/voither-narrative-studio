import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, ArrowLeft, Edit, Archive, Mic, Bot, FileArchive } from 'lucide-react';
import { motion } from 'framer-motion';
import { NarrativeReportData } from '@/types/report';
import { generateCoverThumbnail } from '@/lib/pdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateReportHtml } from '@/lib/reportHtml';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  context: string;
  crm: string;
  updated_at: number;
}
interface Session {
  session_id: string;
  title: string;
  last_active: number;
  report: string; // JSON string
}
interface Document {
  id: string;
  type: 'pdf' | 'video' | 'audio';
  url: string;
  name: string;
  timestamp: number;
  insight?: string;
}
const PatientDashboard: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const res = await chatService.getPatient(patientId);
    if (res.success && res.data) {
      setPatient(res.data.patient);
      setSessions(res.data.sessions);
      const allDocs: Document[] = res.data.sessions.flatMap((s: Session) => {
        try {
          const report = JSON.parse(s.report);
          const recordings = (report?.report?.recordings || report?.recordings || []).map((r: any) => ({
            id: `${s.session_id}-${r.timestamp}`,
            type: r.type,
            url: r.url,
            name: `Recording from ${new Date(r.timestamp).toLocaleDateString()}`,
            timestamp: r.timestamp,
          }));
          const pdfs = [{
            id: s.session_id,
            type: 'pdf',
            url: `/builder?session=${s.session_id}`,
            name: s.title,
            timestamp: s.last_active * 1000,
          }];
          return [...pdfs, ...recordings];
        } catch { return []; }
      });
      setDocuments(allDocs);
      console.log('PatientDashboard isolation: Loaded JOINed data for patient_id', patientId, 'with', allDocs.length, 'documents');
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
    setIsGenerating(true);
    toast.info("Generating patient summary...");
    const prompt = `Summarize key patterns from this patient's sessions: ${JSON.stringify(sessions)}. Provide a concise summary as a single string.`;
    const { success, output } = await chatService.sendMessage(prompt, 'voither');
    if (success && output) {
      setSummary(output);
      toast.success("Summary generated!");
      console.log("GenAI Patient Dashboard: Summary and insights for patient", patient.id);
    } else {
      toast.error("Failed to generate summary.");
    }
    setIsGenerating(false);
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
          <p className="text-muted-foreground font-mono">{patient.patient_id} • {patient.crm}</p>
        </div>
        <Button onClick={generateSummary} disabled={isGenerating}><Bot className="w-4 h-4 mr-2" /> {isGenerating ? 'Generating...' : 'Generate Summary'}</Button>
      </div>
      {summary && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8 glass rounded-macos">
            <CardHeader><CardTitle>AI Summary</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{summary}</p></CardContent>
          </Card>
        </motion.div>
      )}
      <Card className="glass rounded-macos">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive /> Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <motion.div key={doc.id} className="group hover-elevate">
                  <Card className="h-full">
                    <CardContent className="p-4">
                      {doc.type === 'video' && <video src={doc.url} className="w-full aspect-video rounded-md bg-black object-cover" controls aria-label={`Video recording from ${new Date(doc.timestamp).toLocaleDateString()}`} />}
                      {doc.type === 'audio' && <audio src={doc.url} className="w-full" controls aria-label={`Audio recording from ${new Date(doc.timestamp).toLocaleDateString()}`} />}
                      {doc.type === 'pdf' && <Link to={doc.url} className="block"><div className="aspect-video bg-surface-subtle rounded-md flex items-center justify-center text-muted-foreground">PDF Preview</div></Link>}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">{doc.name}</div>
                      <Badge variant="outline">{doc.type}</Badge>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium text-muted-foreground">No documents found.</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};
export default PatientDashboard;