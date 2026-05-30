// IndexNow key verification endpoint.
//
// IndexNow requires the key to be retrievable on the site's own host. We serve
// it here from the INDEXNOW_KEY env var (set the SAME value on the backend,
// which passes this URL as `keyLocation`). This avoids manually uploading a
// <key>.txt file. Returns 404 until the key is configured.

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
