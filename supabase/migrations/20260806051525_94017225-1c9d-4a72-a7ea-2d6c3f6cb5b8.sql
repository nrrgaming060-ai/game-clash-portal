
create table public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  upi_id text not null default '',
  payee_name text not null default '',
  qr_url text not null default '',
  note text not null default '',
  min_deposit integer not null default 10,
  max_deposit integer not null default 100000,
  deposits_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.payment_settings to anon;
grant select, insert, update on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;

alter table public.payment_settings enable row level security;

create policy "payment settings public read" on public.payment_settings
  for select to anon, authenticated using (true);
create policy "payment settings admin insert" on public.payment_settings
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "payment settings admin update" on public.payment_settings
  for update to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger set_payment_settings_updated_at
  before update on public.payment_settings
  for each row execute function public.set_advertisements_updated_at();

insert into public.payment_settings (singleton) values (true);

alter table public.money_requests
  add column if not exists utr text not null default '',
  add column if not exists proof_url text not null default '';

create unique index if not exists money_requests_utr_unique
  on public.money_requests (utr) where kind = 'deposit' and utr <> '';

-- security: prevent users from editing their own balances / ban status
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

create trigger guard_profile_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();
