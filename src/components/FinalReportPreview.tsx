import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { NarrativeReportData } from '@/types/report';
import ReportPreview from '@/components/ReportPreview';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Expand } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
interface FinalReportPreviewProps {
  data: NarrativeReportData | null;
  reportRef: React.RefObject<HTMLDivElement>;
}
const FinalReportPreview: React.FC<FinalReportPreviewProps> = ({ data, reportRef }) => {
  const [zoom, setZoom] = useState(1);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const handleZoom = (newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(1.5, newZoom));
    setZoom(clampedZoom);
  };
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-muted rounded-lg">
        <p className="text-text-tertiary">Relatório final aparecerá aqui após a conclusão.</p>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col"
    >
      <div className="flex-shrink-0 p-2 border-b bg-surface rounded-t-lg flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handleZoom(zoom - 0.1)}>
          <ZoomOut className="w-4 h-4 mr-2" /> Reduzir
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
          <Expand className="w-4 h-4 mr-2" /> 100%
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleZoom(zoom + 0.1)}>
          <ZoomIn className="w-4 h-4 mr-2" /> Ampliar
        </Button>
      </div>
      <ScrollArea className="flex-grow bg-surface-muted p-4 md:p-8">
        <div
          ref={previewWrapperRef}
          className="transition-transform duration-300 ease-in-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <ReportPreview data={data} reportRef={reportRef} />
        </div>
      </ScrollArea>
    </motion.div>
  );
};
export default FinalReportPreview;