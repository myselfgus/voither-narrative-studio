import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';
interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldData: string;
  newData: string;
}
const DiffModal: React.FC<DiffModalProps> = ({ isOpen, onClose, oldData, newData }) => {
  const dmp = new DiffMatchPatch();
  const diff = dmp.diff_main(oldData, newData);
  dmp.diff_cleanupSemantic(diff);
  const renderDiff = () => {
    return diff.map(([op, text], index) => {
      const style = {
        '-1': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through',
        '1': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
        '0': 'text-foreground/70',
      }[op];
      return (
        <span key={index} className={`${style} transition-colors`}>
          {text}
        </span>
      );
    });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Revisão das Alterações da IA</DialogTitle>
          <DialogDescription>
            Revise as alterações sugeridas pela IA. As adições estão em verde e as remoções em vermelho.
          </DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ScrollArea className="h-[60vh] rounded-md border p-4 font-mono text-sm whitespace-pre-wrap">
            {renderDiff()}
          </ScrollArea>
        </motion.div>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default DiffModal;