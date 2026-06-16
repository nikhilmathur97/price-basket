"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Trash2, TrendingDown, Package, ChevronRight, Search } from "lucide-react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { PriceAlert } from "@/types";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 border border-amber-100">
        <BellOff className="w-9 h-9 text-amber-400" />
      </div>
      <h2 className="text-xl font-bold text-surface-900 mb-2">No price alerts yet</h2>
      <p className="text-sm text-surface-400 max-w-xs mb-6">
        Set a target price on any product and we'll notify you when it drops below it.
      </p>
      <Link href="/search" className="btn-primary inline-flex items-center gap-2">
        <Search className="w-4 h-4" />
        Browse Products
      </Link>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="card p-4 flex gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-xl bg-surface-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-100 rounded w-2/3" />
        <div className="h-3 bg-surface-100 rounded w-1/3" />
        <div className="h-3 bg-surface-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: PriceAlert;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function AlertCard({ alert, onDelete, isDeleting }: AlertCardProps) {
  const { product, target_price, is_active, triggered_at, created_at } = alert;

  const imageSrc = product.thumbnail_url ?? product.image_url ?? null;

  const isTriggered = !!triggered_at;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`card p-4 flex gap-4 items-start transition-opacity ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Product thumbnail */}
      <Link href={`/product/${product.id}`} className="flex-shrink-0">
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-surface-100 bg-surface-50 relative flex items-center justify-center">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-contain p-1"
              sizes="64px"
              unoptimized
            />
          ) : (
            <span className="text-2xl select-none">🛒</span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${product.id}`}
              className="font-semibold text-surface-900 hover:text-brand-600 transition-colors line-clamp-1 text-sm"
            >
              {product.name}
            </Link>
            <p className="text-xs text-surface-400 mt-0.5">
              {[product.brand, product.unit].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Status badge */}
          {isTriggered ? (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
              <TrendingDown className="w-3 h-3" />
              Triggered!
            </span>
          ) : (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
              <Bell className="w-3 h-3" />
              Watching
            </span>
          )}
        </div>

        {/* Prices row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <div>
            <span className="text-surface-400 text-xs">Your target</span>
            <p className="font-bold text-brand-600">{formatPrice(target_price)}</p>
          </div>

          {isTriggered && triggered_at && (
            <div>
              <span className="text-surface-400 text-xs">Triggered on</span>
              <p className="font-medium text-green-700">{formatDate(triggered_at)}</p>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-surface-300">Set on {formatDate(created_at)}</span>

          <div className="flex items-center gap-2">
            <Link
              href={`/product/${product.id}`}
              className="text-xs text-brand-600 hover:underline font-medium inline-flex items-center gap-0.5"
            >
              View product
              <ChevronRight className="w-3 h-3" />
            </Link>

            <button
              onClick={() => onDelete(alert.id)}
              aria-label="Delete alert"
              className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, hasHydrated, isValidatingSession } = useAuthStore();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Redirect if not logged in — wait for session validation to finish first
  useEffect(() => {
    if (hasHydrated && !isValidatingSession && !isAuthenticated) {
      router.replace("/auth/login?next=/alerts");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  const { data: alerts, isLoading, isError } = useQuery<PriceAlert[]>({
    queryKey: ["alerts"],
    queryFn: async () => (await api.getAlerts()).data,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAlert(id),
    onMutate: (id) => {
      setDeletingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<PriceAlert[]>(["alerts"], (old) =>
        old ? old.filter((a) => a.id !== id) : []
      );
      toast.success("Alert removed");
    },
    onError: () => toast.error("Failed to remove alert"),
    onSettled: (_data, _error, id) => {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Derived counts
  const activeAlerts = alerts?.filter((a) => !a.triggered_at) ?? [];
  const triggeredAlerts = alerts?.filter((a) => !!a.triggered_at) ?? [];

  // Wait for hydration + session validation before deciding to redirect.
  if (!hasHydrated || isValidatingSession) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" />
            Price Alerts
          </h1>
          {alerts && alerts.length > 0 && (
            <p className="text-sm text-surface-400 mt-1">
              {activeAlerts.length} active · {triggeredAlerts.length} triggered
            </p>
          )}
        </div>

        <Link href="/search" className="btn-secondary text-sm inline-flex items-center gap-2">
          <Package className="w-4 h-4" />
          Browse Products
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AlertSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <p className="text-surface-500 mb-3">Failed to load alerts</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["alerts"] })}
            className="btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <EmptyAlerts />
      ) : (
        <div className="space-y-6">
          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">
                Watching ({activeAlerts.length})
              </h2>
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deletingIds.has(alert.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">
                Triggered ({triggeredAlerts.length})
              </h2>
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {triggeredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deletingIds.has(alert.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          )}
        </div>
      )}

      {/* How it works callout */}
      {(!alerts || alerts.length === 0) ? null : (
        <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-800 flex gap-3">
          <Bell className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">How alerts work</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              We check prices across all platforms every 10 minutes. When any platform drops below
              your target price, we'll send an email to your registered address.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
