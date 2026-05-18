import { createServiceClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';

type AuditLogWithActor = Database['public']['Tables']['admin_audit_logs']['Row'] & {
  actor: { username: string | null; full_name: string | null } | null;
};

/**
 * Records an immutable audit log entry for an admin action.
 * Non-throwing — audit failures must never break the primary action.
 */
export async function logAdminAction(opts: {
  actorId: string;
  action:
    | 'publish'
    | 'replace'
    | 'rollback'
    | 'regenerate'
    | 'approve'
    | 'reject'
    | 'config_change'
    | 'manual_publish'
    | 'slot_publish'
    | 'slot_override'
    | 'slot_schedule';
  targetType: 'riddle' | 'queue_entry' | 'generation_job' | 'config' | 'scheduled_riddle';
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = (await createServiceClient()) as any;
    const { error } = await supabase.from('admin_audit_logs').insert({
      actor_id: opts.actorId,
      action: opts.action,
      target_type: opts.targetType,
      target_id: opts.targetId,
      metadata: opts.metadata ?? {},
    });

    if (error) {
      console.error('[audit] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit log:', err);
  }
}

/**
 * Fetches audit log entries, ordered newest first.
 */
export async function getAuditLogs(opts?: {
  action?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogWithActor[]; total: number }> {
  const supabase = (await createServiceClient()) as any;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from('admin_audit_logs')
    .select('*, actor:profiles!actor_id(username, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.action) query = query.eq('action', opts.action);
  if (opts?.actorId) query = query.eq('actor_id', opts.actorId);

  const { data, count, error } = await query;

  if (error) {
    console.error('[audit] Failed to fetch audit logs:', error.message);
    return { logs: [], total: 0 };
  }

  return { logs: data ?? [], total: count ?? 0 };
}
