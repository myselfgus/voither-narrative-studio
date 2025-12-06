import { FileJson, Bot, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
            <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-text-primary leading-tight tracking-tighter">
              Estúdio Narrativo Clínico
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-text-secondary">
              Transforme dados clínicos estruturados em relatórios narrativos elegantes e prontos para impressão, com o poder da IA da Cloudflare.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button asChild size="lg" className="bg-text-primary text-surface hover:bg-text-secondary">
                <Link to="/builder">
                  <FileJson className="mr-2 h-5 w-5" />
                  Iniciar Novo Relatório
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sessions">
                  Ver Sessões Salvas
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 pb-16 md:pb-24 lg:pb-32">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileJson className="w-5 h-5 text-text-tertiary" /> Importação Simples</CardTitle>
                <CardDescription>Faça upload ou cole seu JSON clínico pré-formatado para começar.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">O sistema valida a estrutura do seu JSON instantaneamente, garantindo que todos os campos necessários estejam presentes antes do processamento.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-text-tertiary" /> Orquestração com IA</CardTitle>
                <CardDescription>Utilize nosso gateway 'voither' para validar, enriquecer e formatar seu relatório.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">A IA melhora o tom clínico, preenche campos ausentes e estrutura o conteúdo em seções e parágrafos coesos, prontos para revisão.</p>
              </CardContent>
            </Card>
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