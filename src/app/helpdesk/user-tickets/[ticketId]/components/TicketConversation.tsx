'use client';

import { useState } from 'react';

interface HistoryEntry {
  id: string;
  type: 'message' | 'internal_note' | 'status_change';
  author: string;
  author_type: 'user' | 'agent';
  content: string;
  is_internal?: boolean;
  created_at: string;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
}

interface TicketConversationProps {
  ticketId: string;
  history: HistoryEntry[];
  cannedResponses: CannedResponse[];
}

export default function TicketConversation({
  ticketId,
  history,
  cannedResponses,
}: TicketConversationProps) {
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCanned, setShowCanned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/helpdesk/user-tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          is_internal: isInternal,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setReplyText('');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to send reply');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const insertCannedResponse = (content: string) => {
    setReplyText((prev) => prev + content);
    setShowCanned(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Conversation</h3>

      {/* Messages */}
      <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
        {history.map((entry) => {
          if (entry.type === 'status_change') {
            return (
              <div key={entry.id} className="text-center text-xs text-gray-500 py-2">
                {entry.content} · {formatDate(entry.created_at)}
              </div>
            );
          }

          const isAgent = entry.author_type === 'agent';

          return (
            <div
              key={entry.id}
              className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  entry.is_internal
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : isAgent
                    ? 'bg-purple-500/20'
                    : 'bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isAgent
                        ? 'bg-purple-500/30 text-purple-400'
                        : 'bg-blue-500/30 text-blue-400'
                    }`}
                  >
                    {entry.author.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-400">{entry.author}</span>
                  {entry.is_internal && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Internal Note
                    </span>
                  )}
                  <span className="text-xs text-gray-600 ml-auto">
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {entry.content}
                </div>
              </div>
            </div>
          );
        })}

        {history.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No conversation yet
          </div>
        )}
      </div>

      {/* Reply Form */}
      <form onSubmit={handleSubmit}>
        {/* Canned Responses */}
        {cannedResponses.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowCanned(!showCanned)}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              {showCanned ? 'Hide' : 'Show'} Canned Responses
            </button>

            {showCanned && (
              <div className="mt-2 p-3 bg-gray-900 rounded-lg max-h-[150px] overflow-y-auto">
                <div className="space-y-2">
                  {cannedResponses.map((cr) => (
                    <button
                      key={cr.id}
                      type="button"
                      onClick={() => insertCannedResponse(cr.content)}
                      className="w-full text-left p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-sm text-white">{cr.title}</div>
                      <div className="text-xs text-gray-500 truncate">{cr.content}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={isInternal ? 'Add an internal note...' : 'Type your reply to the customer...'}
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none mb-3"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Internal note (not visible to customer)
          </label>

          <button
            type="submit"
            disabled={submitting || !replyText.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              isInternal
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-black'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {submitting ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
