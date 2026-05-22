"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

type PaymentRow = {
  user_id: string;
  full_name: string | null;
  email: string;
  items_count: number;
  amount: number;
};

export default function AdminPaymentsPage() {
  const { data, isLoading } = useQuery<{
    summary: {
      total_users_with_cart_value: number;
      total_items: number;
      total_amount: number;
      currency: string;
      note: string;
    };
    items: PaymentRow[];
  }>({
    queryKey: ["admin-payments"],
    queryFn: async () => (await api.getAdminPayments()).data,
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-500">Loading payment details...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-surface-500">Users</p>
          <p className="text-2xl font-black text-surface-900">{data?.summary.total_users_with_cart_value ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-500">Items</p>
          <p className="text-2xl font-black text-surface-900">{data?.summary.total_items ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-500">Total Value (INR)</p>
          <p className="text-2xl font-black text-brand-700">₹{Math.round(data?.summary.total_amount ?? 0)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-100">
          <h2 className="font-bold text-surface-900">Payment Details</h2>
          <p className="text-xs text-surface-400 mt-1">{data?.summary.note}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-50 text-surface-600">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-left px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <tr key={row.user_id} className="border-t border-surface-100">
                  <td className="px-4 py-3 font-medium">{row.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.items_count}</td>
                  <td className="px-4 py-3 font-semibold">₹{Math.round(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
