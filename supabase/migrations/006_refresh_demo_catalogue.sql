-- ============================================================
-- FORMA - Demo catalogue refresh
-- Run with Supabase SQL Editor or CLI using database credentials.
-- Keeps the demo catalogue current and readable by the app.
-- ============================================================

insert into public.artists (id, handle, name, city, joined, followers, bio, verified, accent) values
  ('a1', 'kestner.studio', 'Lou Kestner', 'Zurich', '2024', 4218, 'Generative type, halftone studies, post-grid systems.', true, '#FF3B1F'),
  ('a2', 'mira.tanaka', 'Mira Tanaka', 'Kyoto', '2023', 8902, 'Architectural drawing, light, concrete, and nothing else.', true, '#0E0E0C'),
  ('a3', 'okonkwo.studio', 'Ada Okonkwo', 'Lagos', '2025', 1402, 'Color systems, Bauhaus reissues, weekly print drops.', false, '#1A4FFF'),
  ('a4', 'rfm.works', 'Reza Farahani-M.', 'Berlin', '2022', 12881, 'Glitch as ornament. Type as architecture. 1/1 only.', true, '#0E0E0C'),
  ('a5', 'pauline.s', 'Pauline Schreiber', 'Lausanne', '2024', 3009, 'Topographies, contour drawings, slow geometry.', false, '#FF8A00'),
  ('a6', 'fjeld.no', 'Henrik Fjeld', 'Oslo', '2023', 6644, 'Risograph-only. Editions of 25. Sent rolled.', true, '#0E7C3A')
on conflict (id) do update set
  handle = excluded.handle,
  name = excluded.name,
  city = excluded.city,
  joined = excluded.joined,
  followers = excluded.followers,
  bio = excluded.bio,
  verified = excluded.verified,
  accent = excluded.accent;

insert into public.artworks (id, title, visual, artist_id, year, dimensions, edition, start_bid, current_bid, bid_count, watcher_count, ends_at, tags, like_count, format) values
  ('w01', 'Halftone Field No. 14', 'v1', 'a1', 2026, '4096x4096', '1/1', 280, 480, 14, 92, now() + interval '5 hours 12 minutes', ARRAY['halftone','generative','print-ready'], 211, 'PNG + raw glyph'),
  ('w02', 'Concrete Light, Study II', 'v2', 'a2', 2026, '3000x3000', '1/3', 600, 1240, 22, 188, now() + interval '22 hours', ARRAY['architecture','gradient','photo'], 540, 'TIFF'),
  ('w03', 'Mondrian Reissue', 'v3', 'a3', 2025, '5000x5000', '1/1', 320, 320, 0, 41, now() + interval '2 days', ARRAY['bauhaus','color-blocks','print'], 88, 'SVG + PNG'),
  ('w04', 'Topographic Drift', 'v4', 'a5', 2026, '4500x4500', '1/5', 180, 245, 5, 67, now() + interval '2 hours 30 minutes', ARRAY['line-art','topography'], 134, 'SVG'),
  ('w05', 'A to Z', 'v5', 'a1', 2026, '6000x6000', '1/1', 540, 820, 9, 102, now() + interval '14 hours', ARRAY['typography','poster'], 312, 'AI + PDF'),
  ('w06', 'Sun, Receding', 'v6', 'a5', 2025, '4000x4000', '1/10', 120, 160, 3, 33, now() + interval '2 days 22 hours', ARRAY['gradient','minimal'], 76, 'PNG'),
  ('w07', 'Orbit, Inner', 'v7', 'a2', 2026, '3000x3000', '1/1', 400, 615, 11, 124, now() + interval '9 hours', ARRAY['line-art','geometry'], 198, 'SVG + PNG'),
  ('w08', 'Channel Error 03', 'v8', 'a4', 2026, '3840x2160', '1/1', 700, 1450, 28, 312, now() + interval '1 hour 6 minutes', ARRAY['glitch','1/1'], 822, 'PNG'),
  ('w09', 'Three Triangles', 'v9', 'a3', 2026, '4000x4000', '1/8', 90, 90, 0, 18, now() + interval '4 days', ARRAY['geometry','bauhaus'], 41, 'SVG'),
  ('w10', 'Hot Sun, Cold Sky', 'v10', 'a6', 2025, '2000x2000', '12/25', 60, 60, 0, 9, now() + interval '5 days', ARRAY['riso','print'], 27, 'TIFF + RISO separations'),
  ('w11', 'Terminal Garden', 'v11', 'a4', 2026, 'TXT/4096w', '1/1', 240, 360, 7, 58, now() + interval '1 day 12 hours', ARRAY['ascii','code-art'], 144, 'TXT + PNG'),
  ('w12', 'Field, Divided', 'v12', 'a6', 2026, '4000x4000', '1/15', 80, 145, 4, 22, now() + interval '2 days 12 hours', ARRAY['riso','color-blocks'], 63, 'TIFF')
