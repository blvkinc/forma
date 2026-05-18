-- ============================================================
-- FORMA - strict role boundaries
-- Buyers collect/book/bid. Sellers manage their own catalogue.
-- Admin actions should use admin-specific service flows, not buyer/seller UI.
-- ============================================================

-- Buyer-only collection actions
drop policy if exists "Users can insert own likes" on public.user_likes;
drop policy if exists "Buyers can insert own likes" on public.user_likes;
create policy "Buyers can insert own likes"
  on public.user_likes for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
  );

drop policy if exists "Users can insert own follows" on public.user_follows;
drop policy if exists "Buyers can insert own follows" on public.user_follows;
create policy "Buyers can insert own follows"
  on public.user_follows for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
  );

drop policy if exists "Users can insert own watchlist" on public.user_watchlist;
drop policy if exists "Buyers can insert own watchlist" on public.user_watchlist;
create policy "Buyers can insert own watchlist"
  on public.user_watchlist for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
  );

drop policy if exists "Users can insert own bids" on public.bids;
drop policy if exists "Buyers can insert own bids" on public.bids;
create policy "Buyers can insert own bids"
  on public.bids for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
  );

drop policy if exists "Buyers can book commissions" on public.commission_bookings;
create policy "Buyers can book commissions"
  on public.commission_bookings for insert with check (
    auth.uid() = buyer_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
  );

-- Seller-only catalogue management
drop policy if exists "Artists can update own row" on public.artists;
drop policy if exists "Sellers can update own artist row" on public.artists;
create policy "Sellers can update own artist row"
  on public.artists for update using (
    profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'artist')
  );

drop policy if exists "Artworks can be updated by artist owner" on public.artworks;
drop policy if exists "Sellers can update own artworks" on public.artworks;
create policy "Sellers can update own artworks"
  on public.artworks for update using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );

drop policy if exists "Artworks can be inserted by artists" on public.artworks;
drop policy if exists "Sellers can insert own artworks" on public.artworks;
create policy "Sellers can insert own artworks"
  on public.artworks for insert with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );

drop policy if exists "Commissions can be managed by artist owner" on public.commissions;
drop policy if exists "Sellers can insert own commissions" on public.commissions;
create policy "Sellers can insert own commissions"
  on public.commissions for insert with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );
drop policy if exists "Sellers can update own commissions" on public.commissions;
create policy "Sellers can update own commissions"
  on public.commissions for update using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );
drop policy if exists "Sellers can delete own commissions" on public.commissions;
create policy "Sellers can delete own commissions"
  on public.commissions for delete using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );

drop policy if exists "Feed posts can be managed by artist owner" on public.feed_posts;
drop policy if exists "Sellers can insert own feed posts" on public.feed_posts;
create policy "Sellers can insert own feed posts"
  on public.feed_posts for insert with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );
drop policy if exists "Sellers can update own feed posts" on public.feed_posts;
create policy "Sellers can update own feed posts"
  on public.feed_posts for update using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );
drop policy if exists "Sellers can delete own feed posts" on public.feed_posts;
create policy "Sellers can delete own feed posts"
  on public.feed_posts for delete using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );

-- Commission lifecycle remains party-scoped, but buyer and seller sides are explicit.
drop policy if exists "Parties can update bookings" on public.commission_bookings;
drop policy if exists "Buyer or seller parties can update bookings" on public.commission_bookings;
create policy "Buyer or seller parties can update bookings"
  on public.commission_bookings for update using (
    (
      auth.uid() = buyer_id
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
    )
    or exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = auth.uid()
        and p.role = 'artist'
    )
  );
