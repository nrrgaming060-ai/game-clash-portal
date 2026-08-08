-- 1. In-game name on profiles and joined entries
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS game_name text NOT NULL DEFAULT '';
ALTER TABLE public.joined_players ADD COLUMN IF NOT EXISTS player_game_name text NOT NULL DEFAULT '';

-- 2. Tighten joined_players reads: own rows or admin only
DROP POLICY IF EXISTS "joins public read" ON public.joined_players;
CREATE POLICY "joins own or admin read" ON public.joined_players
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. Categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.categories (name, sort_order) VALUES ('Solo', 1), ('Duo', 2), ('Squad', 3)
ON CONFLICT (name) DO NOTHING;

-- 4. Guard trigger: allow updates from trusted security-definer routines only
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.trusted_profile_update', true) = 'on' then
    return new;
  end if;
  if public.has_role(auth.uid(),'admin') then
    return new;
  end if;
  new.deposit_balance := old.deposit_balance;
  new.win_balance := old.win_balance;
  new.banned := old.banned;
  new.referred_by := old.referred_by;
  new.referral_code := old.referral_code;
  return new;
end;
$function$;

-- 5. Referral: link only, no signup credit
CREATE OR REPLACE FUNCTION public.apply_referral(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_ref from public.profiles where referral_code = p_code;
  if v_ref is null then raise exception 'Referral code not found'; end if;
  if v_ref = v_uid then raise exception 'You cannot use your own code'; end if;
  if exists (select 1 from public.profiles where id = v_uid and referred_by is not null) then
    raise exception 'Referral already applied';
  end if;
  perform set_config('app.trusted_profile_update', 'on', true);
  update public.profiles set referred_by = v_ref where id = v_uid;
end;
$function$;

-- 6. Join: trusted balance debit + in-game name copy + first-join referral bonus
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  t public.tournaments%rowtype;
  p public.profiles%rowtype;
  v_fee integer;
  v_from_deposit integer;
  v_from_win integer;
  v_total integer;
  v_first_join boolean;
  v_bal integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournament no longer exists'; end if;
  select * into p from public.profiles where id = v_uid for update;
  if not found then raise exception 'Complete your profile first'; end if;
  if p.banned then raise exception 'Your account is suspended'; end if;
  if exists (select 1 from public.joined_players where tournament_id = p_tournament_id and user_id = v_uid)
    then raise exception 'You have already joined this tournament'; end if;
  if t.status in ('COMPLETED','CANCELLED') then raise exception 'Registration is closed for this match'; end if;
  if t.joined_slots >= t.total_slots then raise exception 'All slots are full'; end if;

  v_fee := t.entry_fee;
  v_total := p.deposit_balance + p.win_balance;
  if v_total < v_fee then raise exception 'Insufficient wallet balance. Add funds to join.'; end if;

  v_from_deposit := least(p.deposit_balance, v_fee);
  v_from_win := v_fee - v_from_deposit;
  v_first_join := not exists (select 1 from public.joined_players where user_id = v_uid);

  perform set_config('app.trusted_profile_update', 'on', true);

  update public.profiles
    set deposit_balance = deposit_balance - v_from_deposit,
        win_balance = win_balance - v_from_win
    where id = v_uid;
  update public.tournaments set joined_slots = joined_slots + 1 where id = p_tournament_id;
  insert into public.joined_players (tournament_id, user_id, user_name, player_game_uid, player_game_name)
    values (p_tournament_id, v_uid, p.name, p.game_uid, p.game_name);

  if v_fee > 0 then
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (v_uid, 'debit', case when v_from_win > 0 then 'win' else 'deposit' end,
              v_fee, v_total - v_fee, 'Entry fee — ' || t.title);
  end if;

  -- Referral bonus: friend's first ever match join pays both sides ₹5
  if v_first_join and p.referred_by is not null then
    update public.profiles set deposit_balance = deposit_balance + 5
      where id = v_uid returning deposit_balance into v_bal;
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (v_uid, 'credit', 'deposit', 5, v_bal, 'Referral bonus — first match joined');

    update public.profiles set deposit_balance = deposit_balance + 5
      where id = p.referred_by returning deposit_balance into v_bal;
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (p.referred_by, 'credit', 'deposit', 5, v_bal, 'Referral bonus — friend joined a match');
  end if;
end;
$function$;