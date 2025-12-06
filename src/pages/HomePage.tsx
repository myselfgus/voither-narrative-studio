import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, List, Activity, FileText, Mic, UserPlus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatService } from '@/lib/chat';
import { SessionInfo } from '../../worker/types';
import { generateCoverThumbnail } from '@/lib/pdf';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns';
const SessionThumbnail: React.FC<{ session: SessionInfo }> = ({ session }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      const res = await chatService.loadReportFromSession(session.id);
      if (isMounted && res.success && res.data?.report) {
        const url = await generateCoverThumbnail(res.data.report);
        setThumbnailUrl(url);
      }
    };
    generate();
    return () => { isMounted = false; };
  }, [session.id]);
  return (
    <div className="aspect-[4/3] bg-surface-subtle rounded-md flex items-center justify-center overflow-hidden group-hover:opacity-75 transition-opacity">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`Preview of ${session.title}`} className="w-full h-full object-cover" />
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
};
export function HomePage() {
  const [metrics, setMetrics] = useState({ totalPatients: 0, totalSessions: 0 });
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<{ name: string; sessions: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, sessionsRes] = await Promise.all([
          chatService.listPatients(),
          chatService.listSessions()
        ]);
        if (patientsRes.success && patientsRes.data) {
          setMetrics(prev => ({ ...prev, totalPatients: patientsRes.data?.length || 0 }));
        }
        if (sessionsRes.success && sessionsRes.data) {
          const sessions = sessionsRes.data;
          setMetrics(prev => ({ ...prev, totalSessions: sessions.length || 0 }));
          setRecentSessions(sessions.slice(0, 6));
          const today = new Date();
          const start = startOfWeek(today, { weekStartsOn: 1 });
          const weekDays = eachDayOfInterval({ start, end: today });
          const activityData = weekDays.map(day => ({
            name: format(day, 'EEE'),
            sessions: sessions.filter(s => isSameDay(new Date(s.lastActive), day)).length
          }));
          setWeeklyActivity(activityData);
        }
      } catch (error) {
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const generateInsights = async () => {
    setIsGenerating(true);
    toast.info("Generating AI insights...");
    try {
        const patientsRes = await chatService.listPatients();
        const sessionsRes = await chatService.listSessions();
        const prompt = `Summarize key patterns from patients: ${JSON.stringify(patientsRes.data)} and sessions: ${JSON.stringify(sessionsRes.data)}. Provide insights as a JSON array of objects, each with a 'title' and 'content' property.`;
        const { success, output } = await chatService.sendMessage(prompt, 'voither');
        if (success && output) {
            const parsed = JSON.parse(output);
            setInsights(parsed.insights || parsed);
            toast.success("Insights generated!");
            console.log('Production e2e: GenAI Dashboard insights generated for', metrics.totalPatients, 'patients');
        } else {
            toast.error("Failed to generate insights.");
        }
    } catch (e) {
        toast.error("Error processing AI response.");
    } finally {
        setIsGenerating(false);
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  return (
    <AppLayout>
      <h1 className="font-display font-bold text-4xl text-text-primary mb-8">Dashboard</h1>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" variants={itemVariants}>
          <Card className="glass rounded-macos"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Patients</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalPatients}</div>}</CardContent></Card>
          <Card className="glass rounded-macos"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Sessions</CardTitle><List className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalSessions}</div>}</CardContent></Card>
          <Card className="md:col-span-2 lg:col-span-1 glass rounded-macos"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activity This Week</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="h-[80px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyActivity}><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} /><Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </motion.div>
        <motion.div className="mb-8" variants={itemVariants}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold font-display">AI Insights</h2>
                <Button onClick={generateInsights} disabled={isGenerating}><Bot className="w-4 h-4 mr-2" /> {isGenerating ? 'Generating...' : 'Generate Insights'}</Button>
            </div>
            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {insights.map((insight, i) => (
                        <motion.div key={i} variants={itemVariants}>
                            <Card className="glass rounded-macos h-full"><CardHeader><CardTitle>{insight.title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{insight.content}</p></CardContent></Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
        <motion.div className="mb-8" variants={itemVariants}>
          <h2 className="text-2xl font-bold font-display mb-4">Recent Sessions</h2>
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 3 }).map((_, i) => (<Card key={i} className="glass rounded-macos"><CardContent className="p-4"><Skeleton className="aspect-[4/3] w-full" /></CardContent></Card>))}</div> : recentSessions.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{recentSessions.map(session => (<motion.div key={session.id} className="group hover-elevate"><Link to={`/builder?session=${session.id}`}><Card className="overflow-hidden glass rounded-macos"><CardContent className="p-0"><SessionThumbnail session={session} /></CardContent><div className="p-4"><CardTitle className="truncate text-base">{session.title}</CardTitle><CardDescription>Opened {new Date(session.lastActive).toLocaleDateString()}</CardDescription></div></Card></Link></motion.div>))}</div> : <div className="text-center py-10 border-2 border-dashed rounded-lg"><h3 className="text-lg font-medium text-muted-foreground">No recent sessions</h3><Button asChild className="mt-4"><Link to="/builder">Start a New Analysis</Link></Button></div>}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}