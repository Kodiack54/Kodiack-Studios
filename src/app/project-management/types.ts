/**
 * Project Management Types
 * All types for the project management feature
 */

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'archived';
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  droplet_name?: string;
  droplet_ip?: string;
  server_path?: string;
  local_path?: string;
  database_schema?: string;
  port_dev?: number;
  port_test?: number;
  port_prod?: number;
  git_repo?: string;
  table_prefix?: string;
  logo_url?: string;
  build_number?: string;
  is_active: boolean;
  is_parent?: boolean;
  is_main?: boolean;
  parent_id?: string;
  sort_order?: number;
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  project_path: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Doc {
  id: string;
  project_path: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Schema {
  id: string;
  database_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  description?: string;
  status: ProjectStatus;
}

export interface CodeChange {
  id: string;
  project_path: string;
  commit_hash: string;
  commit_message: string;
  author: string;
  files_changed: string[];
  build_number?: string;
  created_at: string;
}

export interface Note {
  id: string;
  project_path: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Bug {
  id: string;
  project_path: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'fixed' | 'wont_fix' | 'duplicate';
  reported_by?: string;
  assigned_to?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  environment?: string;
  screenshot_url?: string;
  related_file?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ProjectStats {
  todos: number;
  bugs: number;
  knowledge: number;
  docs: number;
  conventions: number;
}

export interface Phase {
  id: string;
  project_id: string;
  phase_num: number;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface PhaseItem {
  id: string;
  phase_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  sort_order: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type TabType = 'phases' | 'todos' | 'knowledge' | 'docs' | 'database' | 'structure' | 'conventions' | 'notepad' | 'bugs' | 'worklogs';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  parentOnly?: boolean;
}

export const TABS: TabConfig[] = [
  { id: 'phases', label: 'Phases', icon: 'Milestone', parentOnly: true },
  { id: 'worklogs', label: 'Worklogs', icon: 'ClipboardList' },
  { id: 'todos', label: 'Todos', icon: 'CheckSquare' },
  { id: 'knowledge', label: 'Knowledge', icon: 'Brain' },
  { id: 'docs', label: 'Docs', icon: 'FileText' },
  { id: 'database', label: 'Database', icon: 'Database' },
  { id: 'structure', label: 'Structure', icon: 'FolderTree' },
  { id: 'conventions', label: 'Conventions', icon: 'BookOpen' },
  { id: 'notepad', label: 'Notepad', icon: 'StickyNote' },
  { id: 'bugs', label: 'Bug Reports', icon: 'Bug' },
];
