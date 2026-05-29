import { ShoppingBag } from "lucide-react";

export default function OrdersLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="w-24 h-24 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
        <ShoppingBag className="w-11 h-11 text-surface-300" />
      </div>
      <div className="h-6 w-40 bg-surface-100 rounded-xl mx-auto mb-3 animate-pulse" />
      <div className="h-4 w-64 bg-surface-100 rounded-xl mx-auto animate-pulse" />
    </div>
  );
}
