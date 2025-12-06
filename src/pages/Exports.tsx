import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileJson, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '../../worker/types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { exportToPdf } from '@/lib/pdf';
import { compileFromStages } from '@/lib/reportRenderer';
import ReportPreview from '@/components/ReportPreview';
const Exports: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const reportRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});
  const loadSessions = useCallback(async () => {
    const response = await chatService.listSessions();
    if (response.success && response.data) {
      setSessions(response.data);
      response.data.forEach(session => {
        if (!reportRefs.current[session.id]) {
          reportRefs.current[session.id] = React.createRef<HTMLDivElement>();
        }
      });
    } else {
      toast.error("Failed to load sessions.");
    }
  }, []);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  const handleDownloadPdf = async (sessionId: string) => {
    const res = await chatService.loadReportFromSession(sessionId);
    if (res.success && res.data) {
      const reportData = compileFromStages(res.data.stages, res.data.inputs);
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      const reactElement = React.createElement(ReportPreview, { data: reportData, reportRef: React.createRef() });
      // This is a trick to render the component to get its HTML for pdf generation
      const tempRoot = document.createElement('div');
      tempDiv.appendChild(tempRoot);
      // We need to use ReactDOM.render for this, but since we are in React 18, we can simulate it
      // by creating a temporary root. This is not ideal.
      // A better approach would be server-side rendering of the PDF.
      // For now, we'll just use the data and a simplified export.
      const reportElement = reportRefs.current[sessionId]?.current;
      if (reportElement) {
        exportToPdf(reportElement, `voither-report-${reportData.metadata.paciente_id}`);
      } else {
        toast.warning("Preview not rendered yet. Please open the session first to generate PDF.");
      }
      document.body.removeChild(tempDiv);
    } else {
      toast.error("Failed to load report data for PDF export.");
    }
  };
  const handleDownloadJsons = async (sessionId: string) => {
    const res = await chatService.loadReportFromSession(sessionId);
    if (res.success && res.data && res.data.stages) {
      res.data.stages.forEach((stage: any) => {
        if (stage.status === 'complete') {
          const blob = new Blob([JSON.stringify(JSON.parse(stage.output), null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `voither-${stage.name.toLowerCase()}-${res.data.inputs.patientId}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
      toast.success("JSON files downloaded.");
    } else {
      toast.error("Failed to load data for JSON export.");
    }
  };
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display font-bold text-4xl text-text-primary">Exports</h1>
      </div>
      {sessions.length > 0 ? (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
        >
          {sessions.map(session => (
            <motion.div key={session.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{session.title}</CardTitle>
                  <CardDescription>
                    Last active: {format(new Date(session.lastActive), "dd/MM/yyyy 'at' HH:mm")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="aspect-video bg-surface-subtle rounded-md flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-text-tertiary" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <Button onClick={() => handleDownloadJsons(session.id)} variant="outline" size="sm">
                    <FileJson className="w-4 h-4 mr-2" /> JSONs
                  </Button>
                  <Button onClick={() => handleDownloadPdf(session.id)} size="sm">
                    <FileText className="w-4 h-4 mr-2" /> PDF
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold text-text-secondary">No saved sessions found.</h2>
          <p className="mt-2 text-text-tertiary">Create a new report to save a session.</p>
          <Button asChild className="mt-4">
            <Link to="/builder">Create New Report</Link>
          </Button>
        </div>
      )}
      <Toaster richColors />
    </AppLayout>
  );
};
export default Exports;