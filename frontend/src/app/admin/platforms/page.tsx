"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Platform } from "@/types";
import toast from "react-hot-toast";

export default function AdminPlatformsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Platform[]>({
    queryKey: ["admin-platforms"],
    queryFn: async () => (await api.getAdminPlatforms()).data,
  });

  const toggleMutation = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) =>
      api.setAdminPlatformActive(payload.id, payload.isActive),
    onSuccess: () => {
      toast.success("Platform status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-platforms"] });
    },
    onError: () => toast.error("Failed to update platform"),
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-500">Loading platforms...</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-100">
        <h2 className="font-bold text-surface-900">Quick Commerce Platforms</h2>
      </div>
      <div className="divide-y divide-surface-100">
        {(data ?? []).map((p) => (
          <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-surface-900">{p.name}</p>
              <p className="text-xs text-surface-500">{p.slug} • Avg delivery {p.avg_delivery_minutes} min</p>
            </div>
            <button
              onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.is_active })}
              className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                p.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {p.is_active ? "Active" : "Disabled"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
