import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2, Home } from 'lucide-react';
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
import type { SessionInfo } from '../../../worker/types';
import { format } from 'date-fns';
const SessionList: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const loadSessions = useCallback(async () => {
    const response = await chatService.listSessions();
    if (response.success && response.data) {
      setSessions(response.data);
    } else {
      toast.error("Falha ao carregar sessões.");
    }
  }, []);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    const response = await chatService.deleteSession(sessionToDelete);
    if (response.success) {
      toast.success("Sessão excluída com sucesso.");
      setSessions(sessions.filter(s => s.id !== sessionToDelete));
    } else {
      toast.error("Falha ao excluir sessão.");
    }
    setSessionToDelete(null);
  };
  return (
    <div className="min-h-screen bg-surface-muted dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display font-bold text-4xl text-text-primary">Sessões Salvas</h1>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/"><Home className="w-4 h-4 mr-2" />Página Inicial</Link>
              </Button>
              <Button asChild>
                <Link to="/builder"><PlusCircle className="w-4 h-4 mr-2" />Nova Sessão</Link>
              </Button>
            </div>
          </div>
          {sessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map(session => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{session.title}</CardTitle>
                    <CardDescription>
                      Última atividade: {format(new Date(session.lastActive), "dd/MM/yyyy 'às' HH:mm")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <Button asChild variant="secondary">
                      <Link to={`/builder?session=${session.id}`}>Abrir</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSessionToDelete(session.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a sessão.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSession}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <h2 className="text-xl font-semibold text-text-secondary">Nenhuma sessão salva encontrada.</h2>
              <p className="mt-2 text-text-tertiary">Comece um novo relatório para salvar uma sessão.</p>
              <Button asChild className="mt-4">
                <Link to="/builder">Criar Novo Relatório</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
};
export default SessionList;