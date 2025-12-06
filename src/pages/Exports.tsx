import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileJson, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '../../worker/types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { generateCoverThumbnail } from '@/lib/pdf';
import { compileFromStages } from '@/lib/reportRenderer';
import { generateReportHtml } from '@/lib/reportHtml';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
const SessionThumbnail: React.FC<{ session: SessionInfo }> = ({ session }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    const generateThumbnail = async () => {
      try {
        const res = await chatService.loadReportFromSession(session.id);
        if (isMounted && res.success && res.data) {
          const reportData = res.data.report || compileFromStages(res.data.stages, res.data.inputs);
          if (reportData) {
            const url = await generateCoverThumbnail(reportData);
            setThumbnailUrl(url);
          }
        }
      } catch (error) {
        console.error("Failed to generate thumbnail for session:", session.id, error);
      }
    };
    generateThumbnail();
    return () => { isMounted = false; };
  }, [session.id]);
  return (
    <div className="aspect-[3/4] bg-surface-subtle rounded-md flex items-center justify-center overflow-hidden">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`Preview of ${session.title}`} className="w-full h-full object-cover" />
      ) : (
        <div className="animate-pulse w-full h-full bg-surface-muted" />
      )}
    </div>
  );
};
const Exports: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const loadSessions = useCallback(async () => {
    const response = await chatService.listSessions();
    if (response.success && response.data) {
      setSessions(response.data);
    } else {
      toast.error("Failed to load sessions.");
    }
  }, []);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  const handleDownloadPdf = async (sessionId: string) => {
    toast.info("Generating PDF...");
    try {
      const res = await chatService.loadReportFromSession(sessionId);
      if (res.success && res.data) {
        const reportData = res.data.report || compileFromStages(res.data.stages, res.data.inputs);
        if (reportData) {
          const htmlString = generateReportHtml(reportData);
          const { exportToPdf } = await import('@/lib/pdf');
          exportToPdf(htmlString, `voither-report-${reportData.metadata.paciente_id}`);
        } else {
          throw new Error("Report data is missing or invalid.");
        }
      } else {
        throw new Error(res.error || "Failed to load report data.");
      }
    } catch (error: any) {
      toast.error("Failed to export PDF.", { description: error.message });
    }
  };
  const handleDownloadJsons = async (sessionId: string) => {
    try {
      const res = await chatService.loadReportFromSession(sessionId);
      if (res.success && res.data && res.data.stages) {
        res.data.stages.forEach((stage: any) => {
          if (stage.status === 'complete') {
            try {
              const content = JSON.stringify(JSON.parse(stage.output), null, 2);
              const blob = new Blob([content], { type: 'application/json' });
              saveAs(blob, `voither-${stage.name.toLowerCase()}-${res.data.inputs.patientId}.json`);
            } catch (e) {
              console.error(`Could not parse JSON for stage ${stage.name}`);
            }
          }
        });
        toast.success("JSON files downloaded.");
      } else {
        throw new Error(res.error || "Failed to load data for JSON export.");
      }
    } catch (error: any) {
      toast.error("Failed to download JSONs.", { description: error.message });
    }
  };
  const handleExportAll = async () => {
    toast.info("Preparing all exports for download...");
    const zip = new JSZip();
    for (const session of sessions) {
      try {
        const res = await chatService.loadReportFromSession(session.id);
        if (res.success && res.data) {
          const sessionFolder = zip.folder(session.title.replace(/[^a-z0-9]/gi, '_'));
          if (res.data.stages) {
            res.data.stages.forEach((stage: any) => {
              if (stage.status === 'complete') {
                try {
                  const content = JSON.stringify(JSON.parse(stage.output), null, 2);
                  sessionFolder?.file(`voither-${stage.name.toLowerCase()}-${res.data.inputs.patientId}.json`, content);
                } catch (e) { /* ignore */ }
              }
            });
          }
        }
      } catch (error) {
        console.error(`Failed to process session ${session.id} for zip export.`, error);
      }
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'voither-all-exports.zip');
      toast.success("All exports downloaded.");
    });
  };
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display font-bold text-4xl text-text-primary">Exports</h1>
        <Button onClick={handleExportAll} disabled={sessions.length === 0}>
          <Archive className="w-4 h-4 mr-2" /> Export All
        </Button>
      </div>
      {sessions.length > 0 ? (
        <motion.div
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {sessions.map(session => (
            <motion.div key={session.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card className="h-full flex flex-col" role="listitem" aria-label={`Export session ${session.title}`}>
                <CardHeader>
                  <CardTitle className="truncate">{session.title}</CardTitle>
                  <CardDescription>
                    Last active: {format(new Date(session.lastActive), "dd/MM/yyyy 'at' HH:mm")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <SessionThumbnail session={session} />
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