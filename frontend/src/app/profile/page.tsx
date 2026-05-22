"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { Camera, Mail, Phone, MapPin, ShieldCheck, Calendar, Save } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user: authUser, setUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, router]);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.me()).data,
    enabled: isAuthenticated,
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    pincode: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name ?? "",
      phone: user.phone ?? "",
      city: user.city ?? "",
      pincode: user.pincode ?? "",
    });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => (await api.updateMe(form)).data,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated successfully");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const avatarSrc = useMemo(() => {
    if (user?.avatar_url) return user.avatar_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? user?.email ?? "User")}&background=ea580c&color=fff`;
  }, [user]);

  if (!isAuthenticated || !authUser) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-surface-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-surface-200 bg-surface-50">
            <Image src={avatarSrc} alt="Avatar" fill className="object-cover" />
            <div className="absolute right-1 bottom-1 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center">
              <Camera className="w-4 h-4 text-surface-500" />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-surface-900">{user?.full_name ?? "My Profile"}</h1>
            <p className="text-surface-500">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Account Email
              </span>
              {user?.is_admin && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-violet-100 text-violet-700 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Access
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {new Date(user?.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-bold text-surface-900 mb-4">Personal Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-surface-600 mb-1">Full Name</span>
              <input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-surface-200 rounded-xl px-3 py-2"
                placeholder="Your name"
              />
            </label>

            <label className="text-sm">
              <span className="block text-surface-600 mb-1">Mobile Number</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-surface-200 rounded-xl px-3 py-2"
                placeholder="e.g. +91 98xxxxxxx"
              />
            </label>

            <label className="text-sm">
              <span className="block text-surface-600 mb-1">City</span>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full border border-surface-200 rounded-xl px-3 py-2"
                placeholder="City"
              />
            </label>

            <label className="text-sm">
              <span className="block text-surface-600 mb-1">Pincode</span>
              <input
                value={form.pincode}
                onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
                className="w-full border border-surface-200 rounded-xl px-3 py-2"
                placeholder="Pincode"
              />
            </label>
          </div>

          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="mt-5 btn-primary inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-surface-900">Account Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-surface-700">
              <Mail className="w-4 h-4 text-surface-400" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-surface-700">
              <Phone className="w-4 h-4 text-surface-400" />
              <span>{user?.phone ?? "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 text-surface-700">
              <MapPin className="w-4 h-4 text-surface-400" />
              <span>{[user?.city, user?.pincode].filter(Boolean).join(" • ") || "Location not set"}</span>
            </div>
            <div className="pt-3 border-t border-surface-100 text-xs text-surface-500">
              User ID: {user?.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
