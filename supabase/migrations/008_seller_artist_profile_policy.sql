-- ============================================================
-- FORMA - seller studio onboarding
-- Lets an authenticated seller create the artist catalogue row linked to them.
-- Run after 007_role_boundary_policies.sql.
-- ============================================================

drop policy if exists "Sellers can insert own artist row" on public.artists;
create policy "Sellers can insert own artist row"
  on public.artists for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'artist'
    )
  );
