import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, List, Activity, FileText, Mic, UserPlus } from 'lucide-react';
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
          // Process weekly activity
          const today = new Date();
          const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
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
              <CardTitle className="text-sm font-medium">Activity This Week</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div className="mb-8" variants={itemVariants}>
          <h2 className="text-2xl font-bold font-display mb-4">Recent Sessions</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="aspect-[4/3] w-full" /></CardContent></Card>))}
            </div>
          ) : recentSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSessions.map(session => (
                <motion.div key={session.id} whileHover={{ y: -5 }} className="group hover:shadow-lg hover:-translate-y-1 transition-transform">
                  <Link to={`/builder?session=${session.id}`}>
                    <Card className="overflow-hidden">
                      <CardContent className="p-0"><SessionThumbnail session={session} /></CardContent>
                      <div className="p-4">
                        <CardTitle className="truncate text-base">{session.title}</CardTitle>
                        <CardDescription>Opened {new Date(session.lastActive).toLocaleDateString()}</CardDescription>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium text-muted-foreground">No recent sessions</h3>
              <Button asChild className="mt-4"><Link to="/builder">Start a New Analysis</Link></Button>
            </div>
          )}
        </motion.div>
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold font-display mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild size="lg" className="justify-start text-base h-16"><Link to="/builder"><FileText className="mr-4 h-6 w-6" /> New Transcription</Link></Button>
            <Button asChild size="lg" variant="secondary" className="justify-start text-base h-16"><Link to="/recordings"><Mic className="mr-4 h-6 w-6" /> Start Recording</Link></Button>
            <Button asChild size="lg" variant="outline" className="justify-start text-base h-16"><Link to="/patients"><UserPlus className="mr-4 h-6 w-6" /> View All Patients</Link></Button>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}