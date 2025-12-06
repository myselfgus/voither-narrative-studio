import React, { useState, useCallback } from 'react';
import { Upload, FileJson, ClipboardPaste } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
interface UploadJsonProps {
  onJsonParsed: (jsonData: any) => void;
}
const UploadJson: React.FC<UploadJsonProps> = ({ onJsonParsed }) => {
  const [jsonText, setJsonText] = useState('');
  const handleParse = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      onJsonParsed(parsed);
      toast.success('JSON importado com sucesso!');
    } catch (error) {
      toast.error('JSON inválido.', {
        description: 'Por favor, verifique a sintaxe do seu arquivo JSON.',
      });
    }
  };
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setJsonText(text);
        handleParse(text);
      };
      reader.readAsText(file);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: false,
  });
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      handleParse(text);
    } catch (error) {
      toast.error('Falha ao colar da área de transferência.');
    }
  };
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-text-secondary">
          <Upload className="w-8 h-8" />
          {isDragActive ? (
            <p>Solte o arquivo aqui...</p>
          ) : (
            <p>Arraste e solte um arquivo .json ou clique para selecionar</p>
          )}
        </div>
      </div>
      <div className="relative">
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="Ou cole o conteúdo JSON aqui..."
          className="h-48"
        />
        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handlePaste}>
          <ClipboardPaste className="w-4 h-4" />
        </Button>
      </div>
      <Button onClick={() => handleParse(jsonText)} disabled={!jsonText} className="w-full">
        <FileJson className="w-4 h-4 mr-2" />
        Processar JSON
      </Button>
    </div>
  );
};
export default UploadJson;