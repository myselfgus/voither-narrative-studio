import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast }from 'sonner';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Server, Database, Cloud, Bot } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
interface HealthStatus {
  name: string;
  status: 'Connected' | 'Error' | 'Unavailable';
  lastPing?: string;
}
interface Metrics {
  patientCount: number;
  sessionCount: number;
  patientGrowth: { date: string; count: number }[];
  sessionGrowth: { date: string; count: number }[];
}
const AdminDashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, patientsRes, sessionsRes] = await Promise.all([
          Promise.all([
            fetch('/api/health/d1').then(res => res.json().then(data => ({ name: 'D1 Database', ...data }))),
            fetch('/api/health/r2').then(res => res.json().then(data => ({ name: 'R2 Storage', ...data }))),
            fetch('/api/health/ai').then(res => res.json().then(data => ({ name: 'AI Gateway', ...data })))
          ]),
          fetch('/api/patients').then(res => res.json()),
          fetch('/api/sessions').then(res => res.json())
        ]);
        setHealth(healthRes);
        if (patientsRes.success && sessionsRes.success) {
          const today = new Date();
          const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
          const patientGrowth = last7Days.map(day => ({
            date: format(day, 'MMM dd'),
            count: patientsRes.data.filter((p: any) => new Date(p.created_at * 1000) <= day).length
          }));
          const sessionGrowth = last7Days.map(day => ({
            date: format(day, 'MMM dd'),
            count: sessionsRes.data.filter((s: any) => new Date(s.createdAt) <= day).length
          }));
          setMetrics({
            patientCount: patientsRes.data.length,
            sessionCount: sessionsRes.data.length,
            patientGrowth,
            sessionGrowth
          });
        } else {
          toast.error("Failed to load metrics.");
        }
      } catch (error) {
        toast.error("Failed to load dashboard data.");
        console.error("Admin Dashboard Error:", error);
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
      <div role="region" aria-label="Admin Dashboard">
        <h1 className="font-display font-bold text-4xl text-text-primary mb-8">Admin Dashboard</h1>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server /> Service Health</CardTitle>
                <CardDescription>Real-time status of core infrastructure components.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Ping</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      health.map(service => (
                        <TableRow key={service.name}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>
                            <Badge variant={service.status === 'Connected' ? 'default' : 'destructive'}>{service.status}</Badge>
                          </TableCell>
                          <TableCell>{service.lastPing ? new Date(service.lastPing).toLocaleString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database /> Total Patients</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-10 w-1/4" /> : <div className="text-4xl font-bold">{metrics?.patientCount}</div>}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-10 w-1/4" /> : <div className="text-4xl font-bold">{metrics?.sessionCount}</div>}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cloud /> Worker Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">Operational</div>
                <p className="text-xs text-muted-foreground mt-1">Last deploy: {new Date().toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 h-80">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Patient Growth</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    {loading ? <Skeleton className="h-full w-full" /> : (
                      <AreaChart data={metrics?.patientGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Session Growth</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    {loading ? <Skeleton className="h-full w-full" /> : (
                      <BarChart data={metrics?.sessionGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
};
export default AdminDashboard;