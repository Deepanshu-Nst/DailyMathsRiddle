import { requireAdmin } from '@/lib/auth/requireAdmin';
import Link from 'next/link';
import { Sidebar, Topbar, Container } from '@/components/ui/Layout';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  AlertCircle, 
  Users, 
  ShieldCheck,
  Cpu,
  ListChecks,
  ClipboardList
} from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin' },
    { label: 'Scheduled riddles', icon: <Calendar size={18} />, href: '/admin/riddles' },
    { label: 'Publish queue', icon: <ListChecks size={18} />, href: '/admin/queue' },
    { label: 'Generation', icon: <Cpu size={18} />, href: '/admin/ai' },
    { label: 'Challenges', icon: <Trophy size={18} />, href: '/admin/challenges' },
    { label: 'Failed generations', icon: <AlertCircle size={18} />, href: '/admin/failures' },
    { label: 'Users', icon: <Users size={18} />, href: '/admin/users' },
    { label: 'Audit history', icon: <ClipboardList size={18} />, href: '/admin/audit' },
  ];

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {/* Sidebar */}
      <Sidebar className="border-r border-border">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-border bg-bg-muted flex items-center justify-center text-text-2">
              <ShieldCheck size={18} />
            </div>
            <span className="text-sm font-semibold text-text-1">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-2 rounded-lg hover:bg-surface-hover hover:text-text-1 transition-colors group"
            >
              <span className="text-text-3 group-hover:text-text-2 transition-colors">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link href="/" className="px-4 py-2 text-xs font-medium text-text-3 hover:text-text-2 transition-colors">
            ← Back to app
          </Link>
        </div>
      </Sidebar>

      <div className="flex-1 flex flex-col">
        <Topbar className="px-8 border-b border-border">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium text-text-3">AdvaitAI Admin</span>
          </div>
        </Topbar>

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
