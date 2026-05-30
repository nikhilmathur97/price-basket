import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { STATIC_POSTS } from "@/lib/blog";
import { getPost, clampDescription, SITE_URL } from "@/lib/server-api";

interface PageProps {
  params: { slug: string };
}

// Pre-render curated posts; generated posts render on-demand & revalidate.
export function generateStaticParams() {
  return STATIC_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Article not found" };

  const url = `${SITE_URL}/blog/${post.slug}`;
  const description = clampDescription(post.excerpt);

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      publishedTime: post.isoDate,
    },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.isoDate,
    dateModified: post.isoDate,
    author: { "@type": "Organization", name: "PriceBasket" },
    publisher: {
      "@type": "Organization",
      name: "PriceBasket",
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="text-sm text-brand-600 hover:underline mb-6 inline-block"
      >
        ← All articles
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{post.emoji}</span>
        <span className="text-[11px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
          {post.category}
        </span>
      </div>

      <h1 className="text-3xl font-black text-surface-900 leading-tight mb-3">
        {post.title}
      </h1>

      <div className="flex items-center gap-2 text-[13px] text-surface-400 mb-8">
        <time dateTime={post.isoDate}>{post.date}</time>
        <span>·</span>
        <span>{post.readTime}</span>
      </div>

      <div className="prose prose-sm max-w-none">
        {post.content.map((section, i) => (
          <section key={i} className="mb-6">
            {section.heading && (
              <h2 className="text-lg font-extrabold text-surface-900 mb-2">
                {section.heading}
              </h2>
            )}
            {section.paragraphs?.map((para, j) => (
              <p
                key={j}
                className="text-[15px] text-surface-700 leading-relaxed mb-3"
              >
                {para}
              </p>
            ))}
            {section.bullets && (
              <ul className="space-y-2 mb-3">
                {section.bullets.map((b, k) => (
                  <li
                    key={k}
                    className="text-[15px] text-surface-700 leading-relaxed flex gap-2"
                  >
                    <span className="text-brand-500 flex-shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-6 text-center text-white">
        <h2 className="text-lg font-black mb-2">Start saving on every order</h2>
        <p className="text-orange-100 text-sm mb-4">
          Compare live prices across Blinkit, Zepto, BigBasket &amp; more.
        </p>
        <Link
          href="/search"
          className="inline-block bg-white text-brand-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors"
        >
          Compare prices now →
        </Link>
      </div>
    </article>
  );
}
