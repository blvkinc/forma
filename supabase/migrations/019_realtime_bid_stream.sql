-- ============================================================
-- FORMA — Slice 4: realtime bid stream
-- Expose bids + artworks on the supabase_realtime publication so
-- the client can live-stream new bids (the SRS "WebSocket bid
-- stream" requirement, implemented over Supabase Realtime).
-- Run after 018_auction_anti_snipe.sql.
-- ============================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.bids;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.artworks;
  exception when duplicate_object then null;
  end;
exception when undefined_object then
  raise notice 'supabase_realtime publication not found — enable Realtime in the Supabase dashboard.';
end;
$$;
