/**
 * Cloudflare Pages Function: /api/anthropic
 *
 * Proxies requests to the Anthropic API using the server-side API key.
 * Set ANTHROPIC_API_KEY in Cloudflare Pages → Settings → Environment variables.
 *
 * Falls back to a client-provided key if the env var is not set
 * (useful for self-hosted / local preview).
 */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Server-side key takes priority; client key is fallback
    const apiKey = context.env.ANTHROPIC_API_KEY || body.apiKey;

    if (!apiKey) {
      return Response.json(
        {
          error: {
            message:
              'API key not configured. Add ANTHROPIC_API_KEY to Cloudflare environment variables, or enter it in the app Settings.',
          },
        },
        { status: 401 }
      );
    }

    // Strip the client-side key before forwarding
    const { apiKey: _removed, ...anthropicBody } = body;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return Response.json({ error: { message: String(err) } }, { status: 500 });
  }
}
