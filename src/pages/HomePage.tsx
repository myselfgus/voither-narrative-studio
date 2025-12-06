import { FileText, BrainCircuit, Gem, BookOpen, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
const pipelineStages = [
  { name: 'ASL', icon: FileText, description: 'Extrai elementos semânticos e linguísticos da fala.' },
  { name: 'VDLP', icon: BrainCircuit, description: 'Mapeia a linguagem para um vocabulário psicológico descritivo.' },
  { name: 'GEM', icon: Gem, description: 'Avalia a granularidade e a complexidade emocional expressa.' },
  { name: 'Narrative', icon: BookOpen, description: 'Estrutura a análise em um formato de relatório narrativo coeso.' },
  { name: 'SOAP', icon: Stethoscope, description: 'Gera notas clínicas estruturadas no formato SOAP.' },
];
export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-muted dark:bg-background">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="font-brand font-bold text-2xl text-text-primary tracking-tighter">VOITHER</span>
            <span className="font-display font-light text-text-secondary">HealthOS</span>
          </div>
          <ThemeToggle className="relative top-0 right-0" />
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 md:py-24 lg:py-32 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-text-primary leading-tight tracking-tighter">
                Pipeline de Análise de Transcri��ões
              </h1>
              <p className="mt-6 max-w-3xl mx-auto text-lg text-text-secondary">
                Transforme transcrições de consultas em relatórios clínicos estruturados através de 5 etapas de análise com IA.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="bg-text-primary text-surface hover:bg-text-secondary">
                  <Link to="/builder">
                    <FileText className="mr-2 h-5 w-5" />
                    Iniciar Análise de Transcrição
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/sessions">
                    Ver Análises Salvas
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="pb-16 md:pb-24 lg:pb-32">
            <h2 className="text-3xl font-bold text-center mb-12 font-display">Como Funciona</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {pipelineStages.map((stage, index) => (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full text-center">
                    <CardHeader className="items-center">
                      <div className="p-3 bg-surface-subtle rounded-full mb-2">
                        <stage.icon className="w-6 h-6 text-text-secondary" />
                      </div>
                      <CardTitle>{stage.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-secondary">{stage.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-surface dark:bg-background border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-text-tertiary">
          <p>
            Construído com ❤️ na Cloudflare.
          </p>
          <p className="mt-2 text-xs opacity-75">
            Nota: O uso dos recursos de IA está sujeito a limites de requisições para garantir a disponibilidade do serviço.
          </p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}