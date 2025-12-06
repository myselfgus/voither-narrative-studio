import React from "react";
import { Navigation } from '@/components/Navigation';
import { Toaster } from "@/components/ui/sonner";
type AppLayoutProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};
export function AppLayout({ children, footer }: AppLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-surface-muted dark:bg-background">
      <Navigation />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            {children}
          </div>
        </div>
      </main>
      {footer ? (
        <footer className="bg-surface dark:bg-background border-t">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-text-tertiary">
            {footer}
          </div>
        </footer>
      ) : (
        <footer className="bg-surface dark:bg-background border-t">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-text-tertiary">
            <p>Built with ❤️ at Cloudflare</p>
            <p className="mt-2 text-xs opacity-75">
              Note: AI feature usage is subject to request limits to ensure service availability.
            </p>
          </div>
        </footer>
      )}
      <Toaster richColors closeButton />
    </div>
  );
}