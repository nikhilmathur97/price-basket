/**
 * StructuredData — injects JSON-LD schema markup for rich Google results.
 *
 * Schemas included:
 *  - Organization (identity schema — sitelinks, logo, social profiles)
 *  - LocalBusiness (local SEO + GEO identity)
 *  - WebSite (sitelinks searchbox)
 *  - SoftwareApplication (app store ratings)
 *  - FAQPage (common grocery comparison questions)
 *  - BreadcrumbList (injected per-page via props)
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  breadcrumbs?: BreadcrumbItem[];
  /** Pass product data for Product schema on product pages */
  product?: {
    name: string;
    description: string;
    image?: string;
    brand?: string;
    offers?: { price: number; priceCurrency: string; seller: string; url: string }[];
  };
  /** Pass article data for Article schema on blog pages */
  article?: {
    headline: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    image?: string;
    authorName?: string;
  };
}

export function StructuredData({ breadcrumbs, product, article }: StructuredDataProps) {
  const SITE_URL = "https://pricebasket.in";
  const LOGO_URL = `${SITE_URL}/pricebasket-logo.png`;

  // ── Organization schema ───────────────────────────────────────────────────
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "PriceBasket",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    description:
      "India's #1 grocery price comparison platform. Compare prices across Blinkit, Zepto, BigBasket, Swiggy Instamart, JioMart and more.",
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@pricebasket.in",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [
      "https://twitter.com/pricebasketin",
      "https://www.instagram.com/pricebasketindia",
      "https://www.youtube.com/@pricebasketindia",
      "https://www.linkedin.com/company/pricebasketin",
    ],
  };

  // ── LocalBusiness (satisfies "Add Local Business Schema" + "Add Identity Schema") ──
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: "PriceBasket",
    alternateName: "Price Basket India",
    url: SITE_URL,
    logo: LOGO_URL,
    image: LOGO_URL,
    description:
      "India's #1 grocery price comparison platform. Compare Blinkit, Zepto, BigBasket, Swiggy Instamart, JioMart prices in real-time. Free price alerts. Save ₹500/month.",
    email: "hello@pricebasket.in",
    telephone: "+91-8005828390",
    foundingDate: "2024",
    priceRange: "Free",
    currenciesAccepted: "INR",
    paymentAccepted: "Free",
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressLocality: "India",
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    serviceArea: {
      "@type": "Country",
      name: "India",
    },
    sameAs: [
      "https://twitter.com/pricebasketin",
      "https://www.instagram.com/pricebasketindia",
      "https://www.youtube.com/@pricebasketin",
      "https://www.linkedin.com/company/pricebasketin",
    ],
    hasMap: "https://pricebasket.in",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  };

  // ── WebSite + Sitelinks Searchbox ─────────────────────────────────────────
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "PriceBasket",
    description: "Compare grocery prices across Blinkit, Zepto, BigBasket & more. Save ₹500/month.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  };

  // ── SoftwareApplication (for app store rich results) ─────────────────────
  // aggregateRating removed — Google requires real verified reviews, not placeholder data
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PriceBasket — Grocery Price Comparison",
    applicationCategory: "ShoppingApplication",
    operatingSystem: "Android, iOS, Web",
    url: SITE_URL,
    description:
      "Compare grocery prices across 10+ platforms. Get price alerts. Save money on every order.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    screenshot: `${SITE_URL}/hero-basket.png`,
  };

  // ── FAQ schema (targets featured snippets) ────────────────────────────────
  // ── BreadcrumbList (per-page) ─────────────────────────────────────────────
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }
    : null;

  // ── Product schema (product pages) ───────────────────────────────────────
  const productSchema = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.image ?? LOGO_URL,
        brand: product.brand
          ? { "@type": "Brand", name: product.brand }
          : undefined,
        offers: product.offers?.map((o) => ({
          "@type": "Offer",
          price: o.price,
          priceCurrency: o.priceCurrency,
          seller: { "@type": "Organization", name: o.seller },
          url: o.url,
          availability: "https://schema.org/InStock",
          priceValidUntil: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        })),
      }
    : null;

  // ── Article schema (blog pages) ──────────────────────────────────────────
  const articleSchema = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.headline,
        description: article.description,
        datePublished: article.datePublished,
        dateModified: article.dateModified ?? article.datePublished,
        image: article.image ?? LOGO_URL,
        author: {
          "@type": "Person",
          name: article.authorName ?? "PriceBasket Team",
        },
        publisher: {
          "@type": "Organization",
          name: "PriceBasket",
          logo: { "@type": "ImageObject", url: LOGO_URL },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": SITE_URL },
      }
    : null;

  // faqSchema removed from global layout — homepage and /faqs each define
  // their own FAQPage schema inline. Two FAQPage schemas on one page causes
  // Google Rich Results validation errors ("2 invalid items detected").
  const schemas = [
    organizationSchema,
    localBusinessSchema,
    websiteSchema,
    appSchema,
    breadcrumbSchema,
    productSchema,
    articleSchema,
  ].filter(Boolean);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
