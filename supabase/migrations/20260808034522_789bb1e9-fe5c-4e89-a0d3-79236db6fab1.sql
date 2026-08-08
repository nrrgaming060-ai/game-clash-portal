-- 1. Withdrawal method fields on money_requests
ALTER TABLE public.money_requests
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'upi',
  ADD COLUMN IF NOT EXISTS account_holder text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ifsc text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS redeem_code text NOT NULL DEFAULT '';

ALTER TABLE public.money_requests DROP CONSTRAINT IF EXISTS money_requests_payout_method_check;
ALTER TABLE public.money_requests ADD CONSTRAINT money_requests_payout_method_check
  CHECK (payout_method IN ('upi','redeem','bank'));

ALTER TABLE public.money_requests DROP CONSTRAINT IF EXISTS money_requests_status_check;
ALTER TABLE public.money_requests ADD CONSTRAINT money_requests_status_check
  CHECK (status IN ('pending','approved','rejected','paid'));

-- 2. Approve / reject from pending (deposits + withdrawals), with trusted balance updates
CREATE OR REPLACE FUNCTION public.resolve_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  r public.money_requests%rowtype;
  p public.profiles%rowtype;
  v_bal integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select * into r from public.money_requests where id = p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'Request already handled'; end if;
  if r.amount is null or r.amount <= 0 or r.amount > 1000000 then
    raise exception 'Invalid request amount';
  end if;
  if r.kind not in ('deposit','withdrawal') then raise exception 'Invalid request type'; end if;
  select * into p from public.profiles where id = r.user_id for update;

  perform set_config('app.trusted_profile_update', 'on', true);

  if p_approve then
    if r.kind = 'deposit' then
      update public.profiles set deposit_balance = deposit_balance + r.amount
        where id = r.user_id returning deposit_balance into v_bal;
      insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
        values (r.user_id, 'credit', 'deposit', r.amount, v_bal, 'Deposit approved (' || r.method || ')');
    else
      if p.win_balance < r.amount then raise exception 'User has insufficient winnings'; end if;
      update public.profiles set win_balance = win_balance - r.amount
        where id = r.user_id returning win_balance into v_bal;
      insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
        values (r.user_id, 'debit', 'win', r.amount, v_bal, 'Withdrawal approved — ' || r.payout_method);
    end if;
  end if;

  update public.money_requests
    set status = case when p_approve then 'approved' else 'rejected' end, handled_at = now()
    where id = p_request_id;
end;
$function$;

-- 3. Mark an approved request as paid (admin enters redeem code manually for redeem payouts)
CREATE OR REPLACE FUNCTION public.mark_request_paid(p_request_id uuid, p_redeem_code text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  r public.money_requests%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select * into r from public.money_requests where id = p_request_id for update;
  if not found or r.status <> 'approved' then raise exception 'Only approved requests can be marked paid'; end if;
  if r.kind = 'withdrawal' and r.payout_method = 'redeem' then
    if length(trim(p_redeem_code)) < 4 then
      raise exception 'Enter the Google redeem code before marking paid';
    end if;
    update public.money_requests set redeem_code = trim(p_redeem_code) where id = p_request_id;
  end if;
  update public.money_requests set status = 'paid', handled_at = now() where id = p_request_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_request_paid(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_request_paid(uuid, text) TO authenticated;

-- 4. Admin manual credit / debit
CREATE OR REPLACE FUNCTION public.admin_credit(p_user_id uuid, p_amount integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_bal integer;
  v_note text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000000 then
    raise exception 'Invalid amount';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Player not found';
  end if;

  perform set_config('app.trusted_profile_update', 'on', true);
  v_note := left(coalesce(nullif(trim(p_reason),''), 'Manual credit'), 120);

  if p_amount > 0 then
    update public.profiles set deposit_balance = deposit_balance + p_amount
      where id = p_user_id returning deposit_balance into v_bal;
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (p_user_id, 'credit', 'deposit', p_amount, v_bal, 'Admin Credit — ' || v_note);
  else
    update public.profiles set deposit_balance = deposit_balance + p_amount
      where id = p_user_id and deposit_balance + p_amount >= 0
      returning deposit_balance into v_bal;
    if not found then raise exception 'Player balance is too low to deduct that amount'; end if;
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (p_user_id, 'debit', 'deposit', abs(p_amount), v_bal, 'Admin Debit — ' || v_note);
  end if;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_credit(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit(uuid, integer, text) TO authenticated;

-- 5. Leaderboard: admins can remove an entry (account, wallet and history untouched)
GRANT DELETE ON public.leaderboards TO authenticated;
CREATE POLICY "leaderboard admin delete" ON public.leaderboards
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Storage privacy: payment proofs readable only by their owner or admins
DROP POLICY IF EXISTS "media authenticated read" ON storage.objects;
CREATE POLICY "media read shared assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] <> 'deposit-proofs');
CREATE POLICY "media read own proofs or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'deposit-proofs'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );