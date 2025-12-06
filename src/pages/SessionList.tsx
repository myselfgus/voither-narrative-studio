import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
import type { SessionInfo } from '../../worker/types';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
const SessionList: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<SessionInfo | null>(null);
  const loadSessions = useCallback(async () => {
    setLoading(true);
    const response = await chatService.listSessions();
    if (response.success && response.data) {
      setSessions(response.data);
    } else {
      toast.error("Failed to load sessions.");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    const response = await chatService.deleteSession(sessionToDelete.id);
    if (response.success) {
      toast.success("Session deleted successfully.");
      setSessions(sessions.filter(s => s.id !== sessionToDelete.id));
    } else {
      toast.error("Failed to delete session.");
    }
    setSessionToDelete(null);
  };
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display font-bold text-4xl text-text-primary">Saved Sessions</h1>
        <Button asChild><Link to="/builder"><PlusCircle className="w-4 h-4 mr-2" />New Session</Link></Button>
      </div>
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="flex justify-between items-center"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-10 rounded-full" /></CardContent></Card>))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => (
            <motion.div key={session.id} whileHover={{ scale: 1.02, y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
              <Card>
                <CardHeader><CardTitle className="truncate">{session.title}</CardTitle><CardDescription>Last active: {format(new Date(session.lastActive), "dd/MM/yyyy 'at' HH:mm")}</CardDescription></CardHeader>
                <CardContent className="flex justify-between items-center">
                  <Button asChild variant="secondary"><Link to={`/builder?session=${session.id}`}>Open</Link></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSessionToDelete(session)} aria-label={`Delete session ${session.title}`}><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the session titled "{sessionToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSession}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold text-text-secondary">No saved sessions found.</h2>
          <p className="mt-2 text-text-tertiary">Start a new report to save a session.</p>
          <Button asChild className="mt-4"><Link to="/builder">Create New Report</Link></Button>
        </div>
      )}
      <Toaster richColors />
    </AppLayout>
  );
};
export default SessionList;