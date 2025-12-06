import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
const formSchema = z.object({
  patientId: z.string().min(1, "ID do Paciente é obrigatório."),
  apiKey: z.string().min(1, "Chave de API é obrigatória."),
  professionalName: z.string().min(1, "Nome do profissional é obrigatório."),
  crm: z.string().min(1, "CRM é obrigatório."),
  transcription: z.string().min(100, "A transcrição deve ter pelo menos 100 caracteres."),
});
export type TranscriptionInputs = z.infer<typeof formSchema>;
interface TranscriptionInputProps {
  initialData?: Partial<TranscriptionInputs>;
  onStartAnalysis: (data: TranscriptionInputs) => void;
  onInputsChange: (data: Partial<TranscriptionInputs>) => void;
  isProcessing: boolean;
}
const TranscriptionInput: React.FC<TranscriptionInputProps> = ({ initialData, onStartAnalysis, onInputsChange, isProcessing }) => {
  const { register, handleSubmit, control, watch, formState: { errors, isValid }, setValue } = useForm<TranscriptionInputs>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: initialData,
  });
  const transcription = watch('transcription', '');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  useEffect(() => {
    if (transcription) {
      setWordCount(transcription.split(/\s+/).filter(Boolean).length);
      setCharCount(transcription.length);
    } else {
      setWordCount(0);
      setCharCount(0);
    }
  }, [transcription]);
  useEffect(() => {
    const subscription = watch((value) => {
      onInputsChange(value as Partial<TranscriptionInputs>);
    });
    return () => subscription.unsubscribe();
  }, [watch, onInputsChange]);
  // API Key handling is simplified to be stored with session data for this phase.
  // A dedicated secure endpoint would be a next step.
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
      <form onSubmit={handleSubmit(onStartAnalysis)}>
        <Card>
          <CardHeader>
            <CardTitle>1. Dados de Entrada</CardTitle>
            <CardDescription>Preencha as informações da consulta e a transcrição.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId">ID do Paciente</Label>
                <Input id="patientId" {...register('patientId')} />
                {errors.patientId && <p className="text-sm text-destructive mt-1">{errors.patientId.message}</p>}
              </div>
              <div>
                <Label htmlFor="apiKey">Chave de API (Anthropic)</Label>
                <Input id="apiKey" type="password" {...register('apiKey')} placeholder="sk-..." />
                {errors.apiKey && <p className="text-sm text-destructive mt-1">{errors.apiKey.message}</p>}
              </div>
              <div>
                <Label htmlFor="professionalName">Nome do Profissional</Label>
                <Input id="professionalName" {...register('professionalName')} />
                {errors.professionalName && <p className="text-sm text-destructive mt-1">{errors.professionalName.message}</p>}
              </div>
              <div>
                <Label htmlFor="crm">CRM</Label>
                <Input id="crm" {...register('crm')} />
                {errors.crm && <p className="text-sm text-destructive mt-1">{errors.crm.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="transcription">Transcrição da Consulta</Label>
              <Controller
                name="transcription"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="transcription"
                    rows={12}
                    placeholder="Cole a transcrição da consulta aqui..."
                    {...field}
                  />
                )}
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Palavras: {wordCount} | Caracteres: {charCount}</span>
                {errors.transcription && <p className="text-destructive">{errors.transcription.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={!isValid || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isProcessing ? 'Analisando...' : 'Iniciar Análise'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  );
};
export default TranscriptionInput;