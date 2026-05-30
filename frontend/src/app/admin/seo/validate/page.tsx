"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// All SEO pages to validate
const PAGES_TO_CHECK = [
  { url: "/",                              label: "Homepage" },
  { url: "/search",                        label: "Search" },
  { url: "/blog",                          label: "Blog" },
  { url: "/best-grocery-deals",            label: "Best Grocery Deals" },
  { url: "/save-money-groceries",          label: "Save Money Groceries" },
  { url: "/cheapest-atta-online",          label: "Cheapest Atta" },
  { url: "/cheapest-milk-online",          label: "Cheapest Milk" },
  { url: "/cheapest-oil-online",           label: "Cheapest Oil" },
  { url: "/cheapest-rice-online",          label: "Cheapest Rice" },
  { url: "/cheapest-dal-online",           label: "Cheapest Dal" },
  { url: "/cheapest-sugar-online",         label: "Cheapest Sugar" },
  { url: "/cheapest-ghee-online",          label: "Cheapest Ghee" },
  { url: "/cheapest-eggs-online",          label: "Cheapest Eggs" },
  { url: "/grocery-prices-mumbai",         label: "Mumbai" },
  { url: "/grocery-prices-delhi",          label: "Delhi" },
  { url: "/grocery-prices-bangalore",      label: "Bangalore" },
  { url: "/grocery-prices-hyderabad",      label: "Hyderabad" },
  { url: "/grocery-prices-chennai",        label: "Chennai" },
  { url: "/grocery-prices-pune",           label: "Pune" },
  { url: "/grocery-prices-kolkata",        label: "Kolkata" },
  { url: "/grocery-prices-ahmedabad",      label: "Ahmedabad" },
  { url: "/compare/blinkit-vs-zepto",      label: "Blinkit vs Zepto" },
  { url: "/compare/zepto-vs-instamart",    label: "Zepto vs Instamart" },
  { url: "/compare/blinkit-vs-bigbasket",  label: "Blinkit vs BigBasket" },
  { url: "/compare/bigbasket-vs-jiomart",  label: "BigBasket vs JioMart" },
];

interface CheckResult {
  url: string;
  label: string;
  status: "pending" | "checking" | "pass" | "warn" | "fail";
  httpStatus?: number;
  checks: {
    name: string;
    pass: boolean;
    value?: string;
    detail?: string;
  }[];
  score: number;
  errors: string[];
  warnings: string[];
}

