import React from 'react';
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
const metadataSchema = z.object({
  paciente_id: z.string().min(1, "ID do paciente �� obrigatório"),
  contexto: z.string().min(1, "Contexto é obrigatório"),
  data_analise: z.string().min(1, "Data é obrigatória"),
  medico_responsavel: z.string().min(1, "Médico é obrigatório"),
  crm: z.string().min(1, "CRM é obrigatório"),
});
const reportSchema = z.object({
  metadata: metadataSchema,
  reportTitle: z.string().min(1, "Título do relatório é obrigatório"),
  keyQuote: z.string().min(1, "Citaç��o chave é obrigatória"),
  sections: z.array(z.object({
    title: z.string().min(1, "Título da seção é obrigatório"),
    // We'll handle intro and subsections with more complex logic if needed
  })),
});
interface ReportEditorProps {
  reportData: NarrativeReportData;
  onUpdate: (data: NarrativeReportData) => void;
  onSave: () => void;
}
const ReportEditor: React.FC<ReportEditorProps> = ({ reportData, onUpdate, onSave }) => {
  const { control, register, handleSubmit, formState: { errors } } = useForm<NarrativeReportData>({
    resolver: zodResolver(reportSchema),
    defaultValues: reportData,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
  });
  const onSubmit = (data: NarrativeReportData) => {
    onUpdate(data);
    onSave();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Metadados</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>Capa do Relatório</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>Seções do Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {fields.map((field, index) => (
              <AccordionItem value={`item-${index}`} key={field.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <span>Seção {index + 1}: {reportData.sections[index]?.title}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4 bg-surface-muted rounded-b-md">
                  <div>
                    <Label htmlFor={`sections.${index}.title`}>Título da Seção</Label>
                    <Input id={`sections.${index}.title`} {...register(`sections.${index}.title`)} />
                  </div>
                  {/* Editor for subsections and blocks can be added here */}
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
      <Button type="submit" className="w-full" size="lg">Salvar Alterações</Button>
    </form>
  );
};
export default ReportEditor;