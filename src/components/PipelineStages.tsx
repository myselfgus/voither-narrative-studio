import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, BrainCircuit, Gem, BookOpen, Stethoscope, Download, Loader2, AlertTriangle } from 'lucide-react';
export interface PipelineStage {
  name: 'ASL' | 'VDLP' | 'GEM' | 'Narrative' | 'SOAP';
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  output: string;
}
const stageDetails = {
  ASL: { icon: FileText, description: 'Análise Semântica Linguística' },
  VDLP: { icon: BrainCircuit, description: 'Vocabulário Descritivo de Linguagem Psicológica' },
  GEM: { icon: Gem, description: 'Granularidade Emocional' },
  Narrative: { icon: BookOpen, description: 'Estruturação Narrativa' },
  SOAP: { icon: Stethoscope, description: 'Notas Clínicas SOAP' },
};
interface PipelineStagesProps {
  stages: PipelineStage[];
  patientId?: string;
}
const PipelineStages: React.FC<PipelineStagesProps> = ({ stages, patientId }) => {
  const handleDownloadJson = (stage: PipelineStage) => {
    let content: string;
    let extension: string;
    try {
      // Prettify if it's a valid JSON string
      content = JSON.stringify(JSON.parse(stage.output), null, 2);
      extension = 'json';
    } catch (e) {
      // Fallback for non-JSON content
      content = stage.output;
      extension = 'txt';
    }
    const blob = new Blob([content], { type: extension === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voither-${stage.name.toLowerCase()}-${patientId || 'report'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const getBadgeVariant = (status: PipelineStage['status']) => {
    switch (status) {
      case 'complete': return 'default';
      case 'running': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };
  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <CardTitle>2. Pipeline de Análise</CardTitle>
          <CardDescription>Acompanhe o progresso da análise em cada etapa.</CardDescription>
        </CardHeader>
      </Card>
      {stages.map((stage) => {
        const details = stageDetails[stage.name];
        const Icon = details.icon;
        return (
          <motion.div key={stage.name} variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <CardTitle>{stage.name}</CardTitle>
                      <CardDescription>{details.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={getBadgeVariant(stage.status)} className="capitalize">
                    {stage.status === 'running' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {stage.status === 'error' && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {stage.status}
                  </Badge>
                </div>
                <Progress value={stage.progress} className="w-full mt-4" />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 w-full rounded-md border">
                  <Textarea
                    readOnly
                    value={stage.output}
                    className="h-full w-full p-2 font-mono text-xs border-none resize-none focus-visible:ring-0"
                    placeholder={stage.status === 'pending' ? 'Aguardando início...' : 'Aguardando resultado...'}
                  />
                </ScrollArea>
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={stage.status !== 'complete'}
                    onClick={() => handleDownloadJson(stage)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
export default PipelineStages;