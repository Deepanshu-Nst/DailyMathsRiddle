import { requireAdmin } from '@/lib/auth/requireAdmin';
import Link from 'next/link';
import { Sidebar, Topbar } from '@/components/ui/Layout';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { AdminNav } from '@/app/admin/AdminNav';



export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {/* Sidebar */}
      <Sidebar className="border-r border-white/[0.06]">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl border border-white/[0.08] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary transition-all group-hover:shadow-[0_0_16px_rgba(108,123,255,0.2)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-1 block">Admin</span>
              <span className="text-[10px] text-text-4 font-mono">AdvaitAI</span>
            </div>
          </Link>
        </div>

        <AdminNav />

        <div className="border-t border-white/[0.06] p-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-3 hover:text-text-1 rounded-lg hover:bg-white/[0.04] transition-all"
          >
            <ArrowLeft size={14} />
            Back to app
          </Link>
        </div>
      </Sidebar>

      <div className="flex-1 flex flex-col">
        <Topbar className="px-8 border-b border-white/[0.06]">
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
