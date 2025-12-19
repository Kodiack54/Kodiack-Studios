'use client';

import { useState } from 'react';

interface Comment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

interface TicketCommentsProps {
  ticketId: string;
  comments: Comment[];
}

export default function TicketComments({ ticketId, comments }: TicketCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/helpdesk/system-tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      const result = await res.json();

      if (result.success) {
        setNewComment('');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to add comment');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>

      {/* Comments List */}
      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
                {comment.author.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{comment.author}</div>
                <div className="text-xs text-gray-500">{formatDate(comment.created_at)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap ml-10">
              {comment.content}
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No comments yet
          </div>
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none mb-3"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
