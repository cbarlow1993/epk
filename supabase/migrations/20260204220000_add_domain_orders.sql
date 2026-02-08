create table public.domain_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','purchasing','active','renewal_failed','failed','cancelled')),

  vercel_purchase_price numeric(10,2) not null,
  vercel_renewal_price numeric(10,2) not null,
  service_fee numeric(10,2) not null default 5.00,
  years integer not null default 1,

  stripe_checkout_session_id text,
  stripe_subscription_id text,
  vercel_order_id text,
  contact_info jsonb,

  purchased_at timestamptz,
  expires_at timestamptz,
  last_renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.domain_orders enable row level security;

create policy "Users can view own domain orders"
  on public.domain_orders for select
  using (profile_id = auth.uid());

create policy "Users can insert own domain orders"
  on public.domain_orders for insert
  with check (profile_id = auth.uid());

create index idx_domain_orders_stripe_session
  on public.domain_orders(stripe_checkout_session_id);

create index idx_domain_orders_stripe_subscription
  on public.domain_orders(stripe_subscription_id);

create index idx_domain_orders_profile_status
  on public.domain_orders(profile_id, status);
