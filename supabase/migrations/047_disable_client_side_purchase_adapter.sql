-- ============================================================
-- FORMA - disable client-side purchase adapter
-- Purchases unlock private authenticity seals and must be created only by
-- settlement/payment code, not directly by buyers from the browser.
-- Run after 046_profile_privacy_cards.sql.
-- ============================================================

drop policy if exists "Buyers can insert own purchase" on public.purchases;

revoke insert, update, delete on public.purchases from anon, authenticated;
grant select on public.purchases to authenticated;

alter table public.purchases drop constraint if exists purchases_non_negative_amount;
alter table public.purchases
  add constraint purchases_non_negative_amount
  check (amount >= 0) not valid;

notify pgrst, 'reload schema';
