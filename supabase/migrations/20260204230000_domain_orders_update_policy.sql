-- Add missing UPDATE policy for domain_orders
create policy "Users can update own domain orders"
  on public.domain_orders for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Partial unique index: prevent duplicate active orders for the same domain
create unique index idx_domain_orders_active_domain
  on public.domain_orders(domain)
  where status not in ('failed', 'cancelled');
