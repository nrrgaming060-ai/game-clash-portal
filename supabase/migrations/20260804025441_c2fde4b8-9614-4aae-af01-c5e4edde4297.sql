-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- PROFILES ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player',
  email text not null default '',
  phone text not null default '',
  game_uid text not null default '',
  avatar_url text not null default '',
  joined_at timestamptz not null default now(),
  banned boolean not null default false,
  referral_code text not null unique,
  referred_by uuid,
  notify_matches boolean not null default true,
  notify_promos boolean not null default true,
  deposit_balance integer not null default 0,
  win_balance integer not null default 0,
  profile_complete boolean not null default false
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- TOURNAMENTS ---------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_name text not null default 'BGMI',
  category text not null default 'Solo',
  banner_url text not null default '',
  entry_fee integer not null default 0,
  prize_pool integer not null default 0,
  per_kill integer not null default 0,
  map text not null default '',
  rules text[] not null default '{}',
  total_slots integer not null default 100,
  joined_slots integer not null default 0,
  start_time timestamptz not null default now(),
  status text not null default 'UPCOMING',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.tournaments to anon, authenticated;
grant insert, update, delete on public.tournaments to authenticated;
grant all on public.tournaments to service_role;
alter table public.tournaments enable row level security;
create policy "tournaments public read" on public.tournaments for select to anon, authenticated using (true);
create policy "tournaments admin write" on public.tournaments for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- JOINED PLAYERS ------------------------------------------------------
create table public.joined_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null default '',
  player_game_uid text not null default '',
  joined_at timestamptz not null default now(),
  kills integer not null default 0,
  rank integer not null default 0,
  points integer not null default 0,
  unique (tournament_id, user_id)
);
grant select on public.joined_players to anon, authenticated;
grant update, delete on public.joined_players to authenticated;
grant all on public.joined_players to service_role;
alter table public.joined_players enable row level security;
create policy "joins public read" on public.joined_players for select to anon, authenticated using (true);
create policy "joins admin write" on public.joined_players for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ROOMS ---------------------------------------------------------------
create table public.rooms (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  room_id text not null default '',
  room_password text not null default '',
  is_unlocked boolean not null default false,
  unlock_time timestamptz
);
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "rooms joined read" on public.rooms for select to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or (is_unlocked and exists (
      select 1 from public.joined_players jp
      where jp.tournament_id = rooms.tournament_id and jp.user_id = auth.uid()
    ))
  );
create policy "rooms admin write" on public.rooms for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- LEADERBOARDS --------------------------------------------------------
create table public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  user_name text not null default '',
  avatar_url text not null default '',
  matches_played integer not null default 0,
  wins integer not null default 0,
  total_kills integer not null default 0,
  total_points integer not null default 0
);
grant select on public.leaderboards to anon, authenticated;
grant all on public.leaderboards to service_role;
alter table public.leaderboards enable row level security;
create policy "leaderboard public read" on public.leaderboards for select to anon, authenticated using (true);

-- NOTIFICATIONS -------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null default '',
  target_audience text not null default 'all',
  created_at timestamptz not null default now()
);
grant select on public.notifications to anon, authenticated;
grant insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications public read" on public.notifications for select to anon, authenticated using (true);
create policy "notifications admin write" on public.notifications for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- TRANSACTIONS --------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  wallet text not null,
  amount integer not null default 0,
  balance_after integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- MONEY REQUESTS ------------------------------------------------------
create table public.money_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null default '',
  kind text not null,
  amount integer not null default 0,
  method text not null default '',
  account_ref text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
