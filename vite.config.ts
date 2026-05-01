import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only middleware that replicates the Cloudflare Pages Function behavior.
 * In production, `functions/api/anthropic.js` handles this route.
 *
 * Priority: ANTHROPIC_API_KEY env var → client-provided apiKey in body
 */
function anthropicProxy(envApiKey: string | undefined): Plugin {
  return {
    name: 'anthropic-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/anthropic',
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8');
              const { apiKey: clientKey, ...anthropicBody } = JSON.parse(body) as {
                apiKey?: string;
                [k: string]: unknown;
              };

              const apiKey = envApiKey || clientKey;

              if (!apiKey) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    error: {
                      message:
                        'API key not set. Add ANTHROPIC_API_KEY to .env or enter it in Settings.',
                    },
                  })
                );
                return;
              }

              const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify(anthropicBody),
              });

              const data = await upstream.text();
              res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
              res.end(data);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { message: String(err) } }));
            }
          });
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const envApiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  return {
    plugins: [react(), anthropicProxy(envApiKey)],
  };
});
