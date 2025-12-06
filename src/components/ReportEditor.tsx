import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NarrativeReportData } from '@/types/report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useDebounce } from 'react-use';
const contentBlockSchema = z.object({
  type: z.enum(['paragraph', 'quote', 'list']),
  content: z.union([z.string(), z.array(z.string())]),
});
const subsectionSchema = z.object({
  title: z.string().min(1, "T��tulo da subseção é obrigatório"),
  blocks: z.array(contentBlockSchema),
});
const sectionSchema = z.object({
  title: z.string().min(1, "Título da seção é obrigatório"),
  intro: z.array(contentBlockSchema),
  subsections: z.array(subsectionSchema),
});
const metadataSchema = z.object({
  paciente_id: z.string().min(1, "ID do paciente é obrigatório"),
  contexto: z.string().min(1, "Contexto é obrigatório"),
  data_analise: z.string().min(1, "Data é obrigatória"),
  medico_responsavel: z.string().min(1, "Médico é obrigatório"),
  crm: z.string().min(1, "CRM é obrigatório"),
  total_turnos: z.number().default(0),
  total_palavras: z.number().default(0),
  duracao_estimada_consulta: z.string().default('N/A'),
  analista: z.string().default('Voither HealthOS'),
});
const reportSchema = z.object({
  metadata: metadataSchema,
  reportTitle: z.string().min(1, "Título do relatório é obrigatório"),
  keyQuote: z.string().min(1, "Citação chave é obrigatória"),
  sections: z.array(sectionSchema),
});
interface ReportEditorProps {
  reportData: NarrativeReportData;
  onUpdate: (data: NarrativeReportData) => void;
  onSave: () => void;
}
const ReportEditor: React.FC<ReportEditorProps> = ({ reportData, onUpdate, onSave }) => {
  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<NarrativeReportData>({
    resolver: zodResolver(reportSchema),
    defaultValues: reportData,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
  });
  const watchedFields = watch();
  useDebounce(() => {
    onUpdate(watchedFields);
  }, 500, [watchedFields, onUpdate]);
  const onSubmit = (data: NarrativeReportData) => {
    onUpdate(data);
    onSave();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Metadados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="metadata.paciente_id">ID do Paciente</Label>
            <Input id="metadata.paciente_id" {...register("metadata.paciente_id")} />
            {errors.metadata?.paciente_id && <p className="text-red-500 text-sm mt-1">{errors.metadata.paciente_id.message}</p>}
          </div>
          <div>
            <Label htmlFor="metadata.contexto">Contexto</Label>
            <Input id="metadata.contexto" {...register("metadata.contexto")} />
            {errors.metadata?.contexto && <p className="text-red-500 text-sm mt-1">{errors.metadata.contexto.message}</p>}
          </div>
          <div>
            <Label htmlFor="metadata.data_analise">Data da Análise</Label>
            <Input id="metadata.data_analise" type="date" {...register("metadata.data_analise")} />
            {errors.metadata?.data_analise && <p className="text-red-500 text-sm mt-1">{errors.metadata.data_analise.message}</p>}
          </div>
          <div>
            <Label htmlFor="metadata.medico_responsavel">Médico Responsável</Label>
            <Input id="metadata.medico_responsavel" {...register("metadata.medico_responsavel")} />
            {errors.metadata?.medico_responsavel && <p className="text-red-500 text-sm mt-1">{errors.metadata.medico_responsavel.message}</p>}
          </div>
          <div>
            <Label htmlFor="metadata.crm">CRM</Label>
            <Input id="metadata.crm" {...register("metadata.crm")} />
            {errors.metadata?.crm && <p className="text-red-500 text-sm mt-1">{errors.metadata.crm.message}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Capa do Relatório</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reportTitle">Título do Relatório</Label>
            <Textarea id="reportTitle" {...register("reportTitle")} rows={3} />
            {errors.reportTitle && <p className="text-red-500 text-sm mt-1">{errors.reportTitle.message}</p>}
          </div>
          <div>
            <Label htmlFor="keyQuote">Citação Chave</Label>
            <Textarea id="keyQuote" {...register("keyQuote")} rows={2} />
            {errors.keyQuote && <p className="text-red-500 text-sm mt-1">{errors.keyQuote.message}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Seções do Conteúdo</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {fields.map((field, index) => (
              <AccordionItem value={`item-${index}`} key={field.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="truncate">Seção: {watchedFields.sections[index]?.title || 'Nova Seção'}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(index); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4 bg-surface-muted rounded-b-md">
                  <div>
                    <Label htmlFor={`sections.${index}.title`}>Título da Seção</Label>
                    <Input id={`sections.${index}.title`} {...register(`sections.${index}.title`)} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => append({ title: 'Nova Seção', intro: [], subsections: [] })}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Seção
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
export default ReportEditor;