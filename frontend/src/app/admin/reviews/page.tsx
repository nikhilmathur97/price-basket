"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareWarning, Send, Star, AlertTriangle } from "lucide-react";
import { apiClient } from "@/services/api";

interface ReviewItem {
  id: string;
  source: "google" | "playstore" | "onsite";
  author_name: string | null;
  rating: number | null;
  review_text: string;
  review_date: string | null;
  sentiment: string | null;
  status: string;
  ai_reply_draft: string | null;
  posted_reply: string | null;
}

const STATUS_FILTERS = ["all", "new", "draft_ready", "escalated", "posted"] as const;

function useReviews(statusFilter: string) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await apiClient.get(`/reviews`, { params });
      setReviews(res.data.items ?? []);
    } catch {
      setError("Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, error, refetch: fetchReviews };
}

function ReviewCard({ review, onPosted }: { review: ReviewItem; onPosted: () => void }) {
  const [draft, setDraft] = useState(review.ai_reply_draft ?? "");
  const [posting, setPosting] = useState(false);

  const approveAndPost = async () => {
    setPosting(true);
    try {
      await apiClient.post(`/reviews/${review.id}/approve-and-post`, { reply_text: draft });
      onPosted();
    } catch {
      // stays editable on failure
    } finally {
      setPosting(false);
    }
  };

  const escalated = review.status === "escalated";

  return (
    <div className={`card p-4 space-y-3 ${escalated ? "border border-red-200 bg-red-50/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-surface-900">{review.author_name ?? "Anonymous"}</span>
            <span className="text-xs text-surface-400 uppercase">{review.source}</span>
            {escalated && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Escalated
              </span>
            )}
          </div>
          {review.rating !== null && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-surface-200"}`} />
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-surface-400">{review.review_date?.slice(0, 10)}</span>
      </div>

      <p className="text-sm text-surface-700">{review.review_text}</p>

      {review.status === "posted" ? (
        <div className="pt-2 border-t border-surface-100">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-wide mb-1">Posted Reply</p>
          <p className="text-sm text-surface-600">{review.posted_reply}</p>
        </div>
      ) : (
        <div className="pt-2 border-t border-surface-100 space-y-2">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-wide">AI Draft Reply (editable)</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full text-sm rounded-lg border border-surface-200 p-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={approveAndPost}
            disabled={posting || !draft.trim()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {posting ? "Posting…" : "Approve & Post"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const { reviews, loading, error, refetch } = useReviews(statusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-brand-600" />
          Review Management AI
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Google, Play Store &amp; on-site feedback — AI drafts a reply, you approve before it posts live.
        </p>
      </div>

      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
              statusFilter === s ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((k) => (
            <div key={k} className="card p-4 space-y-2">
              <div className="h-4 w-1/4 bg-surface-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card p-6 text-center text-sm text-surface-500">No reviews in this filter yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onPosted={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
