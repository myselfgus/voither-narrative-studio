import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { chatService } from '@/lib/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Users, Search, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  context: string;
  crm: string;
  updated_at: number;
  session_count: number;
}
const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      const res = await chatService.listPatients();
      if (res.success && res.data) {
        setPatients(res.data);
      } else {
        toast.error('Failed to load patients.', { description: res.error });
      }
      setLoading(false);
    };
    fetchPatients();
  }, []);
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    return patients.filter(p =>
      p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.crm.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl text-text-primary flex items-center gap-3">
              <Users className="w-8 h-8" />
              Patient Directory
            </h1>
            <p className="text-muted-foreground">Browse and manage all patient records.</p>
          </div>
          <Button asChild>
            <Link to="/builder"><PlusCircle className="w-4 h-4 mr-2" /> New Session</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>All Patients</CardTitle>
                <CardDescription>{patients.length} total records found.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, name, or CRM..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/50"></TableCell>
                    </TableRow>
                  ))
                ) : filteredPatients.length > 0 ? (
                  filteredPatients.map(patient => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono">{patient.patient_id}</TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.crm}</TableCell>
                      <TableCell className="text-center">{patient.session_count}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(patient.updated_at * 1000), { addSuffix: true, locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/patients/${patient.id}`}>
                            <User className="w-4 h-4 mr-2" /> View Dashboard
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No patients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};
export default Patients;