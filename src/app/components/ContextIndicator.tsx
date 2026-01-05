'use client';

/**
 * ContextIndicator - Shows current context in the header
 *
 * FIXED SIZE - same as old Company dropdown (w-48 = 192px)
 * Dark/minimal styling. Truncate with ellipsis if too long.
 */

import { Code2, Flame, Headphones, Map, Briefcase, Coffee } from 'lucide-react';
import { useUserContext, ContextMode, MODE_LABELS } from '@/app/contexts/UserContextProvider';

const MODE_ICONS: Record<ContextMode, React.ElementType> = {
  project: Code2,
  forge: Flame,
  support: Headphones,
  planning: Map,
  other: Briefcase,
  break: Coffee,
};

export default function ContextIndicator() {
  const { context, hasActiveContext, isLoading } = useUserContext();

  // FIXED SIZE container - matches old dropdown width
  const containerClass = "w-48 h-10 flex items-center gap-2 px-3 bg-gray-700 rounded-xl text-sm border border-gray-600";

  if (isLoading) {
    return (
      <div className={`${containerClass} text-gray-400`}>
        <div className="w-4 h-4 rounded-full bg-gray-600 animate-pulse flex-shrink-0" />
        <span>...</span>
      </div>
    );
  }

  // No context yet - show neutral indicator
  if (!hasActiveContext || !context) {
    return (
      <div className={`${containerClass} text-gray-400`}>
        <span>—</span>
      </div>
    );
  }

  const Icon = MODE_ICONS[context.mode] || Code2;

  // Display text based on mode - prefer project_name over project_slug
  const displayText = context.mode === 'project'
    ? (context.project_name || context.project_slug || 'Project')
    : MODE_LABELS[context.mode];

  return (
    <div className={`${containerClass} text-white`}>
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="font-medium truncate">{displayText}</span>
    </div>
  );
}
