import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Vite middleware that proxies /api/anthropic → Anthropic API
// This keeps the API key server-side during development.
function anthropicProxy(): Plugin {
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
              const { apiKey, ...anthropicBody } = JSON.parse(body) as {
                apiKey: string;
                [k: string]: unknown;
              };

              if (!apiKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing API key' }));
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
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), anthropicProxy()],
});
