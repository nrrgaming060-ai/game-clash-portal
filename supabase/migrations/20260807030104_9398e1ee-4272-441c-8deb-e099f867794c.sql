-- 1) Validate money request amounts
ALTER TABLE public.money_requests
  ADD CONSTRAINT money_requests_amount_positive CHECK (amount > 0 AND amount <= 1000000),
  ADD CONSTRAINT money_requests_kind_valid CHECK (kind IN ('deposit','withdrawal')),
  ADD CONSTRAINT money_requests_status_valid CHECK (status IN ('pending','approved','rejected'));

-- 2) Harden resolve_request
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
        values (r.user_id, 'debit', 'win', r.amount, v_bal, 'Withdrawal paid to ' || r.account_ref);
    end if;
  end if;

  update public.money_requests
    set status = case when p_approve then 'approved' else 'rejected' end, handled_at = now()
    where id = p_request_id;
end;
$function$;

-- 3) One-time admin bootstrap
CREATE TABLE IF NOT EXISTS public.app_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  admin_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_bootstrap TO service_role;
ALTER TABLE public.app_bootstrap ENABLE ROW LEVEL SECURITY;
-- no policies: only SECURITY DEFINER functions may read/write this table

INSERT INTO public.app_bootstrap (id, admin_granted)
VALUES (true, EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_profile(p_name text, p_email text, p_avatar text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_claimed boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    v_code := lower(regexp_replace(coalesce(nullif(p_name,''),'player'),'[^a-zA-Z0-9]','','g'));
    v_code := left(coalesce(nullif(v_code,''),'player'), 8) || floor(random()*900+100)::text;
    insert into public.profiles (id, name, email, avatar_url, referral_code)
    values (v_uid, coalesce(nullif(p_name,''),'Player'), coalesce(p_email,''), coalesce(p_avatar,''), v_code)
    on conflict (id) do nothing;
  end if;

  -- one-time, race-safe admin bootstrap
  update public.app_bootstrap
    set admin_granted = true
    where id = true and admin_granted = false
    returning true into v_claimed;
  if coalesce(v_claimed, false) then
    insert into public.user_roles (user_id, role) values (v_uid, 'admin') on conflict do nothing;
  end if;

  insert into public.user_roles (user_id, role) values (v_uid, 'user') on conflict do nothing;
end;
$function$;

-- 4) Restrict privileged routines to signed-in callers only
REVOKE ALL ON FUNCTION public.ensure_profile(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_referral(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_tournament(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_result(uuid, integer, integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_result(uuid, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;