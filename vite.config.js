import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

function formaCatalogueApi() {
  return {
    name: 'forma-catalogue-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const supabaseUrl = env.VITE_SUPABASE_URL;
      const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
      const supabase = supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;

      const queries = {
        artists: () => supabase.from('artists').select('*').order('name'),
        artworks: () => supabase.from('artworks').select('*').order('ends_at', { ascending: true }),
        commissions: () => supabase.from('commissions').select('*').order('created_at'),
        feed_posts: () => supabase.from('feed_posts').select('*').order('created_at', { ascending: false }),
      };

      server.middlewares.use('/api/catalogue', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        try {
          if (!supabase) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Supabase environment is not configured.' }));
            return;
          }

          const url = new URL(req.url || '/', 'http://localhost');
          const resource = url.searchParams.get('resource');
          const query = queries[resource];

          if (!query) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Unknown catalogue resource.' }));
            return;
          }

          const { data, error } = await query();
          if (error) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: error.message }));
            return;
          }

          res.end(JSON.stringify({ data: data || [] }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || 'Catalogue request failed.' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), formaCatalogueApi()],
});
