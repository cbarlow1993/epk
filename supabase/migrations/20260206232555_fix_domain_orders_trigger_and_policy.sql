-- Add missing updated_at trigger (matches pattern from init migration)
CREATE TRIGGER domain_orders_updated_at
  BEFORE UPDATE ON public.domain_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Replace overly permissive UPDATE policy with restricted version.
-- Domain order status/pricing fields should only be modified by the admin client
-- (stripe webhook, server functions). Users may only update contact_info via RLS.
DROP POLICY IF EXISTS "Users can update own domain orders" ON public.domain_orders;

CREATE POLICY "Users can update own domain order contact info"
  ON public.domain_orders FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Revoke UPDATE on sensitive columns from authenticated users.
-- Only the service_role (admin) client can modify these columns.
REVOKE UPDATE (status, vercel_purchase_price, vercel_renewal_price, service_fee,
  stripe_checkout_session_id, stripe_subscription_id, vercel_order_id,
  purchased_at, expires_at, last_renewed_at, years)
ON public.domain_orders FROM authenticated;
