import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ProjectSummary {
  project_id: string;
  pending_todos: number;
  pending_bugs: number;
  pending_knowledge: number;
  pending_total: number;
  todos: number;
  bugs: number;
  knowledge: number;
  docs: number;
  conventions: number;
  total: number;
}

// Count items for a project AND all its children
async function countWithChildren(
  table: string, 
  projectIds: string[], 
  statusCondition: string
): Promise<number> {
  if (projectIds.length === 0) return 0;
  try {
    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE project_id IN (${placeholders}) AND ${statusCondition}`;
    const result = await db.query<{ count: string }>(sql, projectIds);
    return parseInt((result.data as { count: string }[])?.[0]?.count || "0", 10);
  } catch {
    return 0;
  }
}

async function getProjectSummary(
  projectId: string, 
  childIds: string[]
): Promise<ProjectSummary> {
  // Include this project + all children
  const allIds = [projectId, ...childIds];

  const [pendingTodos, pendingBugs, pendingKnowledge] = await Promise.all([
    countWithChildren("dev_ai_todos", allIds, "status = 'pending'"),
    countWithChildren("dev_ai_bugs", allIds, "status = 'pending'"),
    countWithChildren("dev_ai_knowledge", allIds, "status = 'pending'"),
  ]);

  const [todos, bugs, knowledge, docs, conventions] = await Promise.all([
    countWithChildren("dev_ai_todos", allIds, "status NOT IN ('flagged', 'pending')"),
    countWithChildren("dev_ai_bugs", allIds, "status NOT IN ('flagged', 'pending')"),
    countWithChildren("dev_ai_knowledge", allIds, "status NOT IN ('flagged', 'pending')"),
    countWithChildren("dev_ai_docs", allIds, "status NOT IN ('flagged', 'pending')"),
    countWithChildren("dev_ai_conventions", allIds, "1=1"), // All conventions
  ]);

  return {
    project_id: projectId,
    pending_todos: pendingTodos,
    pending_bugs: pendingBugs,
    pending_knowledge: pendingKnowledge,
    pending_total: pendingTodos + pendingBugs + pendingKnowledge,
    todos,
    bugs,
    knowledge,
    docs,
    conventions,
    total: todos + bugs + knowledge + docs + conventions,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    // Get all projects to build parent-child relationships
    const { data: allProjectsData } = await db.from("dev_projects")
      .select("id, name, slug, parent_id, is_parent")
      .eq("is_active", true);
    
    const allProjects = (allProjectsData || []) as Array<{
      id: string;
      name: string;
      slug: string;
      parent_id: string | null;
      is_parent: boolean;
    }>;

    // Build map of parent -> children
    const childrenMap: Record<string, string[]> = {};
    for (const p of allProjects) {
      if (p.parent_id) {
        if (!childrenMap[p.parent_id]) {
          childrenMap[p.parent_id] = [];
        }
        childrenMap[p.parent_id].push(p.id);
      }
    }

    if (projectId) {
      const childIds = childrenMap[projectId] || [];
      const summary = await getProjectSummary(projectId, childIds);
      return NextResponse.json({ success: true, summary });
    }

    // Return summaries for all projects
    const summaries: Record<string, ProjectSummary> = {};
    for (const project of allProjects) {
      const childIds = childrenMap[project.id] || [];
      summaries[project.id] = await getProjectSummary(project.id, childIds);
    }

    return NextResponse.json({ success: true, summaries });
  } catch (error) {
    console.error("Error in projects summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
