import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ROLE_PERMISSIONS, ALL_ROLES, UserRole } from '@/lib/roles';

// GET single member
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
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
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const nextbidUser = (data as any).nextbid_users;
  const profile = nextbidUser?.nextbid_profiles?.[0] || {};
  const roleName = (data.role || 'developer') as UserRole;
  const roleLevel = ROLE_PERMISSIONS[roleName]?.level || 0;

  return NextResponse.json({
    id: data.id,
    nextbid_user_id: data.nextbid_user_id,
    name: nextbidUser?.name || 'Unknown',
    email: nextbidUser?.email || '',
    status: data.status || 'active',
    permissions: data.permissions || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_active: data.last_active,
    role: roleName,
    role_level: roleLevel,
    // Profile fields from nextbid_profiles (shared across all products)
    phone: profile.phone || '',
    title: profile.title || '',
    department: profile.department || '',
    avatar_url: profile.avatar_url || '',
  });
}

// PUT update member
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { role, status, permissions, phone, title, department, avatar_url } = body;

  // First get the dev_user to find nextbid_user_id
  const { data: devUser, error: fetchError } = await supabase
    .from('dev_users')
    .select('nextbid_user_id')
    .eq('id', id)
    .single();

  if (fetchError || !devUser) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Build update object for dev_users (role, status, permissions only)
  const devUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Validate and set role if provided
  if (role !== undefined) {
    if (!ALL_ROLES.includes(role.toLowerCase() as UserRole)) {
      return NextResponse.json({
        error: `Invalid role '${role}'. Valid roles: ${ALL_ROLES.join(', ')}`
      }, { status: 400 });
    }
    devUpdates.role = role.toLowerCase();
  }

  // Set status if provided
  if (status !== undefined) {
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: `Invalid status '${status}'. Valid: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }
    devUpdates.status = status;
  }

  // Set permissions if provided
  if (permissions !== undefined) {
    devUpdates.permissions = permissions;
  }

  // Update dev_users
  const { data, error } = await supabase
    .from('dev_users')
    .update(devUpdates)
    .eq('id', id)
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
        name
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update profile in nextbid_profiles if any profile fields provided
  const hasProfileUpdates = phone !== undefined || title !== undefined ||
                            department !== undefined || avatar_url !== undefined;

  if (hasProfileUpdates) {
    const profileUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (phone !== undefined) profileUpdates.phone = phone;
    if (title !== undefined) profileUpdates.title = title;
    if (department !== undefined) profileUpdates.department = department;
    if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;

    // Upsert profile - create if doesn't exist, update if it does
    const { error: profileError } = await supabase
      .from('nextbid_profiles')
      .upsert({
        nextbid_user_id: devUser.nextbid_user_id,
        ...profileUpdates,
      }, {
        onConflict: 'nextbid_user_id',
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't fail the whole request, just log it
    }
  }

  const nextbidUser = (data as any).nextbid_users;
  return NextResponse.json({
    success: true,
    member: {
      id: data.id,
      nextbid_user_id: data.nextbid_user_id,
      name: nextbidUser?.name || 'Unknown',
      email: nextbidUser?.email || '',
      status: data.status,
      role: data.role,
      permissions: data.permissions,
      updated_at: data.updated_at,
      phone: phone,
      title: title,
      department: department,
      avatar_url: avatar_url,
    }
  });
}

// DELETE member (removes Dashboard access)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { error } = await supabase
    .from('dev_users')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
