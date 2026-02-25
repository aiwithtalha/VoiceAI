'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Bot,
  Phone,
  Volume2,
  Settings,
  Key,
  FileText,
  Users,
  CreditCard,
  Plug,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Headphones,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assistants', href: '/dashboard/assistants', icon: Bot },
  { name: 'Phone Numbers', href: '/dashboard/phone-numbers', icon: Phone },
  { name: 'Voice Library', href: '/dashboard/voice-library', icon: Volume2 },
  { name: 'Providers', href: '/dashboard/providers', icon: Plug },
  { name: 'Tools', href: '/dashboard/tools', icon: Wrench },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Headphones },
  { name: 'Call Logs', href: '/dashboard/calls', icon: FileText },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/50 lg:hidden transition-opacity',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        onClick={() => onCollapse(true)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r border-slate-200 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          'lg:translate-x-0',
          collapsed && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-slate-900">VoiceAI</span>
            )}
          </Link>
          <button
            onClick={() => onCollapse(!collapsed)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      collapsed && 'justify-center'
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        {!collapsed && (
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-600">Need help?</p>
              <p className="mt-1 text-xs text-slate-500">
                Check our documentation or contact support.
              </p>
              <Link
                href="/docs"
                className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                View Documentation
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
