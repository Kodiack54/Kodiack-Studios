import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ROLE_PERMISSIONS, ALL_ROLES, UserRole } from '@/lib/roles';

export async function GET(request: Request) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');

  // Query dev_users joined with nextbid_users for name/email and nextbid_profiles for profile data
  let query = supabase
    .from('dev_users')
    .select(`
      id,
      nextbid_user_id,
      role,
      permissions,
      status,
      last_active,
      created_at,
      updated_at,
      nextbid_users (
        id,
        email,
        name,
        nextbid_profiles (
          avatar_url,
          phone,
          title,
          department
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (role) {
    query = query.eq('role', role.toLowerCase());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to expected format
  const transformed = (data || []).map((m: any) => {
    const nextbidUser = m.nextbid_users;
    const profile = nextbidUser?.nextbid_profiles?.[0] || {};
    const roleName = (m.role || 'developer') as UserRole;
    const roleLevel = ROLE_PERMISSIONS[roleName]?.level || 0;

    return {
      id: m.id,
      nextbid_user_id: m.nextbid_user_id,
      name: nextbidUser?.name || 'Unknown',
      email: nextbidUser?.email || '',
      status: m.status || 'active',
      permissions: m.permissions || [],
      projects: [], // Projects come from dev_team_members (separate concept)
      created_at: m.created_at,
      updated_at: m.updated_at,
      last_active: m.last_active,
      role: roleName,
      role_level: roleLevel,
      // Profile fields from nextbid_profiles (shared across all products)
      phone: profile.phone || '',
      title: profile.title || '',
      department: profile.department || '',
      avatar_url: profile.avatar_url || '',
    };
  });

  return NextResponse.json(transformed);
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { name, email, role, permissions } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }

  // Validate role is a valid UserRole
  if (!ALL_ROLES.includes(role.toLowerCase() as UserRole)) {
    return NextResponse.json({ error: `Invalid role '${role}'. Valid roles: ${ALL_ROLES.join(', ')}` }, { status: 400 });
  }

  // Check if nextbid_user exists with this email
  const { data: existingUser, error: lookupError } = await supabase
    .from('nextbid_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (lookupError && lookupError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!existingUser) {
    return NextResponse.json({
      error: `No NextBid account found for ${email}. User must first register at the Gateway.`
    }, { status: 400 });
  }

  // Check if dev_users record already exists
  const { data: existingDevUser, error: devLookupError } = await supabase
    .from('dev_users')
    .select('id')
    .eq('nextbid_user_id', existingUser.id)
    .single();

  if (existingDevUser) {
    return NextResponse.json({
      error: `User ${email} already has Dashboard access`
    }, { status: 400 });
  }

  // Create dev_users record
  const { data, error } = await supabase
    .from('dev_users')
    .insert({
      nextbid_user_id: existingUser.id,
      role: role.toLowerCase(),
      permissions: permissions || [],
      status: 'active',
    })
    .select(`
      id,
      nextbid_user_id,
      role,
      permissions,
      status,
      created_at,
      nextbid_users (
        id,
        email,
        name
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform response
  const nextbidUser = (data as any).nextbid_users;
  return NextResponse.json({
    id: data.id,
    nextbid_user_id: data.nextbid_user_id,
    name: nextbidUser?.name || name,
    email: nextbidUser?.email || email,
    role: data.role,
    permissions: data.permissions,
    status: data.status,
    created_at: data.created_at,
  });
}
