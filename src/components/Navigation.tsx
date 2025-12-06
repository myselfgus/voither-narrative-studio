import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Bot, List, Download, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/builder', label: 'Pipeline', icon: Bot },
  { href: '/sessions', label: 'Sessions', icon: List },
  { href: '/exports', label: 'Exports', icon: Download },
];
const NavLink = ({ href, label, icon: Icon, isMobile = false }: { href: string; label: string; icon: React.ElementType; isMobile?: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === href || (href === '/builder' && location.pathname.startsWith('/builder'));
  return (
    <Button asChild variant={isActive ? "secondary" : "ghost"} className={cn("justify-start", isMobile && "w-full")}>
      <Link to={href}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
};
export function Navigation() {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-brand font-bold text-2xl text-text-primary tracking-tighter">VOITHER</span>
              <span className="font-display font-light text-text-secondary hidden sm:inline">HealthOS</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(item => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="relative top-0 right-0" />
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[240px]">
                  <div className="flex flex-col gap-4 py-6">
                    {navItems.map(item => (
                      <SheetClose asChild key={item.href}>
                         <NavLink {...item} isMobile />
                      </SheetClose>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}