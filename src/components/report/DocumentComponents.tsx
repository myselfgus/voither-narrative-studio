import React from 'react';
import type { StandardProps } from '@/lib/documentUtils';
// Display Titles (Headers, Cover)
const H1: React.FC<StandardProps> = ({ children, className = '' }) => (
  <h1 className={`font-display font-bold text-5xl md:text-6xl text-text-primary leading-[0.95] tracking-tight ${className}`}>
    {children}
  </h1>
);
const H2: React.FC<StandardProps> = ({ children, className = '' }) => (
  <h2 className={`font-display font-bold text-2xl text-text-primary uppercase tracking-tight ${className}`}>
    {children}
  </h2>
);
const Brand: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-brand font-bold text-text-primary tracking-tighter">
    {children}
  </span>
);
export const Display = { H1, H2, Brand };
// Technical Text (Labels, Metadata, Captions)
const Label: React.FC<StandardProps> = ({ children, className = '' }) => (
  <span className={`block font-mono text-[10px] font-medium text-text-tertiary uppercase tracking-widest leading-none mb-1.5 ${className}`}>
    {children}
  </span>
);
const Meta: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-xs font-light text-text-secondary tracking-wide">
    {children}
  </span>
);
export const Mono = { Label, Meta };
// Body Text (Content, Paragraphs)
const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-sans font-light text-[15px] text-text-primary leading-8 text-justify mb-5 last:mb-0">
    {children}
  </p>
);
const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-4 items-baseline mb-3">
    <span className="font-mono text-text-primary/40 font-bold text-[10px] mt-2 shrink-0">•</span>
    <span className="font-sans font-light text-[15px] text-text-primary leading-relaxed text-justify">
      {children}
    </span>
  </div>
);
const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="my-8 pl-6 border-l-4 border-text-primary py-2">
    <p className="font-sans text-xl font-light italic text-text-primary leading-relaxed">
      "{children}"
    </p>
  </div>
);
export const Body = { Paragraph, ListItem, Blockquote };
// --- LAYOUT COMPONENTS ---
export const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`mb-16 print-break-inside-avoid ${className}`}>
    {title && (
      <div className="border-b border-border-strong pb-4 mb-8 mt-12 flex items-end justify-between print-break-after-avoid">
        <Display.H2 className="max-w-[80%]">{title}</Display.H2>
        <div className="h-2 w-2 bg-text-primary mb-1"></div>
      </div>
    )}
    {children}
  </section>
);
export const SubSection: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-10 last:mb-0">
    <h3 className="font-display text-lg font-bold text-text-secondary tracking-tight mb-4 flex items-center gap-3">
      <span className="w-8 h-[1px] bg-text-tertiary"></span>
      {title}
    </h3>
    {children}
  </div>
);