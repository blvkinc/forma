-- ============================================================
-- FORMA - social interaction permissions
-- Follows and artwork likes are social actions, not buyer-only
-- collecting actions. Bids, watchlists, and commission bookings
-- remain buyer-scoped in 007_role_boundary_policies.sql.
-- ============================================================

grant select, insert, delete on public.user_follows to authenticated;
grant select, insert, delete on public.user_likes to authenticated;
grant select, insert, delete on public.post_comments to authenticated;
grant select, insert, delete on public.artwork_comments to authenticated;

drop policy if exists "Users can insert own follows" on public.user_follows;
drop policy if exists "Buyers can insert own follows" on public.user_follows;
drop policy if exists "Authenticated users can insert own follows" on public.user_follows;
create policy "Authenticated users can insert own follows"
  on public.user_follows
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own likes" on public.user_likes;
drop policy if exists "Buyers can insert own likes" on public.user_likes;
drop policy if exists "Authenticated users can insert own artwork likes" on public.user_likes;
create policy "Authenticated users can insert own artwork likes"
  on public.user_likes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