async function validatePage(url: string): Promise<Omit<CheckResult, "url" | "label" | "status">> {
  const base = window.location.origin;
  const fullUrl = base + url;

  const checks: CheckResult["checks"] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let html = "";
  let httpStatus = 0;

  try {
    const res = await fetch(fullUrl, { cache: "no-store" });
    httpStatus = res.status;
    html = await res.text();
  } catch {
    errors.push("Failed to fetch page");
    return { checks, score: 0, errors, warnings };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 1. HTTP status
  const statusOk = httpStatus === 200;
  checks.push({ name: "HTTP 200", pass: statusOk, value: String(httpStatus), detail: statusOk ? "Page loads correctly" : `Got ${httpStatus}` });
  if (!statusOk) errors.push(`HTTP ${httpStatus}`);

  // 2. Title tag
  const title = doc.querySelector("title")?.textContent ?? "";
  const titleOk = title.length >= 30 && title.length <= 70;
  const titleExists = title.length > 0;
  checks.push({ name: "Title tag", pass: titleOk, value: title ? `${title.length} chars` : "MISSING", detail: title || "No title found" });
  if (!titleExists) errors.push("Missing <title> tag");
  else if (title.length < 30) warnings.push(`Title too short (${title.length} chars, min 30)`);
  else if (title.length > 70) warnings.push(`Title too long (${title.length} chars, max 70)`);

  // 3. Meta description
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  const descOk = desc.length >= 120 && desc.length <= 160;
  checks.push({ name: "Meta description", pass: descOk, value: desc ? `${desc.length} chars` : "MISSING", detail: desc.slice(0, 80) || "No description found" });
  if (!desc) errors.push("Missing meta description");
  else if (desc.length < 120) warnings.push(`Description too short (${desc.length} chars, min 120)`);
  else if (desc.length > 160) warnings.push(`Description too long (${desc.length} chars, max 160)`);

  // 4. H1 tag
  const h1s = doc.querySelectorAll("h1");
  const h1Ok = h1s.length === 1;
  const h1Text = h1s[0]?.textContent ?? "";
  checks.push({ name: "H1 tag (exactly 1)", pass: h1Ok, value: `${h1s.length} found`, detail: h1Text.slice(0, 60) || "No H1 found" });
  if (h1s.length === 0) errors.push("Missing H1 tag");
  else if (h1s.length > 1) warnings.push(`Multiple H1 tags (${h1s.length}) — use only one`);

  // 5. Canonical URL
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  const canonicalOk = canonical.includes("pricebasket.in") && canonical.includes(url === "/" ? "pricebasket.in" : url);
  checks.push({ name: "Canonical URL", pass: canonicalOk, value: canonical || "MISSING", detail: canonicalOk ? "Correct canonical" : "Missing or wrong canonical" });
  if (!canonical) errors.push("Missing canonical URL");
  else if (!canonicalOk) warnings.push("Canonical URL may be incorrect");

  // 6. JSON-LD structured data
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const hasJsonLd = jsonLdScripts.length > 0;
  let jsonLdValid = false;
  let jsonLdType = "";
  if (hasJsonLd) {
    try {
      const parsed = JSON.parse(jsonLdScripts[0].textContent ?? "{}");
      jsonLdType = parsed["@type"] ?? "Unknown";
      jsonLdValid = true;
    } catch {
      jsonLdValid = false;
    }
  }
  checks.push({ name: "JSON-LD schema", pass: hasJsonLd && jsonLdValid, value: hasJsonLd ? jsonLdType : "MISSING", detail: hasJsonLd ? `${jsonLdScripts.length} schema(s) found` : "No structured data" });
  if (!hasJsonLd) warnings.push("No JSON-LD structured data — missing rich results opportunity");
  else if (!jsonLdValid) errors.push("JSON-LD parse error — invalid JSON");

  // 7. OpenGraph tags
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
  const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? "";
  const ogOk = ogTitle.length > 0 && ogDesc.length > 0;
  checks.push({ name: "OpenGraph tags", pass: ogOk, value: ogOk ? "Present" : "MISSING", detail: ogTitle.slice(0, 60) || "No OG title" });
  if (!ogTitle) warnings.push("Missing og:title");
  if (!ogDesc) warnings.push("Missing og:description");
  if (!ogUrl) warnings.push("Missing og:url");

  // 8. Image alt tags
  const images = doc.querySelectorAll("img");
  const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute("alt"));
  const imgOk = imagesWithoutAlt.length === 0;
  checks.push({ name: "Image alt tags", pass: imgOk, value: `${imagesWithoutAlt.length} missing`, detail: imgOk ? "All images have alt text" : `${imagesWithoutAlt.length} image(s) missing alt` });
  if (imagesWithoutAlt.length > 0) warnings.push(`${imagesWithoutAlt.length} image(s) missing alt text`);

  // 9. H2 tags (content structure)
  const h2s = doc.querySelectorAll("h2");
  const h2Ok = h2s.length >= 2;
  checks.push({ name: "H2 tags (≥2)", pass: h2Ok, value: `${h2s.length} found`, detail: h2Ok ? "Good content structure" : "Add more H2 headings" });
  if (h2s.length < 2) warnings.push(`Only ${h2s.length} H2 tag(s) — add more for content structure`);

  // 10. Internal links
  const links = doc.querySelectorAll("a[href]");
  const internalLinks = Array.from(links).filter(a => {
    const href = a.getAttribute("href") ?? "";
    return href.startsWith("/") && !href.startsWith("/api") && !href.startsWith("/admin");
  });
  const linksOk = internalLinks.length >= 3;
  checks.push({ name: "Internal links (≥3)", pass: linksOk, value: `${internalLinks.length} found`, detail: linksOk ? "Good internal linking" : "Add more internal links" });
  if (internalLinks.length < 3) warnings.push(`Only ${internalLinks.length} internal link(s) — add more for SEO`);

  // Calculate score
  const passCount = checks.filter(c => c.pass).length;
  const score = Math.round((passCount / checks.length) * 100);

  return { checks, score, errors, warnings, httpStatus };
}

