"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import toast from "react-hot-toast";

type Query = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-red-100 text-red-700",
  read: "bg-amber-100 text-amber-700",
  replied: "bg-emerald-100 text-emerald-700",
};

export default function AdminQueriesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ total: number; items: Query[] }>({
    queryKey: ["admin-queries", filter],
    queryFn: async () =>
      (await api.getAdminQueries({ status: filter === "all" ? undefined : filter })).data,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateQueryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queries"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-500">Loading queries...</div>;
  }

  const items = data?.items ?? [];
  const newCount = items.filter((q) => q.status === "new").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-surface-900">Customer Queries</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            {data?.total ?? 0} total
            {newCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                {newCount} new
              </span>
            )}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {["all", "new", "read", "replied"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === s
                  ? "bg-brand-600 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-surface-400 text-sm">No queries found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="card overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-surface-900 text-sm">{q.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[q.status]}`}>
                      {q.status}
                    </span>
                    <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                      {q.subject}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {q.email && <span className="mr-3">{q.email}</span>}
                    {q.mobile && <span className="mr-3">+91 {q.mobile}</span>}
                    <span className="text-surface-400">{new Date(q.created_at).toLocaleString()}</span>
                  </p>
                  <p className="text-sm text-surface-600 mt-1 line-clamp-1">{q.message}</p>
                </div>
                <span className="text-surface-400 text-xs mt-1">{expanded === q.id ? "▲" : "▼"}</span>
              </button>

              {/* Expanded detail */}
              {expanded === q.id && (
                <div className="border-t border-surface-100 px-4 py-4 bg-surface-50/30">
                  <p className="text-sm text-surface-800 whitespace-pre-wrap leading-relaxed mb-4">
                    {q.message}
                  </p>

                  {/* Reply shortcuts */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-surface-500 font-medium">Mark as:</span>
                    {(["new", "read", "replied"] as const).map((s) => (
                      <button
                        key={s}
                        disabled={q.status === s || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: q.id, status: s })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors disabled:opacity-50 ${STATUS_STYLES[s]}`}
                      >
                        {s}
                      </button>
                    ))}

                    {q.email && (
                      <a
                        href={`mailto:${q.email}?subject=Re: ${encodeURIComponent(q.subject)}`}
                        className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                      >
                        Reply via Email
                      </a>
                    )}
                    {q.mobile && (
                      <a
                        href={`https://wa.me/91${q.mobile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Reply on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
