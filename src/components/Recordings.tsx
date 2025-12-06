import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mic, UserPlus, Loader2, Video, VideoOff, PhoneOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService } from '@/lib/chat';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
interface Patient { id: string; patient_id: string; name: string; crm: string; }
interface ActiveCall {
  patient: Patient;
  roomId: string;
  pc: RTCPeerConnection;
  localStream: MediaStream;
  screenStream?: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  startTime: number;
}
const Recordings: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeCalls, setActiveCalls] = useState<Map<string, ActiveCall>>(new Map());
  const localVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const [_, setTick] = useState(0);
  const [newPatientId, setNewPatientId] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientContext, setNewPatientContext] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const fetchPatients = useCallback(async () => {
    const res = await chatService.listPatients();
    if (res.success && res.data) {
      setPatients(res.data);
    }
  }, []);
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);
  const handleCreatePatient = async () => {
    if (!newPatientId || !newPatientName) {
      toast.error("Patient ID and Name are required.");
      return;
    }
    setIsCreatingPatient(true);
    const res = await chatService.createPatient({
      patient_id: newPatientId,
      name: newPatientName,
      context: newPatientContext,
    });
    if (res.success) {
      toast.success("Patient created successfully.");
      await fetchPatients();
      setNewPatientId('');
      setNewPatientName('');
      setNewPatientContext('');
      setIsNewPatientDialogOpen(false);
    } else {
      toast.error("Failed to create patient.", { description: res.error });
    }
    setIsCreatingPatient(false);
  };
  const startCall = async () => {
    if (!selectedPatient) { toast.error("Please select a patient."); return; }
    if (activeCalls.has(selectedPatient.id)) { toast.info("Call already active for this patient."); return; }
    if (activeCalls.size >= 3) { toast.error("Maximum of 3 active calls reached."); return; }
    try {
      const res = await fetch(`/api/webrtc/join?sessionId=${crypto.randomUUID()}`).then(r => r.json());
      const pc = new RTCPeerConnection({ iceServers: res.iceServers });
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const combinedStream = new MediaStream([...localStream.getTracks()]);
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
      const newCall: ActiveCall = { patient: selectedPatient, roomId: res.roomId, pc, localStream, recorder, chunks, startTime: Date.now() };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') {
          toast.warning(`Connection lost for ${selectedPatient.name}. Attempting to reconnect...`);
          pc.restartIce();
        }
      };
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      const localVideoEl = localVideoRefs.current.get(selectedPatient.id);
      if (localVideoEl) localVideoEl.srcObject = localStream;
      recorder.start();
      setActiveCalls(prev => new Map(prev).set(selectedPatient.id, newCall));
    } catch (err) {
      toast.error("Failed to start call. Check permissions.");
    }
  };
  const hangUp = async (patientId: string) => {
    const call = activeCalls.get(patientId);
    if (!call) return;
    call.recorder.stop();
    call.pc.close();
    call.localStream.getTracks().forEach(track => track.stop());
    call.screenStream?.getTracks().forEach(track => track.stop());
    const blob = new Blob(call.chunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob, 'recording.webm');
    toast.info(`Uploading recording for ${call.patient.name}...`);
    const uploadRes = await fetch(`/api/video/${call.patient.id}/upload`, { method: 'PUT', body: formData });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      await chatService.createSession(`Call Recording for ${call.patient.name}`, { report: { recordings: [{ url, type: 'video', timestamp: Date.now() }] } }, call.patient.id);
      toast.success("Recording saved.");
      console.log('Patient isolation test: Video wall recording for patient_id', call.patient.id);
    } else {
      toast.error("Failed to upload recording.");
    }
    setActiveCalls(prev => {
      const newMap = new Map(prev);
      newMap.delete(patientId);
      return newMap;
    });
  };
  return (
    <AppLayout>
      <h1 className="font-display font-bold text-4xl text-text-primary mb-2">Video Wall & Recordings</h1>
      <p className="text-muted-foreground mb-8">Manage active calls and review past recordings.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="glass rounded-macos">
            <CardHeader><CardTitle>Start a Call</CardTitle></CardHeader>
            <CardContent>
              <Select onValueChange={val => setSelectedPatient(patients.find(p => p.id === val) || null)}>
                <SelectTrigger><SelectValue placeholder="Select a patient..." /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={startCall} disabled={!selectedPatient} className="w-full mt-4"><Video className="w-4 h-4 mr-2" /> Start Call</Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="glass rounded-macos">
            <CardHeader><CardTitle>Active Calls ({activeCalls.size})</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(activeCalls.values()).map(call => (
                <div key={call.patient.id}>
                  <h3 className="font-bold mb-2">{call.patient.name}</h3>
                  <video ref={el => localVideoRefs.current.set(call.patient.id, el)} className="w-full aspect-video bg-black rounded-md" autoPlay muted playsInline />
                  <div className="flex justify-between items-center mt-2 glass rounded-full p-1">
                    <Badge>{new Date((Date.now() - call.startTime)).toISOString().substr(14, 5)}</Badge>
                    <Button onClick={() => hangUp(call.patient.id)} variant="destructive" size="sm"><PhoneOff className="w-4 h-4 mr-2" /> Hang Up</Button>
                  </div>
                </div>
              ))}
              {activeCalls.size === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No active calls.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" className="fixed bottom-24 right-8"><UserPlus className="w-4 h-4 mr-2" /> New Patient</Button>
        </DialogTrigger>
        <DialogContent aria-labelledby="new-patient-title" aria-describedby="new-patient-desc">
            <DialogHeader>
                <DialogTitle id="new-patient-title">Create New Patient</DialogTitle>
                <DialogDescription id="new-patient-desc">
                    Enter patient details to add a new patient record.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-patient-id">Patient ID</Label>
                <Input id="new-patient-id" placeholder="e.g., GABRIEL_MENDES_01" value={newPatientId} onChange={e => setNewPatientId(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-patient-name">Patient Name</Label>
                <Input id="new-patient-name" placeholder="e.g., Gabriel Mendes" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-patient-context">Context / Notes</Label>
                <Textarea id="new-patient-context" placeholder="e.g., Análise Narrativa de Profundidade" value={newPatientContext} onChange={e => setNewPatientContext(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreatePatient} disabled={isCreatingPatient}>
                  {isCreatingPatient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Patient
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
export default Recordings;