grant select, insert on public.money_requests to authenticated;
grant update on public.money_requests to authenticated;
grant all on public.money_requests to service_role;
alter table public.money_requests enable row level security;
create policy "own requests read" on public.money_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own requests insert" on public.money_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "admin requests update" on public.money_requests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- FUNCTIONS -----------------------------------------------------------
create or replace function public.ensure_profile(p_name text, p_email text, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    v_code := lower(regexp_replace(coalesce(nullif(p_name,''),'player'),'[^a-zA-Z0-9]','','g'));
    v_code := left(coalesce(nullif(v_code,''),'player'), 8) || floor(random()*900+100)::text;
    insert into public.profiles (id, name, email, avatar_url, referral_code)
    values (v_uid, coalesce(nullif(p_name,''),'Player'), coalesce(p_email,''), coalesce(p_avatar,''), v_code)
    on conflict (id) do nothing;
  end if;

  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role) values (v_uid, 'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (v_uid, 'user') on conflict do nothing;
end;
$$;

create or replace function public.apply_referral(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
  v_bal integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_ref from public.profiles where referral_code = p_code;
  if v_ref is null then raise exception 'Referral code not found'; end if;
  if v_ref = v_uid then raise exception 'You cannot use your own code'; end if;
  if exists (select 1 from public.profiles where id = v_uid and referred_by is not null) then
    raise exception 'Referral already applied';
  end if;

  update public.profiles set referred_by = v_ref, deposit_balance = deposit_balance + 5
    where id = v_uid returning deposit_balance into v_bal;
  insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
    values (v_uid, 'credit', 'deposit', 5, v_bal, 'Referral bonus');

  update public.profiles set deposit_balance = deposit_balance + 5
    where id = v_ref returning deposit_balance into v_bal;
  insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
    values (v_ref, 'credit', 'deposit', 5, v_bal, 'Referral bonus');
end;
$$;

create or replace function public.join_tournament(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  t public.tournaments%rowtype;
  p public.profiles%rowtype;
  v_fee integer;
  v_from_deposit integer;
  v_from_win integer;
  v_total integer;
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

  update public.profiles
    set deposit_balance = deposit_balance - v_from_deposit,
        win_balance = win_balance - v_from_win
    where id = v_uid;
  update public.tournaments set joined_slots = joined_slots + 1 where id = p_tournament_id;
  insert into public.joined_players (tournament_id, user_id, user_name, player_game_uid)
    values (p_tournament_id, v_uid, p.name, p.game_uid);

  if v_fee > 0 then
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (v_uid, 'debit', case when v_from_win > 0 then 'win' else 'deposit' end,
              v_fee, v_total - v_fee, 'Entry fee — ' || t.title);
  end if;
end;
$$;

create or replace function public.resolve_request(p_request_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.money_requests%rowtype;
  p public.profiles%rowtype;
  v_bal integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select * into r from public.money_requests where id = p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'Request already handled'; end if;
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
$$;

create or replace function public.submit_result(
  p_join_id uuid, p_kills integer, p_rank integer, p_points integer, p_prize integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  j public.joined_players%rowtype;
  v_bal integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select * into j from public.joined_players where id = p_join_id;
  if not found then raise exception 'Player entry not found'; end if;

  update public.joined_players set kills = p_kills, rank = p_rank, points = p_points where id = p_join_id;

  insert into public.leaderboards (user_id, user_name, matches_played, wins, total_kills, total_points)
    values (j.user_id, j.user_name, 1, case when p_rank = 1 then 1 else 0 end, p_kills, p_points)
  on conflict (user_id) do update set
    user_name = excluded.user_name,
    matches_played = public.leaderboards.matches_played + 1,
    wins = public.leaderboards.wins + excluded.wins,
    total_kills = public.leaderboards.total_kills + excluded.total_kills,
    total_points = public.leaderboards.total_points + excluded.total_points;

  if p_prize > 0 then
    update public.profiles set win_balance = win_balance + p_prize
      where id = j.user_id returning win_balance into v_bal;
    insert into public.transactions (user_id, type, wallet, amount, balance_after, note)
      values (j.user_id, 'credit', 'win', p_prize, v_bal, 'Prize payout');
  end if;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if p_admin then
    insert into public.user_roles (user_id, role) values (p_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end;
$$;

create or replace function public.admin_list_users()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles
  where public.has_role(auth.uid(),'admin')
  order by joined_at desc
$$;

create or replace function public.admin_user_ids()
returns table(user_id uuid) language sql stable security definer set search_path = public as $$
  select ur.user_id from public.user_roles ur
  where ur.role = 'admin' and public.has_role(auth.uid(),'admin')
$$;

-- REALTIME ------------------------------------------------------------
alter table public.profiles replica identity full;
alter table public.tournaments replica identity full;
alter table public.joined_players replica identity full;
alter table public.rooms replica identity full;
alter table public.leaderboards replica identity full;
alter table public.notifications replica identity full;
alter table public.transactions replica identity full;
alter table public.money_requests replica identity full;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.joined_players;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.leaderboards;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.money_requests;