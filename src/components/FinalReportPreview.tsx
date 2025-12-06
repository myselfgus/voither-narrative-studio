import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { NarrativeReportData } from '@/types/report';
import ReportPreview from '@/components/ReportPreview';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Expand } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
interface FinalReportPreviewProps {
  data: NarrativeReportData | null;
  reportRef: React.RefObject<HTMLDivElement>;
}
const FinalReportPreview: React.FC<FinalReportPreviewProps> = ({ data, reportRef }) => {
  const [zoom, setZoom] = useState(0.8);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const handleZoom = (newZoom: number) => {
    const clampedZoom = Math.max(0.4, Math.min(1.2, newZoom));
    setZoom(clampedZoom);
  };
  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Final Report</CardTitle>
          <CardDescription>The final report will appear here upon completion of the pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center">
          <p className="text-text-tertiary">Awaiting data...</p>
        </CardContent>
      </Card>
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
        <Button variant="outline" size="icon" onClick={() => handleZoom(zoom - 0.1)}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom(0.8)}>
          <Expand className="w-4 h-4 mr-2" /> Reset Zoom
        </Button>
        <Button variant="outline" size="icon" onClick={() => handleZoom(zoom + 0.1)}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-grow bg-surface-muted p-4 md:p-8">
        <div
          ref={previewWrapperRef}
          className="transition-transform duration-300 ease-in-out mx-auto"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center',
            width: `calc(210mm * ${zoom})`,
          }}
        >
          <ReportPreview data={data} reportRef={reportRef} />
        </div>
      </ScrollArea>
    </motion.div>
  );
};
export default FinalReportPreview;