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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { useDebounce } from 'react-use';
const contentBlockSchema = z.object({
  type: z.enum(['paragraph', 'quote', 'list']),
  content: z.union([z.string(), z.array(z.string())]),
});
const subsectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  blocks: z.array(contentBlockSchema),
});
const sectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  intro: z.array(contentBlockSchema),
  subsections: z.array(subsectionSchema),
});
const metadataSchema = z.object({
  paciente_id: z.string().min(1, "Patient ID is required"),
  contexto: z.string().min(1, "Context is required"),
  data_analise: z.string().min(1, "Date is required"),
  medico_responsavel: z.string().min(1, "Doctor is required"),
  crm: z.string().min(1, "CRM is required"),
  total_turnos: z.number().min(0).optional(),
  total_palavras: z.number().min(0).optional(),
  duracao_estimada_consulta: z.string().optional(),
  analista: z.string().optional(),
});
const reportSchema = z.object({
  metadata: metadataSchema,
  reportTitle: z.string().min(1, "Report title is required"),
  keyQuote: z.string().min(1, "Key quote is required"),
  sections: z.array(sectionSchema),
});
type FormValues = z.infer<typeof reportSchema>;
interface ReportEditorProps {
  reportData: NarrativeReportData;
  onUpdate: (data: NarrativeReportData) => void;
  onSave: () => void;
}
const SortableItem: React.FC<{ id: any; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 w-full">
      <button type="button" {...attributes} {...listeners} className="p-2 mt-8 cursor-grab focus:outline-none focus:ring-2 focus:ring-ring rounded">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
      <div className="flex-grow">{children}</div>
    </div>
  );
};
const ReportEditor: React.FC<ReportEditorProps> = ({ reportData, onUpdate, onSave }) => {
  const { control, register, handleSubmit, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: reportData,
  });
  useEffect(() => {
    reset(reportData);
  }, [reportData, reset]);
  const { fields: sectionFields, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({ control, name: "sections" });
  const watchedFields = watch();
  useDebounce(() => {
    onUpdate(watchedFields as NarrativeReportData);
  }, 500, [watchedFields, onUpdate]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionFields.findIndex(item => item.id === active.id);
      const newIndex = sectionFields.findIndex(item => item.id === over.id);
      moveSection(oldIndex, newIndex);
    }
  };
  const onSubmit = (data: FormValues) => {
    onUpdate(data as NarrativeReportData);
    onSave();
  };
  return (
    <motion.form 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-6"
    >
      <Card>
        <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="metadata.paciente_id">Patient ID</Label>
            <Input id="metadata.paciente_id" {...register("metadata.paciente_id")} />
            {errors.metadata?.paciente_id && <p className="text-red-500 text-sm mt-1">{errors.metadata.paciente_id.message}</p>}
          </div>
          {/* Other metadata fields */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Cover</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reportTitle">Report Title</Label>
            <Textarea id="reportTitle" {...register("reportTitle")} rows={2} />
            {errors.reportTitle && <p className="text-red-500 text-sm mt-1">{errors.reportTitle.message}</p>}
          </div>
          <div>
            <Label htmlFor="keyQuote">Key Quote</Label>
            <Textarea id="keyQuote" {...register("keyQuote")} rows={2} />
            {errors.keyQuote && <p className="text-red-500 text-sm mt-1">{errors.keyQuote.message}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Content Sections</CardTitle>
          <CardDescription>Drag to reorder sections.</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sectionFields.map((field, index) => (
                  <SortableItem key={field.id} id={field.id}>
                    <motion.div layout className="w-full border rounded-md p-4">
                      <div className="flex justify-between items-center mb-4">
                        <Input {...register(`sections.${index}.title`)} className="text-lg font-bold" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {/* Intro and subsections editor would go here */}
                    </motion.div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => appendSection({ title: 'New Section', intro: [], subsections: [] })}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Section
          </Button>
        </CardContent>
      </Card>
      <Button type="submit" className="w-full">Save Changes</Button>
    </motion.form>
  );
};
export default ReportEditor;