export default function SeoValidatePage() {
  const [results, setResults] = useState<CheckResult[]>(
    PAGES_TO_CHECK.map(p => ({ ...p, status: "pending", checks: [], score: 0, errors: [], warnings: [] }))
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<CheckResult | null>(null);

  const runAll = async () => {
    setRunning(true);
    setDone(false);
    setSelected(null);

    // Reset
    setResults(PAGES_TO_CHECK.map(p => ({ ...p, status: "pending", checks: [], score: 0, errors: [], warnings: [] })));

    for (let i = 0; i < PAGES_TO_CHECK.map(p => p).length; i++) {
      const page = PAGES_TO_CHECK[i];

      // Mark as checking
      setResults(prev => prev.map(r => r.url === page.url ? { ...r, status: "checking" } : r));

      const result = await validatePage(page.url);

      setResults(prev => prev.map(r =>
        r.url === page.url
          ? {
              ...r,
              ...result,
              status: result.errors.length > 0 ? "fail" : result.warnings.length > 0 ? "warn" : "pass",
            }
          : r
      ));
    }

    setRunning(false);
    setDone(true);
  };

  const summary = {
    pass: results.filter(r => r.status === "pass").length,
    warn: results.filter(r => r.status === "warn").length,
    fail: results.filter(r => r.status === "fail").length,
    pending: results.filter(r => r.status === "pending").length,
    avgScore: done ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-surface-900">SEO Validator</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            Checks all {PAGES_TO_CHECK.length} SEO pages for title, description, H1, canonical, JSON-LD, OG tags, alt text, internal links
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/seo" className="text-sm text-brand-600 hover:underline">← SEO Dashboard</Link>
          <button
            onClick={runAll}
            disabled={running}
            className="bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm
                       hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? "⏳ Validating..." : "▶ Run Full Audit"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {done && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Avg Score", value: `${summary.avgScore}%`, color: summary.avgScore >= 80 ? "text-green-600" : summary.avgScore >= 60 ? "text-yellow-600" : "text-red-600", bg: "bg-white" },
            { label: "✅ Pass", value: summary.pass, color: "text-green-600", bg: "bg-green-50" },
            { label: "⚠️ Warnings", value: summary.warn, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "❌ Errors", value: summary.fail, color: "text-red-600", bg: "bg-red-50" },
            { label: "Total Pages", value: PAGES_TO_CHECK.length, color: "text-surface-700", bg: "bg-white" },
          ].map(c => (
            <div key={c.label} className={`${c.bg} rounded-2xl border border-surface-100 p-4 text-center`}>
              <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
              <p className="text-xs text-surface-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Results list */}
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 bg-surface-50">
            <p className="text-sm font-bold text-surface-700">Pages</p>
          </div>
          <div className="divide-y divide-surface-50 max-h-[600px] overflow-y-auto">
            {results.map(r => (
              <button
                key={r.url}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors flex items-center justify-between gap-3
                  ${selected?.url === r.url ? "bg-brand-50 border-l-2 border-brand-600" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{r.label}</p>
                  <p className="text-[11px] text-surface-400 truncate">{r.url}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.status !== "pending" && r.status !== "checking" && (
                    <span className="text-xs font-bold text-surface-500">{r.score}%</span>
                  )}
                  <span className={`text-base ${
                    r.status === "pending" ? "text-surface-300" :
                    r.status === "checking" ? "animate-spin inline-block" :
                    r.status === "pass" ? "text-green-500" :
                    r.status === "warn" ? "text-yellow-500" :
                    "text-red-500"
                  }`}>
                    {r.status === "pending" ? "○" :
                     r.status === "checking" ? "⟳" :
                     r.status === "pass" ? "✅" :
                     r.status === "warn" ? "⚠️" : "❌"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 bg-surface-50">
            <p className="text-sm font-bold text-surface-700">
              {selected ? `${selected.label} — ${selected.score}% score` : "Select a page to see details"}
            </p>
          </div>

          {!selected && (
            <div className="p-8 text-center text-surface-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">Run the audit then click any page to see detailed results</p>
            </div>
          )}

          {selected && (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Score bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-surface-600">SEO Score</span>
                  <span className={selected.score >= 80 ? "text-green-600" : selected.score >= 60 ? "text-yellow-600" : "text-red-600"}>
                    {selected.score}%
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selected.score >= 80 ? "bg-green-500" : selected.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${selected.score}%` }}
                  />
                </div>
              </div>

              {/* Errors */}
              {selected.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">❌ Errors ({selected.errors.length})</p>
                  {selected.errors.map(e => (
                    <p key={e} className="text-xs text-red-600">• {e}</p>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {selected.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-yellow-700 mb-1">⚠️ Warnings ({selected.warnings.length})</p>
                  {selected.warnings.map(w => (
                    <p key={w} className="text-xs text-yellow-600">• {w}</p>
                  ))}
                </div>
              )}

              {/* All checks */}
              <div>
                <p className="text-xs font-bold text-surface-600 mb-2">All Checks</p>
                <div className="space-y-1.5">
                  {selected.checks.map(c => (
                    <div key={c.name} className={`rounded-xl p-3 flex items-start gap-2 ${c.pass ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                      <span className="text-sm flex-shrink-0">{c.pass ? "✅" : "❌"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-surface-800">{c.name}</p>
                          {c.value && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {c.value}
                            </span>
                          )}
                        </div>
                        {c.detail && <p className="text-[11px] text-surface-500 mt-0.5 truncate">{c.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open page link */}
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-brand-700 transition-colors"
              >
                Open Page →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* External validators */}
      <div className="bg-white rounded-2xl border border-surface-100 p-5">
        <p className="text-sm font-bold text-surface-800 mb-3">🔗 External Validators (for production)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: "Google Rich Results Test", url: "https://search.google.com/test/rich-results", desc: "Test JSON-LD schemas" },
            { label: "Google PageSpeed Insights", url: "https://pagespeed.web.dev/", desc: "Core Web Vitals score" },
            { label: "Bing Markup Validator", url: "https://www.bing.com/webmaster/tools/markup-validator", desc: "Validate structured data" },
            { label: "Schema.org Validator", url: "https://validator.schema.org/", desc: "Validate schema markup" },
            { label: "Open Graph Debugger", url: "https://developers.facebook.com/tools/debug/", desc: "Test OG tags" },
            { label: "Twitter Card Validator", url: "https://cards-dev.twitter.com/validator", desc: "Test Twitter cards" },
            { label: "Google Search Console", url: "https://search.google.com/search-console", desc: "Real indexing status" },
            { label: "Ahrefs Free Tools", url: "https://ahrefs.com/free-seo-tools", desc: "Backlinks & rankings" },
          ].map(t => (
            <a
              key={t.label}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-surface-100 rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-bold text-surface-800">{t.label}</p>
              <p className="text-[11px] text-surface-500 mt-0.5">{t.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
