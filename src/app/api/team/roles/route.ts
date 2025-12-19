import { NextResponse } from 'next/server';
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS, ALL_ROLES, UserRole } from '@/lib/roles';

export async function GET() {
  // Return the hardcoded roles from ROLE_PERMISSIONS
  const roles = ALL_ROLES.map((roleName) => {
    const perms = ROLE_PERMISSIONS[roleName];
    return {
      id: roleName,
      name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
      level: perms.level,
      description: ROLE_DESCRIPTIONS[roleName],
      permissions: Object.entries(perms)
        .filter(([key, value]) => key !== 'level' && value === true)
        .map(([key]) => key),
    };
  });

  // Sort by level descending (highest first)
  roles.sort((a, b) => b.level - a.level);

  return NextResponse.json(roles);
}

export async function POST() {
  // Roles are hardcoded in UserContext.tsx
  // Custom role creation is not supported
  return NextResponse.json(
    { error: 'Custom role creation is not supported. Roles are defined in the system configuration.' },
    { status: 400 }
  );
}
