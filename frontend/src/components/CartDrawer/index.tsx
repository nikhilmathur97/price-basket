"use client";

import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { trackEvent } from "@/services/api";

export function CartDrawer() {
  const { cart, isOpen, isLoading, closeCart, updateItem, removeItem, clearCart, totalItems, fetchCart } =
    useCartStore();
  const { isAuthenticated } = useAuthStore();

  // When the drawer opens and the user is authenticated but cart hasn't been
  // loaded yet (e.g. stale totalItems badge from localStorage but cart=null),
  // fetch the cart from the server so the drawer never shows blank.
  useEffect(() => {
    if (isOpen && isAuthenticated && !cart && !isLoading) {
      fetchCart().catch(() => {});
    }
  }, [isOpen, isAuthenticated, cart, isLoading, fetchCart]);

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + (item.snapshot_price ?? 0) * item.quantity,
      0
    ) ?? 0;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeCart}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-300"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="w-screen max-w-sm bg-white flex flex-col h-full shadow-modal">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-brand-600" />
                  <Dialog.Title className="text-base font-bold text-surface-900">
                    My Cart
                  </Dialog.Title>
                  {totalItems > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {totalItems}
                    </span>
                  )}
                </div>
                <button onClick={closeCart} className="btn-ghost p-1.5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto py-4 px-5">
                {/* Loading skeleton — shown while fetching cart from server */}
                {isLoading && !cart?.items.length ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-16 h-16 bg-surface-100 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-surface-100 rounded w-3/4" />
                          <div className="h-3 bg-surface-100 rounded w-1/2" />
                          <div className="h-3 bg-surface-100 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !cart?.items.length ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                    <div className="text-6xl">🛒</div>
                    <p className="font-semibold text-surface-700">Your cart is empty</p>
                    <p className="text-sm text-surface-400">
                      Search for groceries and add them to compare prices across platforms!
                    </p>
                    <Link
                      href="/search"
                      onClick={closeCart}
                      className="btn-primary text-sm w-full text-center"
                    >
                      Search Products
                    </Link>
                    <Link
                      href="/"
                      onClick={closeCart}
                      className="btn-secondary text-sm w-full text-center"
                    >
                      Browse Home
                    </Link>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {cart.items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-3 mb-4"
                      >
                        {/* Product image */}
                        <div className="w-16 h-16 bg-surface-50 rounded-xl overflow-hidden flex-shrink-0 border">
                          {item.product.thumbnail_url ? (
                            <Image
                              src={item.product.thumbnail_url}
                              alt={item.product.name}
                              width={64}
                              height={64}
                              className="object-contain w-full h-full p-1"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🛍️
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-900 line-clamp-2 leading-snug">
                            {item.product.name}
                          </p>
                          {item.product.unit && (
                            <p className="text-xs text-surface-400">{item.product.unit}</p>
                          )}
                          {item.selected_platform && (
                            <p className="text-xs text-surface-500 mt-0.5">
                              via {item.selected_platform.name}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            {/* Price */}
                            <span className="text-sm font-bold text-surface-900">
                              {item.snapshot_price != null
                                ? `₹${(item.snapshot_price * item.quantity).toFixed(0)}`
                                : "—"}
                            </span>

                            {/* Qty controls */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  updateItem(item.id, item.quantity - 1).catch(() =>
                                    toast.error("Couldn't update quantity")
                                  );
                                  if (item.quantity <= 1) {
                                    trackEvent({ event_type: "cart_remove", product_id: item.product.id, referrer_page: "cart" });
                                  }
                                }}
                                className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200
                                           flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateItem(item.id, item.quantity + 1).catch(() =>
                                    toast.error("Couldn't update quantity")
                                  )
                                }
                                className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-700
                                           text-white flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => {
                            removeItem(item.id).catch(() => toast.error("Couldn't remove item"));
                            trackEvent({ event_type: "cart_remove", product_id: item.product.id, referrer_page: "cart" });
                          }}
                          className="text-surface-300 hover:text-red-500 transition-colors self-start mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {cart?.items.length ? (
                <div className="border-t border-surface-100 p-5 space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Subtotal (estimate)</span>
                    <span className="font-bold text-surface-900">₹{subtotal.toFixed(0)}</span>
                  </div>

                  {/* Optimize CTA */}
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    View Cart & Optimize
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={async () => {
                      await clearCart();
                      toast.success("Cart cleared");
                    }}
                    className="btn-ghost w-full text-sm text-red-500 hover:bg-red-50"
                  >
                    Clear Cart
                  </button>
                </div>
              ) : null}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
