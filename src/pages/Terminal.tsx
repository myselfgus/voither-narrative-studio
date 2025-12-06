import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, Send } from 'lucide-react';
const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const adminKey = searchParams.get('admin');
    const adminToken = localStorage.getItem('adminToken');
    if (adminKey === '1' || adminToken) { // Simplified auth check for demo
      setIsAuthenticated(true);
      if (adminKey) localStorage.setItem('adminToken', adminKey);
    } else {
      toast.error("Unauthorized access. Redirecting...");
      navigate('/?error=unauthorized');
    }
  }, [searchParams, navigate]);
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [output]);
  const handleCommand = async (command: string) => {
    if (!command.trim()) return;
    setIsLoading(true);
    setOutput(prev => [...prev, `> ${command}`]);
    setHistory(prev => [command, ...prev]);
    setHistoryIndex(-1);
    setInput('');
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken') || ''
        },
        body: JSON.stringify({ command }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setOutput(prev => [...prev, result.output]);
        if (command.includes('SELECT')) {
            console.log('Terminal: Executed mock D1 query successfully.');
        }
      } else {
        setOutput(prev => [...prev, `Error: ${result.error || 'Unknown error'}`]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to terminal API.';
      setOutput(prev => [...prev, `API Error: ${errorMessage}`]);
      toast.error("API Error", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };
  if (!isAuthenticated) {
    return null; // Or a loading/redirecting state
  }
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display font-bold text-4xl text-text-primary mb-8">Admin Terminal</h1>
        <Card className="glass rounded-macos">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TerminalIcon /> Voither HealthOS Console</CardTitle>
            <CardDescription id="terminal-help">Enter sanitized SQL (SELECT on Patients/Sessions), 'ls r2', or 'logs' commands.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full rounded-md border bg-black/80 p-4 font-mono text-sm" ref={scrollAreaRef}>
              {output.map((line, index) => (
                <motion.pre
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="whitespace-pre-wrap text-white"
                  style={{ animationDelay: `${index * 0.01}s` }}
                >
                  {line}
                </motion.pre>
              ))}
              {isLoading && <div className="text-white">Executing...</div>}
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <textarea
                role="textbox"
                aria-label="Terminal input"
                aria-describedby="terminal-help"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow resize-none rounded-md border bg-background p-2 font-mono text-sm focus:ring-2 focus:ring-ring"
                placeholder="Enter command..."
                disabled={isLoading}
              />
              <Button onClick={() => handleCommand(input)} disabled={isLoading}><Send className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};
export default Terminal;