import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mic, StopCircle, Play, Pause, Trash2, UploadCloud, UserPlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService } from '@/lib/chat';
import { useDebounce } from 'react-use';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const newPatientFormRef = useRef<HTMLFormElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 100 });
  const updateCanvasSize = useCallback(() => {
    if (canvasContainerRef.current) {
      const newWidth = canvasContainerRef.current.clientWidth;
      setCanvasSize({ width: newWidth, height: 100 });
    }
  }, []);
  useDebounce(updateCanvasSize, 200, [canvasContainerRef.current]);
  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);
  const loadPatients = useCallback(async () => {
    const res = await chatService.listPatients();
    if (res.success && res.data) setPatients(res.data);
  }, []);
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);
  const drawWaveform = useCallback(() => {
    if (recordingState !== 'recording' || !analyserRef.current || !waveformCanvasRef.current) return;
    const canvas = waveformCanvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);
    canvasCtx.fillStyle = 'hsl(var(--card))';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'hsl(var(--primary))';
    canvasCtx.beginPath();
    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;
      i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [recordingState, canvasSize]);
  const startRecording = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient first.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingState('stopped');
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };
      mediaRecorderRef.current.start();
      setRecordingState('recording');
      drawWaveform();
    } catch (err) {
      toast.error("Microphone access denied.", { description: "Please allow microphone access in your browser settings.", action: { label: "Retry", onClick: startRecording } });
    }
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();
  const handleUpload = async () => {
    if (!audioBlob || !selectedPatientId) return;
    toast.info("Uploading recording...");
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      if (!selectedPatient) return;
      const sessionId = crypto.randomUUID();
      chatService.setSessionId(sessionId);
      const newRecording = { url: base64data, duration: audioBlob.size / 6000, timestamp: Date.now() };
      const sessionData = {
        inputs: {
          patientId: selectedPatient.patient_id,
          crm: selectedPatient.crm,
          professionalName: selectedPatient.name,
        },
        stages: [],
        recordings: [newRecording],
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
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState('idle');
  };
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(newPatientFormRef.current!);
    const data = Object.fromEntries(formData.entries()) as { patient_id: string; name: string; context: string; crm: string };
    if (!data.patient_id || !data.name || !data.crm) {
      toast.error("Patient ID, Name, and CRM are required.");
      return;
    }
    setIsCreatingPatient(true);
    const res = await chatService.createPatient(data);
    if (res.success && res.data?.id) {
      toast.success('Patient created successfully!');
      await loadPatients();
      setSelectedPatientId(res.data.id);
      newPatientFormRef.current?.reset();
    } else {
      toast.error("Failed to create patient.", { description: res.error });
    }
    setIsCreatingPatient(false);
  };
  return (
    <AppLayout>
      <h1 className="font-display font-bold text-4xl text-text-primary mb-2">Record Audio</h1>
      <p className="text-muted-foreground mb-8">Capture audio and attach it to a patient's record.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Patient</CardTitle>
              <CardDescription>Choose an existing patient to associate the recording with.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={setSelectedPatientId} value={selectedPatientId || ""} disabled={recordingState !== 'idle'}>
                <SelectTrigger><SelectValue placeholder="Choose a patient..." /></SelectTrigger>
                <SelectContent>{patients.map(p => (<SelectItem key={p.id} value={p.id}>{p.patient_id} - {p.name}</SelectItem>))}</SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="new-patient">
              <AccordionTrigger><div className="flex items-center gap-2"><UserPlus className="w-4 h-4" /><span>Or Create New Patient</span></div></AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6">
                    <form ref={newPatientFormRef} onSubmit={handleCreatePatient} className="space-y-4">
                      <Input name="patient_id" placeholder="Patient ID (e.g., GABRIEL_MENDES)" required />
                      <Input name="name" placeholder="Full Name" required />
                      <Input name="context" placeholder="Context (e.g., Initial Consultation)" />
                      <Input name="crm" placeholder="Professional's CRM" required />
                      <Button type="submit" className="w-full" disabled={isCreatingPatient}>
                        {isCreatingPatient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Patient
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>2. New Recording</CardTitle><CardDescription>The audio will be saved in high-quality WEBM format.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div ref={canvasContainerRef} className="p-4 border rounded-lg bg-surface-subtle">
                <canvas ref={waveformCanvasRef} width={canvasSize.width} height={canvasSize.height} className="w-full h-[100px] rounded"></canvas>
              </div>
              {audioUrl && (
                <div className="flex items-center gap-4 flex-wrap">
                  <audio ref={audioRef} src={audioUrl} onPlay={() => setRecordingState('playing')} onPause={() => setRecordingState('stopped')} onEnded={() => setRecordingState('stopped')} />
                  <Button size="icon" onClick={() => audioRef.current?.play()} disabled={recordingState === 'playing'}><Play className="w-4 h-4" /></Button>
                  <Button size="icon" onClick={() => audioRef.current?.pause()} disabled={recordingState !== 'playing'}><Pause className="w-4 h-4" /></Button>
                  <div className="flex items-center gap-2"><label className="text-sm">Speed:</label><Select defaultValue="1" onValueChange={v => audioRef.current && (audioRef.current.playbackRate = parseFloat(v))}><SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.5">0.5x</SelectItem><SelectItem value="1">1x</SelectItem><SelectItem value="1.5">1.5x</SelectItem></SelectContent></Select></div>
                  <div className="flex-grow text-sm text-muted-foreground">Duration: {audioBlob ? (audioBlob.size / 6000).toFixed(2) : 0}s</div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                {recordingState === 'idle' && <Button onClick={startRecording} disabled={!selectedPatientId} className="w-full sm:w-auto"><Mic className="w-4 h-4 mr-2" /> Start Recording</Button>}
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