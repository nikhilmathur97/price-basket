"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export default function AdminQueriesPage() {
  const { data, isLoading } = useQuery<{ total: number; items: any[]; note?: string }>({
    queryKey: ["admin-queries"],
    queryFn: async () => (await api.getAdminQueries()).data,
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-500">Loading queries...</div>;
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-surface-900 mb-1">Customer Queries</h2>
      <p className="text-sm text-surface-500 mb-4">
        Total queries: <span className="font-semibold">{data?.total ?? 0}</span>
      </p>

      {(data?.items?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-200 p-6 text-center">
          <p className="text-surface-600">No support queries captured yet.</p>
          {data?.note && <p className="text-xs text-surface-400 mt-2">{data.note}</p>}
        </div>
      ) : (
        <pre className="text-xs bg-surface-50 p-3 rounded-lg overflow-auto">{JSON.stringify(data?.items, null, 2)}</pre>
      )}
    </div>
  );
}
