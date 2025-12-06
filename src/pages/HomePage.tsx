import { FileText, BrainCircuit, Gem, BookOpen, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
const pipelineStages = [
  { name: 'ASL', icon: FileText, description: 'Extracts semantic and linguistic elements from speech.' },
  { name: 'VDLP', icon: BrainCircuit, description: 'Maps language to a descriptive psychological vocabulary.' },
  { name: 'GEM', icon: Gem, description: 'Assesses the granularity and complexity of expressed emotion.' },
  { name: 'Narrative', icon: BookOpen, description: 'Structures the analysis into a cohesive narrative report format.' },
  { name: 'SOAP', icon: Stethoscope, description: 'Generates structured clinical notes in SOAP format.' },
];
export function HomePage() {
  const footer = (
    <>
      <p>AI-powered features use Cloudflare Workers AI Gateway (voither).</p>
      <p className="mt-2 text-xs opacity-75">
        Requests are rate-limited for fair usage. Check your Cloudflare dashboard for limits and monitoring.
      </p>
    </>
  );
  return (
    <AppLayout footer={footer}>
      <div className="text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-text-primary to-text-secondary text-transparent bg-clip-text leading-tight tracking-tighter">
            Transcription Analysis Pipeline
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-text-secondary">
            Transform consultation transcripts into structured clinical reports through 5 stages of AI analysis.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-text-primary text-surface hover:bg-text-secondary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1">
              <Link to="/builder">
                <FileText className="mr-2 h-5 w-5" />
                Start Transcription Analysis
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <Link to="/sessions">
                View Saved Analyses
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
      <div className="pt-16 md:pt-24 lg:pt-32">
        <h2 className="text-3xl font-bold text-center mb-12 font-display">How It Works</h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {pipelineStages.map((stage) => (
            <motion.div
              key={stage.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="h-full"
            >
              <Card className="h-full text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
        </motion.div>
      </div>
    </AppLayout>
  );
}