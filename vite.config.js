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

      const sendJson = (res, statusCode, payload) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      };

      const dbErrorMessage = (error) => {
        const message = error?.message || 'Database request failed.';
        if (/row-level security/i.test(message)) {
          return `${message} Run the latest Supabase migrations in supabase/migrations before retrying protected writes.`;
        }
        return message;
      };

      const readJsonBody = (req) => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 1_000_000) {
            reject(new Error('Request body is too large.'));
            req.destroy();
          }
        });
        req.on('end', () => {
          if (!body) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Request body must be valid JSON.'));
          }
        });
        req.on('error', reject);
      });

      const authClientFromRequest = (req) => {
        const authorization = req.headers.authorization || '';
        const token = authorization.replace(/^Bearer\s+/i, '').trim();

        if (!supabaseUrl || !supabaseKey || !token) {
          return { error: 'Authenticated Supabase request is not configured.', token: null, client: null };
        }

        return {
          token,
          error: null,
          client: createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          }),
        };
      };

      const currentUser = async (client, token) => {
        const { data, error } = await client.auth.getUser(token);
        if (error || !data?.user) {
          throw new Error(error?.message || 'Authentication is required.');
        }
        return data.user;
      };

      const slugify = (value, fallback = 'studio') => {
        const slug = String(value || fallback)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48);
        return slug || fallback;
      };

      const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const parseTags = (value) => {
        if (Array.isArray(value)) {
          return value.map(tag => String(tag).trim()).filter(Boolean).slice(0, 10);
        }
        return String(value || '')
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
          .slice(0, 10);
      };

      const sellerProfile = async (client, user) => {
        const { data, error } = await client
          .from('profiles')
          .select('id, role, display_name, handle, city, bio')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data?.role !== 'artist') {
          const forbidden = new Error('A seller account is required for this action.');
          forbidden.statusCode = 403;
          throw forbidden;
        }
        return data;
      };

      const ownedArtistFor = async (client, userId) => {
        const { data, error } = await client
          .from('artists')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      };

      const profileFor = async (client, user) => {
        const { data, error } = await client
          .from('profiles')
          .select('id, role, display_name, handle, email')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        return data;
      };

      const adminProfile = async (client, user) => {
        const profile = await profileFor(client, user);
        if (profile?.role !== 'admin') {
          const forbidden = new Error('An admin account is required for this action.');
          forbidden.statusCode = 403;
          throw forbidden;
        }
        return profile;
      };

      const buyerProfile = async (client, user) => {
        const profile = await profileFor(client, user);
        if (profile?.role !== 'buyer') {
          const forbidden = new Error('A buyer account is required to place bids.');
          forbidden.statusCode = 403;
          throw forbidden;
        }
        return profile;
      };

      const minimumBidIncrement = (currentBid) => {
        const raw = Math.max(20, Number(currentBid || 0) * 0.05);
        if (raw === 0) return 20;
        const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
        return Math.ceil(raw / magnitude) * magnitude;
      };

      const minimumNextBid = (currentBid) => Number(currentBid || 0) + minimumBidIncrement(currentBid);

      const reportPriority = (reason) => {
        if (reason === 'fraud' || reason === 'copyright' || reason === 'prohibited') return 'high';
        if (reason === 'abuse') return 'normal';
        return 'low';
      };

      server.middlewares.use('/api/catalogue', async (req, res) => {
        try {
          if (!supabase) {
            sendJson(res, 500, { error: 'Supabase environment is not configured.' });
            return;
          }

          const url = new URL(req.url || '/', 'http://localhost');
          const resource = url.searchParams.get('resource');
          const query = queries[resource];

          if (!query) {
            sendJson(res, 400, { error: 'Unknown catalogue resource.' });
            return;
          }

          const { data, error } = await query();
          if (error) {
            sendJson(res, 502, { error: error.message });
            return;
          }

          sendJson(res, 200, { data: data || [] });
        } catch (err) {
          sendJson(res, 500, { error: err.message || 'Catalogue request failed.' });
        }
      });

      server.middlewares.use('/api/seller-artist', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' });
            return;
          }

          const user = await currentUser(client, token);
          const profile = await sellerProfile(client, user);
          const body = await readJsonBody(req);
          const handle = slugify(body.handle || profile.handle || profile.display_name || user.email);
          const existing = await ownedArtistFor(client, user.id);
          const values = {
            handle,
            name: String(body.name || profile.display_name || handle).trim().slice(0, 120),
            city: String(body.city || profile.city || '').trim().slice(0, 120) || null,
            joined: String(new Date().getFullYear()),
            followers: existing?.followers || 0,
            bio: String(body.bio || profile.bio || '').trim().slice(0, 900) || null,
            verified: existing?.verified || false,
            accent: String(body.accent || existing?.accent || '#0E0E0C').trim().slice(0, 24),
            profile_id: user.id,
          };

          const query = existing
            ? client.from('artists').update(values).eq('id', existing.id)
            : client.from('artists').insert({ id: `seller-${handle}`, ...values });

          const { data, error } = await query.select().single();
          if (error) {
            sendJson(res, 502, { error: dbErrorMessage(error) });
            return;
          }
          sendJson(res, existing ? 200 : 201, { data });
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Seller artist request failed.' });
        }
      });

      server.middlewares.use('/api/seller-artworks', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' });
            return;
          }

          const user = await currentUser(client, token);
          await sellerProfile(client, user);
          const artist = await ownedArtistFor(client, user.id);
          if (!artist) {
            sendJson(res, 409, { error: 'Create a seller studio profile before listing artwork.' });
            return;
          }

          const body = await readJsonBody(req);
          const title = String(body.title || '').trim();
          const startBid = Number(body.startBid);
          const durationHours = Math.min(168, Math.max(24, Number(body.durationHours || 120)));

          if (!title || !Number.isFinite(startBid) || startBid < 20) {
            sendJson(res, 400, { error: 'Artwork title and a starting bid of at least $20 are required.' });
            return;
          }

          const { data, error } = await client
            .from('artworks')
            .insert({
              id: makeId('art'),
              title: title.slice(0, 140),
              visual: String(body.visual || 'v1').trim().slice(0, 16),
              artist_id: artist.id,
              year: Number(body.year || new Date().getFullYear()),
              dimensions: String(body.dimensions || 'Digital file').trim().slice(0, 120),
              edition: String(body.edition || '1/1').trim().slice(0, 80),
              start_bid: startBid,
              current_bid: startBid,
              bid_count: 0,
              watcher_count: 0,
              ends_at: new Date(Date.now() + durationHours * 3600000).toISOString(),
              tags: parseTags(body.tags),
              like_count: 0,
              format: String(body.format || 'PNG / source').trim().slice(0, 80),
              image_url: String(body.imageUrl || '').trim() || null,
            })
            .select()
            .single();

          if (error) {
            sendJson(res, 502, { error: dbErrorMessage(error) });
            return;
          }
          sendJson(res, 201, { data });
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Seller artwork request failed.' });
        }
      });

      server.middlewares.use('/api/seller-commissions', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' });
            return;
          }

          const user = await currentUser(client, token);
          await sellerProfile(client, user);
          const artist = await ownedArtistFor(client, user.id);
          if (!artist) {
            sendJson(res, 409, { error: 'Create a seller studio profile before opening commissions.' });
            return;
          }

          const body = await readJsonBody(req);
          const title = String(body.title || '').trim();
          const slots = Math.min(12, Math.max(1, Number(body.slots || 1)));
          const price = Number(body.price);
          const days = Math.min(60, Math.max(1, Number(body.days || 7)));

          if (!title || !Number.isFinite(price) || price < 20) {
            sendJson(res, 400, { error: 'Commission title and a price of at least $20 are required.' });
            return;
          }

          const { data, error } = await client
            .from('commissions')
            .insert({
              id: makeId('com'),
              artist_id: artist.id,
              title: title.slice(0, 140),
              slots,
              taken: 0,
              price,
              days,
              brief: String(body.brief || '').trim().slice(0, 900) || null,
            })
            .select()
            .single();

          if (error) {
            sendJson(res, 502, { error: dbErrorMessage(error) });
            return;
          }
          sendJson(res, 201, { data });
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Seller commission request failed.' });
        }
      });

      server.middlewares.use('/api/bids', async (req, res) => {
        try {
          if (!supabase) {
            sendJson(res, 500, { error: 'Supabase environment is not configured.' });
            return;
          }

          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET') {
            const artworkId = url.searchParams.get('artworkId');
            const scope = url.searchParams.get('scope');

            let query = supabase
              .from('bids')
              .select('*')
              .order('placed_at', { ascending: false })
              .limit(100);

            if (scope === 'mine') {
              const { client, token, error: authError } = authClientFromRequest(req);
              if (authError) {
                sendJson(res, 401, { error: authError });
                return;
              }
              const user = await currentUser(client, token);
              query = client
                .from('bids')
                .select('*')
                .eq('user_id', user.id)
                .order('placed_at', { ascending: false })
                .limit(100);
            } else if (artworkId) {
              query = query.eq('artwork_id', artworkId);
            } else {
              sendJson(res, 400, { error: 'artworkId or scope=mine is required.' });
              return;
            }

            const { data, error } = await query;
            if (error) {
              sendJson(res, 502, { error: dbErrorMessage(error) });
              return;
            }
            sendJson(res, 200, { data: data || [] });
            return;
          }

          if (req.method === 'POST') {
            const { client, token, error: authError } = authClientFromRequest(req);
            if (authError) {
              sendJson(res, 401, { error: authError });
              return;
            }

            const user = await currentUser(client, token);
            const profile = await buyerProfile(client, user);
            const body = await readJsonBody(req);
            const artworkId = String(body.artworkId || '').trim();
            const amount = Number(body.amount);

            if (!artworkId || !Number.isFinite(amount)) {
              sendJson(res, 400, { error: 'artworkId and a numeric amount are required.' });
              return;
            }

            const { data: artwork, error: artworkError } = await client
              .from('artworks')
              .select('*')
              .eq('id', artworkId)
              .single();

            if (artworkError || !artwork) {
              sendJson(res, 404, { error: dbErrorMessage(artworkError) || 'Artwork not found.' });
              return;
            }

            if (new Date(artwork.ends_at).getTime() <= Date.now()) {
              sendJson(res, 409, { error: 'Auction has ended.' });
              return;
            }

            if (artwork.authenticity_status === 'restricted') {
              sendJson(res, 409, { error: 'Bidding is paused until the artist submits process proof.' });
              return;
            }

            const minimum = minimumNextBid(Number(artwork.current_bid || 0));
            if (amount < minimum) {
              sendJson(res, 400, { error: `Bid must be at least $${minimum.toLocaleString('en-US')}.` });
              return;
            }

            const displayName = String(body.displayName || profile.display_name || profile.handle || user.email || 'Anonymous')
              .trim()
              .slice(0, 120);

            const { data: bid, error } = await client
              .from('bids')
              .insert({
                user_id: user.id,
                artwork_id: artworkId,
                amount,
                display_name: displayName || 'Anonymous',
              })
              .select()
              .single();

            if (error) {
              sendJson(res, 502, { error: dbErrorMessage(error) });
              return;
            }

            const { data: updatedArtwork, error: updatedError } = await client
              .from('artworks')
              .select('*')
              .eq('id', artworkId)
              .single();

            if (updatedError) {
              sendJson(res, 502, { error: dbErrorMessage(updatedError) });
              return;
            }

            sendJson(res, 201, { data: { bid, artwork: updatedArtwork } });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed.' });
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Bid request failed.' });
        }
      });

      server.middlewares.use('/api/reports', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }

          const user = await currentUser(client, token);

          if (req.method === 'GET') {
            await adminProfile(client, user);

            const { data, error } = await client
              .from('reports')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100);

            if (error) {
              sendJson(res, 502, { error: dbErrorMessage(error) });
              return;
            }
            sendJson(res, 200, { data: data || [] });
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const targetType = String(body.targetType || '').trim();
            const targetId = String(body.targetId || '').trim();
            const reason = String(body.reason || '').trim();
            const allowedTargets = new Set(['artwork', 'artist', 'commission', 'feed_post', 'user']);
            const allowedReasons = new Set(['copyright', 'abuse', 'fraud', 'misleading', 'prohibited', 'other']);

            if (!allowedTargets.has(targetType) || !targetId || !allowedReasons.has(reason)) {
              sendJson(res, 400, { error: 'A valid target and report reason are required.' });
              return;
            }

            const { data, error } = await client
              .from('reports')
              .insert({
                reporter_id: user.id,
                target_type: targetType,
                target_id: targetId,
                reason,
                details: String(body.details || '').trim().slice(0, 1200) || null,
                priority: reportPriority(reason),
              })
              .select()
              .single();

            if (error) {
              sendJson(res, 502, { error: dbErrorMessage(error) });
              return;
            }
            sendJson(res, 201, { data });
            return;
          }

          if (req.method === 'PATCH') {
            const profile = await adminProfile(client, user);
            const body = await readJsonBody(req);
            const reportId = String(body.reportId || '').trim();
            const status = String(body.status || '').trim();
            const allowedStatuses = new Set(['open', 'reviewing', 'resolved', 'dismissed']);

            if (!reportId || !allowedStatuses.has(status)) {
              sendJson(res, 400, { error: 'reportId and a valid status are required.' });
              return;
            }

            const { data, error } = await client
              .from('reports')
              .update({
                status,
                resolution_note: String(body.resolutionNote || '').trim() || null,
                reviewed_by: profile.id,
                reviewed_at: status === 'open' ? null : new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', reportId)
              .select()
              .single();

            if (error) {
              sendJson(res, 502, { error: dbErrorMessage(error) });
              return;
            }
            sendJson(res, 200, { data });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed.' });
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Report request failed.' });
        }
      });

      server.middlewares.use('/api/commission-bookings', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }

          const user = await currentUser(client, token);
          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET') {
            const scope = url.searchParams.get('scope') || 'buyer';
            const artistId = url.searchParams.get('artistId');
            let query = client
              .from('commission_bookings')
              .select('*, commissions(*), artists(*)')
              .order('created_at', { ascending: false });

            if (scope === 'artist') {
              if (!artistId) {
                sendJson(res, 400, { error: 'artistId is required for seller bookings.' });
                return;
              }
              query = query.eq('artist_id', artistId);
            } else {
              query = query.eq('buyer_id', user.id);
            }

            const { data, error } = await query;
            if (error) {
              sendJson(res, 502, { error: error.message });
              return;
            }
            sendJson(res, 200, { data: data || [] });
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { commissionId, artistId, briefText, price } = body;

            if (!commissionId || !artistId || price == null) {
              sendJson(res, 400, { error: 'commissionId, artistId, and price are required.' });
              return;
            }

            const { data, error } = await client
              .from('commission_bookings')
              .insert({
                commission_id: commissionId,
                buyer_id: user.id,
                artist_id: artistId,
                status: 'BOOKED',
                brief_text: briefText || '',
                price,
              })
              .select('*, commissions(*), artists(*)')
              .single();

            if (error) {
              sendJson(res, 502, { error: error.message });
              return;
            }
            sendJson(res, 201, { data });
            return;
          }

          if (req.method === 'PATCH') {
            const body = await readJsonBody(req);
            const { bookingId, status } = body;

            if (!bookingId || !status) {
              sendJson(res, 400, { error: 'bookingId and status are required.' });
              return;
            }

            const { data, error } = await client
              .from('commission_bookings')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('id', bookingId)
              .select('*, commissions(*), artists(*)')
              .single();

            if (error) {
              sendJson(res, 502, { error: error.message });
              return;
            }
            sendJson(res, 200, { data });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed.' });
        } catch (err) {
          sendJson(res, 500, { error: err.message || 'Commission booking request failed.' });
        }
      });

      server.middlewares.use('/api/commission-messages', async (req, res) => {
        try {
          const { client, token, error: authError } = authClientFromRequest(req);
          if (authError) {
            sendJson(res, 401, { error: authError });
            return;
          }

          const user = await currentUser(client, token);
          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET') {
            const bookingId = url.searchParams.get('bookingId');
            if (!bookingId) {
              sendJson(res, 400, { error: 'bookingId is required.' });
              return;
            }

            const { data, error } = await client
              .from('commission_messages')
              .select('*')
              .eq('booking_id', bookingId)
              .order('created_at', { ascending: true });

            if (error) {
              sendJson(res, 502, { error: error.message });
              return;
            }
            sendJson(res, 200, { data: data || [] });
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { bookingId, body: messageBody, isMilestone } = body;

            if (!bookingId || !messageBody?.trim()) {
              sendJson(res, 400, { error: 'bookingId and body are required.' });
              return;
            }

            const { data, error } = await client
              .from('commission_messages')
              .insert({
                booking_id: bookingId,
                sender_id: user.id,
                body: messageBody.trim(),
                is_milestone: Boolean(isMilestone),
              })
              .select()
              .single();

            if (error) {
              sendJson(res, 502, { error: error.message });
              return;
            }
            sendJson(res, 201, { data });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed.' });
        } catch (err) {
          sendJson(res, 500, { error: err.message || 'Commission message request failed.' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), formaCatalogueApi()],
});
