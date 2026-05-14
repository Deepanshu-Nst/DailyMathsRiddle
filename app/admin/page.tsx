import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Section } from '@/components/ui/Layout';
import { Activity, Users, Puzzle, Zap, Signal } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Active Users', value: '1,284', change: '+12%', icon: <Users size={18} />, color: 'text-info' },
    { label: 'Riddles Solved', value: '42,901', change: '+8%', icon: <Puzzle size={18} />, color: 'text-success' },
    { label: 'Avg Accuracy', value: '74.2%', change: '-2%', icon: <Target size={18} />, color: 'text-warning' },
    { label: 'System Load', value: '14%', change: 'Stable', icon: <Zap size={18} />, color: 'text-primary' },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-black text-text-1 tracking-tight mb-2">Command Center</h1>
        <p className="text-text-3 text-sm">Operational overview and system intelligence for the AdvaitAI network.</p>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} padding="md" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="label">{stat.label}</span>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-text-1">{stat.value}</span>
              <span className={[`text-[10px] font-bold px-1.5 py-0.5 rounded`, 
                stat.change.includes('+') ? 'bg-success-bg text-success' : 
                stat.change === 'Stable' ? 'bg-bg-subtle text-text-3' : 'bg-error-bg text-error'
              ].join(' ')}>
                {stat.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* System Signals */}
      <Section title="System Signals" subtitle="Real-time operational events across the infrastructure.">
        <Card padding="none" className="overflow-hidden">
          <div className="bg-bg-subtle/50 px-6 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-3 uppercase tracking-widest">
              <Signal size={12} className="text-success" />
              Live Stream
            </div>
            <Badge variant="secondary" size="sm">Active</Badge>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-5 hover:bg-surface-hover/50 transition-colors group">
                <div className="mt-1 w-2 h-2 rounded-full bg-border group-hover:bg-primary transition-colors shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-sm font-medium text-text-1">
                    {i % 2 === 0 ? 'New riddle generated successfully via Advait-7b' : 'Leaderboard cache invalidated for maintenance'}
                  </p>
                  <p className="text-xs text-text-3">
                    {i % 2 === 0 ? 'Pipeline: Daily Automated Cron • 2m ago' : 'System: Maintenance Worker • 15m ago'}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-text-4">TRC-9421-X</div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-bg-subtle/30 border-t border-border">
            <button className="text-xs font-bold text-primary hover:underline">View All System Logs →</button>
          </div>
        </Card>
      </Section>
    </div>
  );
}

import { Target } from 'lucide-react';