on conflict (id) do update set
  title = excluded.title,
  visual = excluded.visual,
  artist_id = excluded.artist_id,
  year = excluded.year,
  dimensions = excluded.dimensions,
  edition = excluded.edition,
  start_bid = excluded.start_bid,
  current_bid = excluded.current_bid,
  bid_count = excluded.bid_count,
  watcher_count = excluded.watcher_count,
  ends_at = excluded.ends_at,
  tags = excluded.tags,
  like_count = excluded.like_count,
  format = excluded.format;

insert into public.commissions (id, artist_id, title, slots, taken, price, days, brief) values
  ('c1', 'a1', 'Custom typographic poster', 3, 1, 480, 14, 'Single letterform, your message, A2 print-ready, source files included.'),
  ('c2', 'a2', 'Architectural study, 1 building', 2, 2, 1200, 28, 'I shoot one building you love. Two final compositions, raw + treated.'),
  ('c3', 'a3', 'Brand color system', 5, 0, 700, 10, 'Bauhaus-method palette, 12 swatches, usage doc, web tokens.'),
  ('c4', 'a4', 'Glitched 1/1 portrait', 1, 0, 2000, 21, 'Send one photo. Receive a destroyed, beautiful 1/1 piece.'),
  ('c5', 'a5', 'Topographic map, any place', 4, 2, 320, 12, 'Pick any coordinates. Contour drawing, large format, signed.'),
  ('c6', 'a6', '2-color risograph print', 6, 3, 220, 18, 'Riso edition of 25, two colors of your choice, A3, sent rolled.')
on conflict (id) do update set
  artist_id = excluded.artist_id,
  title = excluded.title,
  slots = excluded.slots,
  taken = excluded.taken,
  price = excluded.price,
  days = excluded.days,
  brief = excluded.brief;

insert into public.feed_posts (id, artist_id, type, posted_at, body, artwork_id, like_count, comment_count) values
  ('p1', 'a4', 'drop', '2h', 'New 1/1 live. Channel Error 03. 22 minutes of editing for 4 seconds of decision.', 'w08', 211, 18),
  ('p2', 'a2', 'process', '5h', 'Shot at 04:40, before the caretaker shows up. The concrete is warmer than the light.', null, 89, 6),
  ('p3', 'a1', 'note', '8h', 'Opening 3 commission slots tomorrow at 09:00 CET. Single letterforms. Probably the last batch this quarter.', null, 142, 23),
  ('p4', 'a3', 'drop', '1d', 'Three Triangles starting bid 90. Editions of 8. Going slow this week.', 'w09', 41, 4),
  ('p5', 'a5', 'process', '1d', 'Twelve drafts of one ridge. The map is not the territory but the draft is not the map either.', null, 76, 11),
  ('p6', 'a6', 'sold', '2d', 'Field, Divided edition 4/15 sold. Sending rolled tomorrow.', 'w12', 53, 2)
on conflict (id) do update set
  artist_id = excluded.artist_id,
  type = excluded.type,
  posted_at = excluded.posted_at,
  body = excluded.body,
  artwork_id = excluded.artwork_id,
  like_count = excluded.like_count,
  comment_count = excluded.comment_count;
