"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import toast from "react-hot-toast";

type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_number: string | null;
  mobile_verified: boolean;
  password_status: string;
  password_hash_preview: string | null;
  is_admin: boolean;
  is_active: boolean;
  is_verified: boolean;
  city: string | null;
  pincode: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
};

function DeleteConfirmModal({
  user,
  onConfirm,
  onCancel,
  loading,
}: {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-surface-900">Delete user permanently?</h2>
            <p className="text-sm text-surface-500 mt-1">
              This will permanently delete{" "}
              <span className="font-semibold text-surface-800">
                {user.full_name ?? user.email ?? user.mobile_number ?? "this user"}
              </span>{" "}
              and all their data — cart, wishlist, alerts, and sessions. This cannot be undone.
            </p>
          </div>
          <button onClick={onCancel} className="text-surface-400 hover:text-surface-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery<{ total: number; items: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.getAdminUsers({ limit: 500, offset: 0 })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.deleteAdminUser(userId),
    onSuccess: () => {
      toast.success("User deleted permanently");
      setConfirmUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete user");
      setConfirmUser(null);
    },
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-500">Loading users...</div>;
  }

  return (
    <>
      {confirmUser && (
        <DeleteConfirmModal
          user={confirmUser}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmUser.id)}
          onCancel={() => setConfirmUser(null)}
        />
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-100 flex items-center justify-between">
          <h2 className="font-bold text-surface-900">User Signup List</h2>
          <span className="text-sm text-surface-500">Total: {data?.total ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-50 text-surface-600">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Mobile</th>
                <th className="text-left px-4 py-3">Password</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Last Login</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-t border-surface-100 hover:bg-surface-50/50">
                  <td className="px-4 py-3 font-medium text-surface-900">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-surface-500">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.mobile_number ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-surface-900">+91 {u.mobile_number}</span>
                        {u.mobile_verified && (
                          <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">✓</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-surface-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <p className="font-semibold text-surface-700">{u.password_status}</p>
                      <p className="text-surface-400">{u.password_hash_preview ?? "No local password"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {u.is_admin && <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs">Admin</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.is_verified ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {u.is_verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmUser(u)}
                      title="Delete user permanently"
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
