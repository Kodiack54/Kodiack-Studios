-- ============================================
-- Add All Roles and Michael as Team Member
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. First, update the check constraint to allow level 6
ALTER TABLE dev_roles DROP CONSTRAINT IF EXISTS dev_roles_level_check;
ALTER TABLE dev_roles ADD CONSTRAINT dev_roles_level_check CHECK (level BETWEEN 1 AND 6);

-- 2. Add all 6 roles with correct levels
INSERT INTO dev_roles (id, name, description, permissions, level) VALUES
    (gen_random_uuid(), 'Superadmin', 'Full system access with all projects', ARRAY['*'], 6),
    (gen_random_uuid(), 'Admin', 'Full access to assigned projects', ARRAY['*'], 5),
    (gen_random_uuid(), 'Lead', 'Deploy and manage users for assigned projects', ARRAY['deploy', 'manage_users', 'credentials', 'killswitch'], 4),
    (gen_random_uuid(), 'Engineer', 'Push to test, needs approval for prod', ARRAY['deploy_test', 'credentials', 'killswitch'], 3),
    (gen_random_uuid(), 'Developer', 'Reboot and credentials only', ARRAY['reboot', 'credentials', 'helpdesk'], 2),
    (gen_random_uuid(), 'Support', 'Helpdesk access only', ARRAY['helpdesk'], 1)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    level = EXCLUDED.level;

-- 3. Add Michael as team member with Superadmin role and all projects
INSERT INTO dev_team_members (
    id,
    name,
    email,
    role_id,
    status,
    permissions,
    projects
)
SELECT
    gen_random_uuid(),
    'Michael',
    -- Replace with your actual email used for Supabase auth
    'michael@nextbid.com',
    r.id,
    'active',
    ARRAY['*'],
    ARRAY['tradelines', 'sources', 'nextbidder', 'portals', 'nexttech', 'nexttask']
FROM dev_roles r
WHERE r.name = 'Superadmin'
ON CONFLICT (email) DO UPDATE SET
    name = 'Michael',
    role_id = (SELECT id FROM dev_roles WHERE name = 'Superadmin'),
    status = 'active',
    permissions = ARRAY['*'],
    projects = ARRAY['tradelines', 'sources', 'nextbidder', 'portals', 'nexttech', 'nexttask'],
    updated_at = NOW();

-- 4. Verify the setup
SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.status,
    tm.projects,
    r.name AS role_name,
    r.level AS role_level
FROM dev_team_members tm
JOIN dev_roles r ON tm.role_id = r.id
WHERE tm.email = 'michael@nextbid.com';

-- ============================================
-- ROLE REFERENCE
-- ============================================
-- Level 6: Superadmin - All projects + all permissions + rotate secrets
-- Level 5: Admin     - Assigned projects + all permissions
-- Level 4: Lead      - Assigned projects + deploy + manage users
-- Level 3: Engineer  - Assigned projects + push to test (needs approval for prod)
-- Level 2: Developer - Assigned projects + reboot + credentials
-- Level 1: Support   - Assigned projects + helpdesk only (no servers)
-- ============================================

-- ============================================
-- Quick reference: To change your role for testing, run:
-- ============================================
-- UPDATE dev_team_members
-- SET role_id = (SELECT id FROM dev_roles WHERE name = 'Developer')
-- WHERE email = 'michael@nextbid.com';
-- ============================================

-- ============================================
-- To update project assignments, run:
-- ============================================
-- UPDATE dev_team_members
-- SET projects = ARRAY['tradelines', 'sources']  -- Only Engine and Sources
-- WHERE email = 'michael@nextbid.com';
-- ============================================

-- ============================================
-- View all roles:
-- ============================================
-- SELECT name, level, permissions FROM dev_roles ORDER BY level DESC;
-- ============================================
