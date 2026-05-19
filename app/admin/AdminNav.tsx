'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  AlertCircle, 
  Users, 
  Cpu,
  ListChecks,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Scheduled riddles', icon: Calendar, href: '/admin/riddles' },
  { label: 'Publish queue', icon: ListChecks, href: '/admin/queue' },
  { label: 'Generation', icon: Cpu, href: '/admin/ai' },
  { label: 'Challenges', icon: Trophy, href: '/admin/challenges' },
  { label: 'Failed generations', icon: AlertCircle, href: '/admin/failures' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Audit history', icon: ClipboardList, href: '/admin/audit' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={[
              'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all group relative',
              isActive
                ? 'text-text-1 bg-white/[0.06] shadow-[inset_3px_0_0_var(--color-primary)]'
                : 'text-text-2 hover:bg-white/[0.04] hover:text-text-1',
            ].join(' ')}
          >
            <span className={[
              'transition-colors',
              isActive ? 'text-primary' : 'text-text-3 group-hover:text-text-2',
            ].join(' ')}>
              <Icon size={18} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
