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
  LogOut,
  Bell
} from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin' },
    { label: 'Scheduled Riddles', icon: <Calendar size={18} />, href: '/admin/riddles' },
    { label: 'AI Ops Center', icon: <Cpu size={18} />, href: '/admin/ai' },
    { label: 'Challenges', icon: <Trophy size={18} />, href: '/admin/challenges' },
    { label: 'AI Failures', icon: <AlertCircle size={18} />, href: '/admin/failures' },
    { label: 'Users', icon: <Users size={18} />, href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {/* Sidebar */}
      <Sidebar className="border-r border-border shadow-sm">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-text-1 text-white rounded-lg flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span className="font-display text-lg tracking-tight text-text-1">
              Advait<span className="text-text-4 font-normal">AI</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-2 rounded-lg hover:bg-white hover:text-text-1 hover:shadow-sm transition-all group"
            >
              <span className="text-text-3 group-hover:text-primary transition-colors">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-success uppercase tracking-widest">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Operational
          </div>
        </div>
      </Sidebar>

      <div className="flex-1 flex flex-col">
        <Topbar className="px-8 border-b border-border">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-sm font-bold text-text-3 uppercase tracking-widest">
              Operations Center
            </h1>
            <div className="flex items-center gap-6">
              <button className="text-text-3 hover:text-text-1 transition-colors">
                <Bell size={20} />
              </button>
              <div className="w-8 h-8 rounded-full bg-bg-subtle border border-border" />
            </div>
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
