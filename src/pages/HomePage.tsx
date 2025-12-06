import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, List, Activity, FileText, Mic, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatService } from '@/lib/chat';
import { SessionInfo } from '../../worker/types';
import { NarrativeReportData } from '@/types/report';
import { generateCoverThumbnail } from '@/lib/pdf';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
// Mock data for the chart
const weeklyActivityData = [
  { name: 'Mon', sessions: 4 },
  { name: 'Tue', sessions: 3 },
  { name: 'Wed', sessions: 5 },
  { name: 'Thu', sessions: 2 },
  { name: 'Fri', sessions: 6 },
  { name: 'Sat', sessions: 1 },
  { name: 'Sun', sessions: 0 },
];
export function HomePage() {
  const [metrics, setMetrics] = useState({ totalPatients: 0, totalSessions: 0 });
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
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
          setMetrics(prev => ({ ...prev, totalSessions: sessionsRes.data?.length || 0 }));
          setRecentSessions(sessionsRes.data.slice(0, 6));
        }
      } catch (error) {
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const footer = (
    <>
      <p>AI-powered features use Cloudflare Workers AI Gateway (voither).</p>
      <p className="mt-2 text-xs opacity-75">
        Requests are rate-limited for fair usage. Check your Cloudflare dashboard for limits and monitoring.
      </p>
    </>
  );
  return (
    <AppLayout footer={footer}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display font-bold text-4xl text-text-primary mb-8">Dashboard</h1>
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalPatients}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalSessions}</div>}
            </CardContent>
          </Card>
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivityData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Recent Sessions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display mb-4">Recent Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="aspect-[4/3] w-full" /></CardContent></Card>
            )) : recentSessions.map(session => (
              <motion.div key={session.id} whileHover={{ y: -5 }} className="group">
                <Link to={`/builder?session=${session.id}`}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <SessionThumbnail session={session} />
                    </CardContent>
                    <div className="p-4">
                      <CardTitle className="truncate text-base">{session.title}</CardTitle>
                      <CardDescription>Opened {new Date(session.lastActive).toLocaleDateString()}</CardDescription>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        {/* CTAs */}
        <div>
          <h2 className="text-2xl font-bold font-display mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild size="lg" className="justify-start text-base h-16">
              <Link to="/builder"><FileText className="mr-4 h-6 w-6" /> New Transcription</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="justify-start text-base h-16">
              <Link to="/recordings"><Mic className="mr-4 h-6 w-6" /> Start Recording</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="justify-start text-base h-16">
              <Link to="/patients"><UserPlus className="mr-4 h-6 w-6" /> View All Patients</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}