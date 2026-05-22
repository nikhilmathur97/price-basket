"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Users, Store, Box, Activity } from "lucide-react";

export default function AdminOverviewPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.getAdminStats()).data,
  });

  const { data: daily } = useQuery({
    queryKey: ["admin-daily-1"],
    queryFn: async () => (await api.getAdminDailyLogins(1)).data,
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-payments-summary"],
    queryFn: async () => (await api.getAdminPayments()).data,
  });

  const cards = [
    {
      label: "Total Signups",
      value: stats?.total_users ?? 0,
      icon: Users,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Products",
      value: stats?.total_products ?? 0,
      icon: Box,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Active Platforms",
      value: stats?.active_platforms ?? 0,
      icon: Store,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Logins (24h)",
      value: daily?.last_24h ?? 0,
      icon: Activity,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-surface-500">{card.label}</p>
                  <p className="text-3xl font-black text-surface-900 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">
            Payment Snapshot
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">Users with cart value</span>
              <span className="font-semibold text-surface-900">
                {payments?.summary?.total_users_with_cart_value ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Items (all carts)</span>
              <span className="font-semibold text-surface-900">{payments?.summary?.total_items ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Total amount</span>
              <span className="font-black text-lg text-brand-700">
                ₹{Math.round(payments?.summary?.total_amount ?? 0)}
              </span>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3">{payments?.summary?.note}</p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">
            Admin Notes
          </p>
          <ul className="text-sm text-surface-600 space-y-2 list-disc pl-5">
            <li>User passwords are never shown in plain text.</li>
            <li>User list includes password status and hash preview for audit only.</li>
            <li>Queries/Payments modules are API-backed and ready for extension.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
