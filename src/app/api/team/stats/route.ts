import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ROLE_PERMISSIONS, UserRole } from '@/app/settings/UserContext';

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Get all dev_users for statistics
  const { data: devUsers, error } = await supabase
    .from('dev_users')
    .select('id, role, status, last_active, created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = devUsers || [];

  // Calculate stats
  const totalMembers = users.length;
  const activeMembers = users.filter((u) => u.status === 'active').length;
  const pendingMembers = users.filter((u) => u.status === 'pending').length;
  const inactiveMembers = users.filter((u) => u.status === 'inactive').length;

  // Count by role
  const roleBreakdown: Record<string, number> = {};
  for (const user of users) {
    const role = user.role || 'developer';
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
  }

  // Get number of system roles
  const totalRoles = Object.keys(ROLE_PERMISSIONS).length;

  // Members active in last 24 hours
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentlyActive = users.filter((u) => {
    if (!u.last_active) return false;
    return new Date(u.last_active) > oneDayAgo;
  }).length;

  // New members this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = users.filter((u) => {
    return new Date(u.created_at) >= startOfMonth;
  }).length;

  return NextResponse.json({
    total_members: totalMembers,
    active_members: activeMembers,
    pending_members: pendingMembers,
    inactive_members: inactiveMembers,
    total_roles: totalRoles,
    recently_active: recentlyActive,
    new_this_month: newThisMonth,
    role_breakdown: roleBreakdown,
  });
}
