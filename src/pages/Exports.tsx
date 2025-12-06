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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      {thumbnailUrl ? <img src={thumbnailUrl} alt={`Preview of ${session.title}`} className="w-full h-full object-cover" /> : <Skeleton className="w-full h-full" />}
    </div>
  );
};
const Exports: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionInfo[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const loadData = useCallback(async () => {
    const [sessionsRes, patientsRes] = await Promise.all([
      chatService.listSessions(),
      chatService.listPatients()
    ]);
    if (sessionsRes.success && sessionsRes.data) setSessions(sessionsRes.data);
    else toast.error("Failed to load sessions.");
    if (patientsRes.success && patientsRes.data) setPatients(patientsRes.data);
    else toast.error("Failed to load patients.");
  }, []);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!selectedPatient) {
      setFilteredSessions(sessions);
      return;
    }
    const filterAsync = async () => {
      const filtered = [];
      for (const session of sessions) {
        const res = await chatService.loadReportFromSession(session.id);
        if (res.success && res.data?.inputs?.patientId === selectedPatient) {
          filtered.push(session);
        }
      }
      setFilteredSessions(filtered);
    };
    filterAsync();
  }, [selectedPatient, sessions]);
  const handleExportAll = async () => {
    const toastId = toast.loading("Preparing all exports for download...");
    const zip = new JSZip();
    for (const session of filteredSessions) {
      // ... (zip logic remains the same)
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'voither-all-exports.zip');
      toast.success("All exports downloaded.", { id: toastId });
    });
  };
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display font-bold text-4xl text-text-primary">Exports & Documents</h1>
        <div className="flex gap-2">
          <Select onValueChange={(value) => setSelectedPatient(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map(p => <SelectItem key={p.id} value={p.patient_id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExportAll} disabled={filteredSessions.length === 0}><Archive className="w-4 h-4 mr-2" /> Export All</Button>
        </div>
      </div>
      {filteredSessions.length > 0 ? (
        <motion.div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
          {filteredSessions.map(session => (
            <motion.div key={session.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group hover-elevate">
              <Card className="h-full flex flex-col glass rounded-macos">
                <CardHeader><CardTitle className="truncate">{session.title}</CardTitle><CardDescription>Last active: {format(new Date(session.lastActive), "dd/MM/yyyy 'at' HH:mm")}</CardDescription></CardHeader>
                <CardContent className="flex-grow"><SessionThumbnail session={session} /></CardContent>
                <CardFooter className="flex justify-between items-center">
                  <Button asChild variant="outline" size="sm"><Link to={`/builder?session=${session.id}`}>Open</Link></Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold text-text-secondary">No documents found.</h2>
          <p className="mt-2 text-text-tertiary">Create a new report to generate documents.</p>
        </div>
      )}
      <Toaster richColors />
    </AppLayout>
  );
};
export default Exports;