import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mic, StopCircle, Play, Pause, Trash2, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService } from '@/lib/chat';
import { SessionInfo } from '../../worker/types';
import { useDebounce } from 'react-use';
type RecordingState = 'idle' | 'recording' | 'stopped' | 'playing';
const Recordings: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 100 });
  const updateCanvasSize = useCallback(() => {
    if (canvasContainerRef.current) {
      setCanvasSize({
        width: canvasContainerRef.current.clientWidth,
        height: 100,
      });
    }
  }, []);
  useDebounce(updateCanvasSize, 200, [canvasContainerRef.current]);
  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);
  useEffect(() => {
    const loadSessions = async () => {
      const res = await chatService.listSessions();
      if (res.success && res.data) setSessions(res.data);
    };
    loadSessions();
  }, []);
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
  }, [recordingState]);
  const startRecording = async () => {
    if (!selectedSessionId) {
      toast.error("Please select a session first.");
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
    if (!audioBlob || !selectedSessionId) return;
    toast.info("Uploading recording...");
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const sessionRes = await chatService.loadReportFromSession(selectedSessionId);
      if (sessionRes.success && sessionRes.data) {
        const existingData = sessionRes.data;
        const newRecording = { url: base64data, duration: audioBlob.size / 6000, timestamp: Date.now() };
        const updatedRecordings = [...(existingData.recordings || []), newRecording];
        const res = await chatService.saveReportToSession(selectedSessionId, { ...existingData, recordings: updatedRecordings });
        res.success ? toast.success("Recording saved to session!") : toast.error("Failed to save recording.");
        if (res.success) resetRecording();
      } else {
        toast.error("Could not load session to save recording.");
      }
    };
  };
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState('idle');
  };
  return (
    <AppLayout>
      <h1 className="font-display font-bold text-4xl text-text-primary mb-2">Record Audio</h1>
      <p className="text-muted-foreground mb-8">Capture audio and attach it to a patient session.</p>
      <Card>
        <CardHeader><CardTitle>New Recording</CardTitle><CardDescription>Select a session and start recording. The audio will be saved in high-quality WEBM format.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Session</label>
            <Select onValueChange={setSelectedSessionId} disabled={recordingState !== 'idle'}><SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Choose a session..." /></SelectTrigger><SelectContent>{sessions.map(session => (<SelectItem key={session.id} value={session.id}>{session.title}</SelectItem>))}</SelectContent></Select>
          </div>
          <div ref={canvasContainerRef} className="p-4 border rounded-lg bg-surface-subtle"><canvas ref={waveformCanvasRef} width={canvasSize.width} height={canvasSize.height} className="w-full h-[100px] rounded"></canvas></div>
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
            {recordingState === 'idle' && <Button onClick={startRecording} disabled={!selectedSessionId} className="w-full sm:w-auto"><Mic className="w-4 h-4 mr-2" /> Start Recording</Button>}
            {recordingState === 'recording' && <Button onClick={stopRecording} variant="destructive" className="w-full sm:w-auto"><StopCircle className="w-4 h-4 mr-2" /> Stop Recording</Button>}
            {recordingState === 'stopped' && (<><Button onClick={handleUpload} className="w-full sm:w-auto"><UploadCloud className="w-4 h-4 mr-2" /> Save to Session</Button><Button onClick={resetRecording} variant="outline" className="w-full sm:w-auto"><Trash2 className="w-4 h-4 mr-2" /> Discard</Button></>)}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};
export default Recordings;