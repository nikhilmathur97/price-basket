"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, extractApiError } from "@/services/api";
import toast from "react-hot-toast";
import { Search, ExternalLink, CheckCircle } from "lucide-react";

interface ProductHit {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  unit: string | null;
}

interface FormState {
  price: string;
  mrp: string;
  asin: string;
  image_url: string;
  affiliate_link: string;
}

const EMPTY: FormState = { price: "", mrp: "", asin: "", image_url: "", affiliate_link: "" };

export default function AdminAmazonPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [selected, setSelected] = useState<ProductHit | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product search ──────────────────────────────────────────────────────────
  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) { setHits([]); return; }
      try {
        const { data } = await api.searchAdminProducts(value);
        setHits(data);
      } catch {
        setHits([]);
      }
    }, 300);
  }

  function pickProduct(p: ProductHit) {
    setSelected(p);
    setQuery(p.name);
    setHits([]);
    setLastSaved(null);
  }

  // ── Upsert mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No product selected");
      return api.upsertAmazonPrice(selected.slug, {
        price: parseFloat(form.price),
        mrp: parseFloat(form.mrp),
        asin: form.asin.trim().toUpperCase(),
        image_url: form.image_url.trim() || undefined,
        affiliate_link: form.affiliate_link.trim(),
      });
    },
    onSuccess: ({ data }) => {
      toast.success(`Saved! ${data.discount > 0 ? data.discount + "% off" : "no discount"}`);
      setLastSaved(selected!.slug);
      setSelected(null);
      setQuery("");
      setForm(EMPTY);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const price = parseFloat(form.price);
  const mrp = parseFloat(form.mrp);
  const discount = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const addToCartUrl = form.asin.trim()
    ? `https://www.amazon.in/gp/aws/cart/add.html?AssociateTag=pricebasket-21&ASIN.1=${form.asin.trim().toUpperCase()}&Quantity.1=1`
    : null;

  const canSave =
    selected &&
    price > 0 &&
    mrp >= price &&
    form.asin.trim().length === 10 &&
    form.affiliate_link.startsWith("https://");

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="font-bold text-surface-900 mb-1">Amazon Affiliate Prices</h2>
        <p className="text-sm text-surface-500">
          Paste SiteStripe data here. Only the Amazon Now platform entry is updated — Blinkit, Zepto, etc. are untouched.
        </p>
      </div>

      {/* Step 1 — Product search */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Step 1 — Find product</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search by name or brand — e.g. Tata Salt"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {hits.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-surface-200 rounded-xl shadow-lg divide-y divide-surface-100 max-h-60 overflow-y-auto">
              {hits.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-50 transition-colors"
                  onClick={() => pickProduct(p)}
                >
                  <span className="font-medium text-sm text-surface-900">{p.name}</span>
                  {p.brand && (
                    <span className="text-xs text-surface-400 ml-2">{p.brand} · {p.unit}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{selected.name}</strong>
              {selected.unit && <span className="text-emerald-600"> · {selected.unit}</span>}
            </span>
          </div>
        )}
        {lastSaved && (
          <p className="text-xs text-surface-400">Last saved: <code>{lastSaved}</code></p>
        )}
      </div>

      {/* Step 2 — SiteStripe data */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Step 2 — Paste SiteStripe data</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">Amazon Price (₹)</label>
            <input
              className="input w-full"
              type="number"
              placeholder="e.g. 28"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-600 block mb-1">MRP (₹)</label>
            <input
              className="input w-full"
              type="number"
              placeholder="e.g. 32"
              value={form.mrp}
              onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            />
          </div>
        </div>

        {discount > 0 && (
          <p className="text-xs font-semibold text-emerald-600">{discount}% discount calculated</p>
        )}

        <div>
          <label className="text-xs font-semibold text-surface-600 block mb-1">
            ASIN <span className="font-normal text-surface-400">(from URL: amazon.in/dp/<strong>THIS</strong>)</span>
          </label>
          <input
            className="input w-full font-mono uppercase"
            placeholder="e.g. B08N5WRWNW"
            value={form.asin}
            onChange={(e) => setForm({ ...form, asin: e.target.value.trim().toUpperCase() })}
            maxLength={10}
          />
          {form.asin.length > 0 && form.asin.length !== 10 && (
            <p className="text-xs text-red-500 mt-1">ASIN must be exactly 10 characters ({form.asin.length}/10)</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-surface-600 block mb-1">
            SiteStripe Affiliate Link <span className="font-normal text-surface-400">(click "Text" in the bar → copy)</span>
          </label>
          <input
            className="input w-full"
            placeholder="https://amzn.to/3XyZ123"
            value={form.affiliate_link}
            onChange={(e) => setForm({ ...form, affiliate_link: e.target.value.trim() })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-surface-600 block mb-1">
            Image URL <span className="font-normal text-surface-400">(right-click main image → Copy image address)</span>
          </label>
          <input
            className="input w-full"
            placeholder="https://m.media-amazon.com/images/I/..."
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value.trim() })}
          />
        </div>

        {form.image_url && (
          <img
            src={form.image_url}
            alt="Preview"
            className="h-24 object-contain rounded-lg border border-surface-100"
          />
        )}
      </div>

      {/* Step 3 — Preview & Save */}
      {addToCartUrl && (
        <div className="card p-5 space-y-3">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Step 3 — Verify links before saving</p>
          <div className="text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-surface-400 w-28 shrink-0">Affiliate link:</span>
              <a href={form.affiliate_link} target="_blank" rel="noopener noreferrer"
                className="text-brand-600 hover:underline truncate flex items-center gap-1">
                {form.affiliate_link} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-surface-400 w-28 shrink-0">Add to Cart:</span>
              <a href={addToCartUrl} target="_blank" rel="noopener noreferrer"
                className="text-brand-600 hover:underline truncate flex items-center gap-1">
                Test Add to Cart <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}

      <button
        className="btn-primary w-full py-3 text-sm font-bold disabled:opacity-40"
        disabled={!canSave || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving..." : "Save Amazon Price to Database"}
      </button>

      {!selected && (
        <p className="text-xs text-center text-surface-400">Select a product above to enable saving</p>
      )}
    </div>
  );
}
