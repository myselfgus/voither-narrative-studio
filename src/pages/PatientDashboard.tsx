import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, ArrowLeft, Download, Edit, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { NarrativeReportData } from '@/types/report';
import { generateCoverThumbnail } from '@/lib/pdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateReportHtml } from '@/lib/reportHtml';
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
const SessionThumbnail: React.FC<{ reportData: NarrativeReportData }> = ({ reportData }) => {
  const [thumbnailUrl, setThumbnailUrl] useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      const url = await generateCoverThumbnail(reportData);
      if (isMounted) setThumbnailUrl(url);
    };
    generate();
    return () => { isMounted = false; };
  }, [reportData]);
  return (
    <div className="aspect-[3/4] bg-surface-subtle rounded-md flex items-center justify-center overflow-hidden">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`Preview of ${reportData.reportTitle}`} className="w-full h-full object-cover" />
      ) : (
        <div className="animate-pulse w-full h-full bg-surface-muted" />
      )}
    </div>
  );
};
const PatientDashboard: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const res = await chatService.getPatient(patientId);
    if (res.success && res.data) {
      setPatient(res.data.patient);
      setSessions(res.data.sessions);
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
    toast.info("Preparing all reports for download...");
    const zip = new JSZip();
    const { default: html2pdf } = await import('html2pdf.js');
    for (const session of sessions) {
      try {
        const reportData = JSON.parse(session.report);
        const htmlString = generateReportHtml(reportData.report);
        const pdfBlob = await html2pdf().from(htmlString).set({
          margin: 0,
          filename: `voither-report-${reportData.report.metadata.paciente_id}-${session.session_id}.pdf`,
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).output('blob');
        zip.file(`session_${session.session_id}.pdf`, pdfBlob);
      } catch (error) {
        console.error(`Failed to process session ${session.session_id} for zip export.`, error);
      }
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, `voither-patient-${patient?.patient_id}-exports.zip`);
      toast.success("All reports downloaded.");
    });
  };
  if (loading) {
    return <AppLayout><div className="text-center p-12">Loading patient data...</div></AppLayout>;
  }
  if (!patient) {
    return <AppLayout><div className="text-center p-12">Patient not found.</div></AppLayout>;
  }
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <Button asChild variant="ghost" className="mb-2 -ml-4">
              <Link to="/patients"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory</Link>
            </Button>
            <h1 className="font-display font-bold text-4xl text-text-primary flex items-center gap-3">
              <User className="w-8 h-8" />
              {patient.name}
            </h1>
            <p className="text-muted-foreground font-mono">{patient.patient_id} • {patient.crm}</p>
          </div>
          <Button onClick={handleExportAll} disabled={!sessions.length}>
            <Archive className="w-4 h-4 mr-2" /> Export All as ZIP
          </Button>
        </div>
        <h2 className="text-2xl font-bold font-display mb-6">Sessions ({sessions.length})</h2>
        {sessions.length > 0 ? (
          <motion.div
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {sessions.map(session => {
              const reportData = JSON.parse(session.report)?.report as NarrativeReportData;
              return (
                <motion.div key={session.session_id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="truncate">{session.title}</CardTitle>
                      <CardDescription>
                        {format(new Date(session.last_active), "dd/MM/yyyy 'at' HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      {reportData ? <SessionThumbnail reportData={reportData} /> : <div className="aspect-[3/4] bg-surface-muted rounded-md" />}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/builder?session=${session.session_id}`}><Edit className="w-4 h-4 mr-2" /> Open</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold text-text-secondary">No sessions found for this patient.</h2>
            <p className="mt-2 text-text-tertiary">Create a new report to add a session.</p>
            <Button asChild className="mt-4">
              <Link to="/builder">Create New Session</Link>
            </Button>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};
export default PatientDashboard;