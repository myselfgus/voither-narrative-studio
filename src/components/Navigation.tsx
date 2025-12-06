import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Bot, List, Download, Menu, FileText, Users, Mic, Settings, Search, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import { useDebounce } from 'react-use';
import { chatService } from '@/lib/chat';
const baseNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/builder', label: 'Pipeline', icon: Bot },
  { href: '/recordings', label: 'Video Wall', icon: Mic },
  {
    label: 'Patients', icon: Users, subItems: [
      { href: '/patients', label: 'Directory' },
      { href: '/sessions', label: 'All Sessions' },
      { href: '/exports', label: 'All Documents' },
    ]
  },
  { href: '/pdf-generator', label: 'PDF Generator', icon: FileText },
];
const NavLink = ({ href, label, icon: Icon, isSubItem = false }: { href: string; label: string; icon?: React.ElementType; isSubItem?: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === href;
  return (
    <Link to={href} aria-current={isActive ? 'page' : undefined}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          isSubItem && "pl-12"
        )}
      >
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </Link>
  );
};
const SidebarContent = ({ navItems, closeOnNavigate = false }: { navItems: any[]; closeOnNavigate?: boolean }) => {
  const location = useLocation();
  const defaultOpen = useMemo(() => {
    const openGroup = navItems.find(item => item.subItems?.some((sub: any) => location.pathname.startsWith(sub.href)));
    return openGroup ? [openGroup.label] : [];
  }, [navItems, location.pathname]);
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-brand font-bold text-2xl text-text-primary tracking-tighter">VOITHER</span>
          <span className="font-display font-light text-text-secondary">HealthOS</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
          {navItems.map((item) =>
            item.subItems ? (
              <AccordionItem value={item.label} key={item.label} className="border-b-0">
                <AccordionTrigger className="hover:no-underline px-3 rounded-md hover:bg-accent/50">
                  <div className="flex items-center"><item.icon className="mr-2 h-4 w-4" /> {item.label}</div>
                </AccordionTrigger>
                <AccordionContent className="pl-2 pt-1 space-y-1">
                  {item.subItems.map((sub: any) => (
                    closeOnNavigate ? (
                      <SheetClose asChild key={sub.href}><NavLink {...sub} isSubItem /></SheetClose>
                    ) : (
                      <NavLink {...sub} isSubItem key={sub.href} />
                    )
                  ))}
                </AccordionContent>
              </AccordionItem>
            ) : (
              closeOnNavigate ? (
                <SheetClose asChild key={item.href}><NavLink {...item} /></SheetClose>
              ) : (
                <NavLink {...item} key={item.href} />
              )
            )
          )}
        </Accordion>
      </div>
      <div className="p-4 mt-auto border-t">
        <ThemeToggle className="relative" />
      </div>
    </div>
  );
};
export function Navigation() {
  const [showAdmin, setShowAdmin] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' || localStorage.getItem('adminToken')) {
      setShowAdmin(true);
    }
  }, []);
  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (showAdmin) {
      items.push({ href: '/terminal', label: 'Terminal', icon: Settings });
      items.push({ href: '/admin', label: 'Admin', icon: Settings });
    }
    return items;
  }, [showAdmin]);
  return (
    <>
      <aside className="hidden md:block w-64 flex-shrink-0 glass rounded-macos m-2">
        <SidebarContent navItems={navItems} />
      </aside>
      <header className="md:hidden sticky top-0 z-50 w-full border-b glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-brand font-bold text-xl text-text-primary tracking-tighter">VOITHER</span>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 glass">
                <SidebarContent navItems={navItems} closeOnNavigate />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}