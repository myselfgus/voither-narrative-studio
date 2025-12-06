import React from "react";
import { motion } from "framer-motion";
import { Navigation } from '@/components/Navigation';
import { Toaster } from "@/components/ui/sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
type AppLayoutProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};
export function AppLayout({ children, footer }: AppLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen flex bg-surface-muted dark:bg-background">
      <Navigation />
      <div className="flex-1 flex flex-col">
        <motion.main
          role="main"
          className="flex-grow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8 md:py-10 lg:py-12">
              {children}
            </div>
          </div>
        </motion.main>
        <footer className="bg-surface dark:bg-background border-t mt-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-text-tertiary">
            {footer ? footer : (
              <Accordion type="single" collapsible className="w-full max-w-md mx-auto">
                <AccordionItem value="ai-limits">
                  <AccordionTrigger className="text-xs">AI Usage & Service Information</AccordionTrigger>
                  <AccordionContent className="text-xs text-left space-y-2">
                    <p>AI-powered features use Cloudflare Workers AI Gateway (voither).</p>
                    <p>Requests are rate-limited for fair usage across the platform. Please monitor your usage via your Cloudflare dashboard.</p>
                    <p className="mt-4 font-semibold">Built with ❤��� at Cloudflare</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </footer>
      </div>
      <Toaster richColors closeButton />
    </div>
  );
}