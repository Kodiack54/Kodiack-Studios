'use client';

import { useState, useEffect } from 'react';
import GitRepoDetail from '@/components/git/GitRepoDetail';

interface GitDetailsModalProps {
  repoName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GitDetailsModal({ repoName, isOpen, onClose }: GitDetailsModalProps) {
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isOpen || !repoName) {
      setResolvedSlug(null);
      setNotFound(false);
      return;
    }

    const resolveRepo = async () => {
      setResolving(true);
      setNotFound(false);
      
      try {
        // Use resolver to find correct repo_slug from pm2_name or direct match
        const res = await fetch(`/git-database/api/resolve?id=${encodeURIComponent(repoName)}`);
        const data = await res.json();
        
        if (data.success && data.repo_slug) {
          setResolvedSlug(data.repo_slug);
        } else {
          // Fallback to original name if not found in config
          // This allows it to still work for repos not yet configured
          setResolvedSlug(repoName);
          setNotFound(true);
        }
      } catch (e) {
        console.error('Failed to resolve repo:', e);
        setResolvedSlug(repoName);
      } finally {
        setResolving(false);
      }
    };

    resolveRepo();
  }, [isOpen, repoName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col m-4">
        <div className="p-4 overflow-y-auto flex-1">
          {resolving ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-400">Resolving repository...</div>
            </div>
          ) : notFound ? (
            <div className="p-6">
              <div className="text-orange-400 mb-4">
                No repo linked for: <span className="font-mono text-white">{repoName}</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                This service needs to be linked to a git repository in the configuration.
              </p>
              <a 
                href="/git-database" 
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                onClick={onClose}
              >
                Go to Git Database to configure
              </a>
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="text-gray-500 text-xs mb-2">Attempting fallback lookup...</div>
                <GitRepoDetail 
                  repoName={resolvedSlug || repoName} 
                  isModal={true} 
                  onClose={onClose} 
                />
              </div>
            </div>
          ) : (
            <GitRepoDetail 
              repoName={resolvedSlug || repoName} 
              isModal={true} 
              onClose={onClose} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
