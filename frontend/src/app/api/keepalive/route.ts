import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://pricebasket-api.onrender.com";

// Called every 14 minutes by Vercel Cron to keep Render from sleeping.
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/health`, {
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, backend: data, pingedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
