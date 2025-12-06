import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NarrativeReportData, Section as SectionType, Subsection as SubsectionType, ContentBlock as ContentBlockType } from '@/types/report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { useDebounce } from 'react-use';
// Zod schema matching NarrativeReportData interface exactly
const contentBlockSchema = z.object({
  type: z.enum(['paragraph', 'quote', 'list']),
  content: z.union([z.string(), z.array(z.string())]),
});
const subsectionSchema = z.object({
  title: z.string().min(1, "Título da subseção é obrigatório"),
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
  total_turnos: z.number().min(0, "Deve ser um número positivo"),
  total_palavras: z.number().min(0, "Deve ser um número positivo"),
  duracao_estimada_consulta: z.string(),
  analista: z.string(),
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
const SortableItem = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 w-full">
      <button {...attributes} {...listeners} className="p-2 mt-2 cursor-grab focus:outline-none focus:ring-2 focus:ring-ring rounded">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
      <div className="flex-grow">{children}</div>
    </div>
  );
};
const ReportEditor: React.FC<ReportEditorProps> = ({ reportData, onUpdate, onSave }) => {
  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<NarrativeReportData>({
    resolver: zodResolver(reportSchema),
    defaultValues: reportData,
  });
  const { fields: sectionFields, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({ control, name: "sections" });
  const watchedFields = watch();
  useDebounce(() => {
    onUpdate(watchedFields);
  }, 500, [watchedFields, onUpdate]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent, moveFn: (from: number, to: number) => void) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionFields.findIndex(item => item.id === active.id);
      const newIndex = sectionFields.findIndex(item => item.id === over.id);
      moveFn(oldIndex, newIndex);
    }
  };
  const onSubmit = (data: NarrativeReportData) => {
    onUpdate(data);
    onSave();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Metadados</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <Label htmlFor="metadata.analista">Analista</Label>
            <Input id="metadata.analista" {...register("metadata.analista")} />
          </div>
          <div>
            <Label htmlFor="metadata.total_turnos">Total de Turnos</Label>
            <Input id="metadata.total_turnos" type="number" {...register("metadata.total_turnos", { valueAsNumber: true })} />
            {errors.metadata?.total_turnos && <p className="text-red-500 text-sm mt-1">{errors.metadata.total_turnos.message}</p>}
          </div>
          <div>
            <Label htmlFor="metadata.total_palavras">Total de Palavras</Label>
            <Input id="metadata.total_palavras" type="number" {...register("metadata.total_palavras", { valueAsNumber: true })} />
            {errors.metadata?.total_palavras && <p className="text-red-500 text-sm mt-1">{errors.metadata.total_palavras.message}</p>}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="metadata.duracao_estimada_consulta">Duração Estimada</Label>
            <Input id="metadata.duracao_estimada_consulta" {...register("metadata.duracao_estimada_consulta")} />
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
        <CardHeader>
          <CardTitle>Seções do Conteúdo</CardTitle>
          <CardDescription>Arraste para reordenar as seções.</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, moveSection)}>
            <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" className="w-full space-y-2">
                {sectionFields.map((field, index) => (
                  <SortableItem key={field.id} id={field.id}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full border rounded-md"
                    >
                      <AccordionItem value={field.id} className="border-b-0">
                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium truncate pr-2">Seção: {watchedFields.sections[index]?.title || 'Nova Seção'}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeSection(index); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 space-y-4 bg-surface-muted dark:bg-background/30 rounded-b-md">
                          <div>
                            <Label htmlFor={`sections.${index}.title`}>Título da Seção</Label>
                            <Input id={`sections.${index}.title`} {...register(`sections.${index}.title`)} />
                            {errors.sections?.[index]?.title && <p className="text-red-500 text-sm mt-1">{errors.sections[index]?.title?.message}</p>}
                          </div>
                          {/* TODO: Add field arrays for intro and subsections */}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  </SortableItem>
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => appendSection({ title: 'Nova Seção', intro: [], subsections: [] })}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Seção
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
export default ReportEditor;