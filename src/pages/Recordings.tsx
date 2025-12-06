import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, UserPlus, Loader2, Video, VideoOff, Search, PhoneOff, ScreenShare, ScreenShareOff, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService } from '@/lib/chat';
import { useDebounce } from 'react-use';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
type CallState = 'idle' | 'calling' | 'connected' | 'ended';
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  crm: string;
}
const Recordings: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const newPatientFormRef = useRef<HTMLFormElement>(null);
  const roomIdRef = useRef<string | null>(null);
  const localSessionIdRef = useRef<string>(crypto.randomUUID());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 300, [searchTerm]);
  const loadPatients = useCallback(async () => {
    const res = await chatService.listPatients();
    if (res.success && res.data) setPatients(res.data);
  }, []);
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);
  const filteredPatients = useMemo(() => {
    if (!debouncedSearchTerm) return patients;
    return patients.filter(p =>
      p.patient_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      p.crm.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [patients, debouncedSearchTerm]);
  const startCall = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient first.");
      return;
    }
    setCallState('calling');
    try {
      const res = await fetch(`/api/webrtc/join?sessionId=${localSessionIdRef.current}`).then(r => r.json());
      roomIdRef.current = res.roomId;
      pcRef.current = new RTCPeerConnection({ iceServers: res.iceServers });
      pcRef.current.onicecandidate = e => {
        if (e.candidate) {
          fetch(`/api/webrtc/signal/${roomIdRef.current}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: localSessionIdRef.current, data: { type: 'ice', candidate: e.candidate } })
          });
        }
      };
      pcRef.current.ontrack = e => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setCallState('connected');
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      await fetch(`/api/webrtc/signal/${roomIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: localSessionIdRef.current, data: { type: 'offer', sdp: offer.sdp } })
      });
    } catch (err) {
      toast.error("Call failed to start.", { description: "Please allow camera/microphone access.", action: { label: "Retry", onClick: startCall } });
      setCallState('idle');
    }
  };
  const hangUp = async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    if (roomIdRef.current) {
      await fetch(`/api/webrtc/leave/${roomIdRef.current}?sessionId=${localSessionIdRef.current}`, { method: 'POST' });
    }
    setCallState('ended');
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(newPatientFormRef.current!);
    const data = Object.fromEntries(formData.entries()) as { patient_id: string; name: string; context: string; crm: string };
    if (!data.name || !data.crm) {
      toast.error("Name and CRM are required.");
      return;
    }
    if (!data.patient_id) data.patient_id = `PATIENT-${crypto.randomUUID().slice(0, 8)}`;
    setIsCreatingPatient(true);
    const res = await chatService.createPatient(data);
    if (res.success && res.data?.id) {
      toast.success('Patient created successfully!');
      await loadPatients();
      const newPatient = { ...data, id: res.data.id };
      setSelectedPatient(newPatient);
      newPatientFormRef.current?.reset();
      document.getElementById('close-patient-dialog')?.click();
    } else {
      toast.error("Failed to create patient.", { description: res.error });
    }
    setIsCreatingPatient(false);
  };
  return (
    <AppLayout>
      <h1 className="font-display font-bold text-4xl text-text-primary mb-2">Record Media</h1>
      <p className="text-muted-foreground mb-8">Start a video call and record the session for analysis.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Patient</CardTitle>
              <div className="flex justify-between items-center">
                <CardDescription>Choose an existing patient.</CardDescription>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm"><UserPlus className="w-4 h-4 mr-2" /> New</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New Patient</DialogTitle></DialogHeader>
                    <form ref={newPatientFormRef} onSubmit={handleCreatePatient} className="space-y-4">
                      <Input name="patient_id" placeholder="Patient ID (optional, auto-generated)" />
                      <Input name="name" placeholder="Full Name" required />
                      <Input name="context" placeholder="Context (e.g., Initial Consultation)" />
                      <Input name="crm" placeholder="Professional's CRM" required />
                      <DialogFooter>
                        <DialogClose asChild><Button id="close-patient-dialog" type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isCreatingPatient}>{isCreatingPatient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Patient</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search patients..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <ScrollArea className="h-64 border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Patient</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredPatients.map(p => (
                      <TableRow key={p.id} onClick={() => setSelectedPatient(p)} className={`cursor-pointer ${selectedPatient?.id === p.id ? 'bg-accent' : ''}`}>
                        <TableCell><div className="font-medium">{p.name}</div><div className="text-sm text-muted-foreground">{p.patient_id}</div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>2. Video Call</CardTitle>
              <CardDescription>
                {callState === 'idle' && "Start a video call with the selected patient."}
                {callState === 'calling' && <Badge variant="secondary">Calling...</Badge>}
                {callState === 'connected' && <Badge>Connected</Badge>}
                {callState === 'ended' && <Badge variant="outline">Call Ended</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <Card><CardHeader className="p-2"><CardTitle className="text-sm">Local</CardTitle></CardHeader><CardContent className="p-0">{callState === 'idle' ? <Skeleton className="w-full aspect-video rounded-b-md" /> : <video ref={localVideoRef} className="w-full aspect-video bg-black rounded-b-md" autoPlay muted playsInline aria-label="Local video feed" />}</CardContent></Card>
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <Card><CardHeader className="p-2"><CardTitle className="text-sm">Remote</CardTitle></CardHeader><CardContent className="p-0">{callState === 'idle' ? <Skeleton className="w-full aspect-video rounded-b-md" /> : <video ref={remoteVideoRef} className="w-full aspect-video bg-black rounded-b-md" autoPlay playsInline aria-label="Remote video feed" />}</CardContent></Card>
                </motion.div>
              </motion.div>
              <div className="flex flex-wrap justify-center gap-2 p-2 border rounded-lg bg-surface-subtle">
                {callState === 'idle' && <Button onClick={startCall} disabled={!selectedPatient} className="flex-1"><Video className="w-4 h-4 mr-2" /> Start Video Call</Button>}
                {(callState === 'calling' || callState === 'connected') && (
                  <>
                    <Button variant={isAudioMuted ? "destructive" : "outline"} size="icon" onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !isAudioMuted); setIsAudioMuted(!isAudioMuted); }}><MicOff className={!isAudioMuted ? 'hidden' : ''} /><Mic className={isAudioMuted ? 'hidden' : ''} /></Button>
                    <Button variant={isVideoMuted ? "destructive" : "outline"} size="icon" onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !isVideoMuted); setIsVideoMuted(!isVideoMuted); }}><VideoOff className={!isVideoMuted ? 'hidden' : ''} /><Video className={isVideoMuted ? 'hidden' : ''} /></Button>
                    <Button variant="outline" size="icon" disabled><ScreenShare /></Button>
                    <Button onClick={hangUp} variant="destructive" className="flex-1"><PhoneOff className="w-4 h-4 mr-2" /> Hang Up</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
export default Recordings;