// Repo name patterns to project slug mapping
export const REPO_PROJECT_MAP: Record<string, string[]> = {
  'studios': ['kodiack-dashboard', 'dev-studio', 'ai-chad', 'ai-jen', 'ai-susan', 'ai-ryan', 'ai-clair', 'ai-jason', 'ai-mike', 'ai-tiffany'],
  'nextbid-core': ['nextbid-development', 'nextbid-dashboard', 'nextbid-gateway', 'nextbid-holding', 'nextbid-patcher', 'nextbid-lowvoltage'],
  'nextbid-engine': ['nextbid-engine', 'engine-dev', 'engine-test'],
  'nextbid-portals': ['NextBid-Portal', 'portal-dev', 'portal-test'],
  'nextbidder': ['NextBidder', 'nextbidder-dev', 'nextbidder-test'],
  'nextsource': ['NextSource', 'NextBid-Sources', 'source-dev', 'source-test'],
  'nexttech': ['NextTech', 'nexttech-dev', 'nexttech-test'],
};

export function getProjectForRepo(repoName: string): string | null {
  for (const [projectSlug, patterns] of Object.entries(REPO_PROJECT_MAP)) {
    for (const pattern of patterns) {
      if (repoName.toLowerCase().includes(pattern.toLowerCase())) {
        return projectSlug;
      }
    }
  }
  return null; // No match - show in all projects
}

export function filterReposByProject(repos: any[], projectSlug: string | null): any[] {
  if (!projectSlug) return repos; // No project selected - show all
  
  return repos.filter(repo => {
    const repoProject = getProjectForRepo(repo.repo || repo.name);
    return repoProject === projectSlug || repoProject === null;
  });
}
