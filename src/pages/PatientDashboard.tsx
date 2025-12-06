import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, ArrowLeft, Edit, Archive, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { NarrativeReportData } from '@/types/report';
import { generateCoverThumbnail } from '@/lib/pdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateReportHtml } from '@/lib/reportHtml';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
interface Recording {
  url: string;
  type: 'audio' | 'video';
  duration: number;
  timestamp: number;
}
const SessionThumbnail: React.FC<{ reportData: NarrativeReportData | null }> = ({ reportData }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!reportData) return;
    let isMounted = true;
    const generate = async () => {
      const url = await generateCoverThumbnail(reportData);
      if (isMounted) setThumbnailUrl(url);
    };
    generate();
    return () => { isMounted = false; };
  }, [reportData]);
  if (!reportData) {
    return <div className="aspect-[3/4] bg-surface-subtle rounded-md flex items-center justify-center text-center p-2 text-xs text-muted-foreground">No preview available</div>;
  }
  return (
    <div className="aspect-[3/4] bg-surface-subtle rounded-md flex items-center justify-center overflow-hidden">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`Preview of ${reportData?.reportTitle}`} className="w-full h-full object-cover" />
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
};
const PatientDashboard: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const res = await chatService.getPatient(patientId);
    if (res.success && res.data) {
      setPatient(res.data.patient);
      setSessions(res.data.sessions);
      const allRecordings = (res.data.sessions as Session[]).flatMap(s => {
        try {
          const report = JSON.parse(s.report);
          return report?.report?.recordings || report?.recordings || [];
        } catch {
          return [];
        }
      }).filter(r => r.url && r.type);
      setRecordings(allRecordings);
      console.log('Loaded recordings for patient:', allRecordings);
    } else {
      toast.error('Failed to load patient data.', { description: res.error });
    }
    setLoading(false);
  }, [patientId]);
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);
  const handleExportAll = async () => {
    if (!sessions.length) return;
    const toastId = toast.loading("Preparing all reports for download...");
    const zip = new JSZip();
    const { default: html2pdf } = await import('html2pdf.js');
    let fileCount = 0;
    for (const session of sessions) {
      try {
        const reportContainer = JSON.parse(session.report);
        const reportData = reportContainer.report;
        if (reportData) {
          const htmlString = generateReportHtml(reportData);
          const pdfBlob = await html2pdf().from(htmlString).set({
            margin: 0,
            filename: `voither-report-${reportData.metadata.paciente_id}-${session.session_id}.pdf`,
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).output('blob');
          zip.file(`session_${session.session_id}/report.pdf`, pdfBlob);
          fileCount++;
        }
        const sessionRecordings = reportData?.recordings || reportContainer?.recordings || [];
        if (sessionRecordings) {
          for (const [index, rec] of sessionRecordings.entries()) {
            const base64Data = rec.url.split(',')[1];
            if (base64Data) {
              const fileExtension = rec.type === 'video' ? 'webm' : 'webm';
              zip.file(`session_${session.session_id}/recording_${index + 1}.${fileExtension}`, base64Data, { base64: true });
              fileCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process session ${session.session_id} for zip export.`, error);
      }
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, `voither-patient-${patient?.patient_id}-exports.zip`);
      toast.success("All reports and recordings downloaded.", { id: toastId });
      console.log(`Exported ZIP for patient ${patientId} with ${fileCount} files.`);
    });
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
        <Button onClick={handleExportAll} disabled={!sessions.length}><Archive className="w-4 h-4 mr-2" /> Export All as ZIP</Button>
      </div>
      <h2 className="text-2xl font-bold font-display mb-6">Sessions ({sessions.length})</h2>
      {sessions.length > 0 ? (
        <motion.div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
          {sessions.map(session => {
            let reportData: NarrativeReportData | null = null;
            let sessionRecordings: Recording[] = [];
            try {
              const parsedReport = JSON.parse(session.report);
              reportData = parsedReport?.report as NarrativeReportData;
              sessionRecordings = parsedReport?.report?.recordings || parsedReport?.recordings || [];
            } catch (e) { /* Gracefully fail */ }
            return (
              <motion.div key={session.session_id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="truncate">{session.title}</CardTitle>
                    <div className="flex justify-between items-center">
                      <CardDescription>{format(new Date(session.last_active * 1000), "dd/MM/yyyy 'at' HH:mm", { locale: ptBR })}</CardDescription>
                      {sessionRecordings.length > 0 && <Badge variant="secondary">{sessionRecordings.length} rec.</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow"><SessionThumbnail reportData={reportData} /></CardContent>
                  <CardFooter className="flex justify-between items-center"><Button asChild variant="outline" size="sm"><Link to={`/builder?session=${session.session_id}`}><Edit className="w-4 h-4 mr-2" /> Open</Link></Button></CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold text-text-secondary">No sessions found for this patient.</h2>
          <p className="mt-2 text-text-tertiary">Create a new report to add a session.</p>
          <Button asChild className="mt-4"><Link to="/builder">Create New Session</Link></Button>
        </div>
      )}
      <Card className="mt-8">
        <CardHeader><CardTitle>Recordings ({recordings.length})</CardTitle><CardDescription>All audio and video recordings associated with this patient.</CardDescription></CardHeader>
        <CardContent>
          {recordings.length > 0 ? (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              {recordings.map((rec, i) => (
                <motion.div key={i} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <Card>
                    <CardContent className="p-4">
                      {rec.type === 'video' ? (
                        <video src={rec.url} controls className="w-full aspect-video rounded-md bg-black" />
                      ) : (
                        <audio src={rec.url} controls className="w-full" />
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{new Date(rec.timestamp).toLocaleString()}</span>
                        <Select defaultValue="1" onValueChange={v => { const media = document.querySelector(`[src="${rec.url}"]`) as HTMLMediaElement; if (media) media.playbackRate = parseFloat(v); }}>
                          <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="0.5">0.5x</SelectItem><SelectItem value="1">1x</SelectItem><SelectItem value="1.5">1.5x</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium text-muted-foreground">No recordings found.</h3>
              <Button asChild className="mt-4"><Link to="/recordings"><Mic className="w-4 h-4 mr-2" />Record First Audio/Video</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};
export default PatientDashboard;