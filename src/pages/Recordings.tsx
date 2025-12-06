import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, StopCircle, Play, Pause, Trash2, UploadCloud, UserPlus, Loader2, Video, VideoOff, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService } from '@/lib/chat';
import { useDebounce } from 'react-use';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
type RecordingState = 'idle' | 'recording' | 'stopped' | 'playing';
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  crm: string;
}
const Recordings: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const newPatientFormRef = useRef<HTMLFormElement>(null);
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
  const startRecording = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient first.");
      return;
    }
    try {
      const constraints = recordingType === 'video' 
        ? { audio: true, video: { facingMode: 'user' } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (recordingType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      const mimeType = recordingType === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      mediaChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => mediaChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        setMediaBlob(blob);
        setMediaUrl(URL.createObjectURL(blob));
        setRecordingState('stopped');
        stream.getTracks().forEach(track => track.stop());
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      };
      mediaRecorderRef.current.start();
      setRecordingState('recording');
    } catch (err) {
      toast.error("Media access denied.", { description: "Please allow microphone/camera access.", action: { label: "Retry", onClick: startRecording } });
    }
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();
  const handleUpload = async () => {
    if (!mediaBlob || !selectedPatientId) return;
    toast.info("Uploading recording...");
    const reader = new FileReader();
    reader.readAsDataURL(mediaBlob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      if (!selectedPatient) return;
      const sessionId = crypto.randomUUID();
      chatService.setSessionId(sessionId);
      const newRecording = { url: base64data, type: recordingType, duration: mediaBlob.size / (recordingType === 'video' ? 15000 : 6000), timestamp: Date.now() };
      const sessionData = {
        inputs: { patientId: selectedPatient.patient_id, crm: selectedPatient.crm, professionalName: selectedPatient.name },
        stages: [],
        report: { recordings: [newRecording] }
      };
      const res = await chatService.createSession(`Recording for ${selectedPatient.name}`, sessionData);
      if (res.success) {
        toast.success("Recording saved to a new session!");
        resetRecording();
      } else {
        toast.error("Failed to save recording.", { description: res.error });
      }
    };
  };
  const resetRecording = () => {
    setMediaBlob(null);
    setMediaUrl(null);
    setRecordingState('idle');
  };
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(newPatientFormRef.current!);
    const data = Object.fromEntries(formData.entries()) as { patient_id: string; name: string; context: string; crm: string };
    if (!data.name || !data.crm) {
      toast.error("Name and CRM are required.");
      return;
    }
    if (!data.patient_id) {
      data.patient_id = `PATIENT-${crypto.randomUUID().slice(0, 8)}`;
    }
    setIsCreatingPatient(true);
    const res = await chatService.createPatient(data);
    if (res.success && res.data?.id) {
      toast.success('Patient created successfully!');
      await loadPatients();
      setSelectedPatientId(res.data.id);
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
      <p className="text-muted-foreground mb-8">Capture audio or video and attach it to a patient's record.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Patient</CardTitle>
              <div className="flex justify-between items-center">
                <CardDescription>Choose an existing patient.</CardDescription>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><UserPlus className="w-4 h-4 mr-2" /> New</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New Patient</DialogTitle></DialogHeader>
                    <form ref={newPatientFormRef} onSubmit={handleCreatePatient} className="space-y-4">
                      <Input name="patient_id" placeholder="Patient ID (optional, auto-generated)" />
                      <Input name="name" placeholder="Full Name" required />
                      <Input name="context" placeholder="Context (e.g., Initial Consultation)" />
                      <Input name="crm" placeholder="Professional's CRM" required />
                      <DialogFooter>
                        <DialogClose asChild><Button id="close-patient-dialog" type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isCreatingPatient}>
                          {isCreatingPatient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Patient
                        </Button>
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
                      <TableRow key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`cursor-pointer ${selectedPatientId === p.id ? 'bg-accent' : ''}`}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-muted-foreground">{p.patient_id}</div>
                        </TableCell>
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
            <CardHeader><CardTitle>2. New Recording</CardTitle><CardDescription>The media will be saved in high-quality WEBM format.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg bg-surface-subtle aspect-video flex items-center justify-center">
                {recordingType === 'video' ? (
                  <video ref={localVideoRef} className="w-full h-full bg-black rounded" autoPlay muted playsInline></video>
                ) : (
                  <div className="text-center text-muted-foreground">Audio recording active</div>
                )}
              </div>
              {mediaUrl && (
                <div className="flex items-center gap-4 flex-wrap">
                  {recordingType === 'video' ? (
                    <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={mediaUrl} controls className="w-full" onPlay={() => setRecordingState('playing')} onPause={() => setRecordingState('stopped')} onEnded={() => setRecordingState('stopped')} />
                  ) : (
                    <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={mediaUrl} controls className="w-full" onPlay={() => setRecordingState('playing')} onPause={() => setRecordingState('stopped')} onEnded={() => setRecordingState('stopped')} />
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                {recordingState === 'idle' && (
                  <>
                    <Select value={recordingType} onValueChange={(v) => setRecordingType(v as 'audio' | 'video')}>
                      <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="audio">Audio</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent>
                    </Select>
                    <Button onClick={startRecording} disabled={!selectedPatientId} className="w-full sm:w-auto">
                      {recordingType === 'audio' ? <Mic className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />} Start Recording
                    </Button>
                  </>
                )}
                {recordingState === 'recording' && <Button onClick={stopRecording} variant="destructive" className="w-full sm:w-auto"><StopCircle className="w-4 h-4 mr-2" /> Stop Recording</Button>}
                {recordingState === 'stopped' && (<><Button onClick={handleUpload} className="w-full sm:w-auto"><UploadCloud className="w-4 h-4 mr-2" /> Save to New Session</Button><Button onClick={resetRecording} variant="outline" className="w-full sm:w-auto"><Trash2 className="w-4 h-4 mr-2" /> Discard</Button></>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
export default Recordings;