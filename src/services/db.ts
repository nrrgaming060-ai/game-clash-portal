import { supabase } from "@/integrations/supabase/client";
import type {
  AppNotification,
  Advertisement,
  JoinedPlayer,
  LeaderboardEntry,
  MoneyRequest,
  PaymentSettings,
  Room,
  Tournament,
  Transaction,
  UserProfile,
} from "@/lib/types";

type Row = any;
type Unsub = () => void;

/** Kept for screens that build a start time from a Date. */
export const Timestamp = {
  fromDate: (d: Date) => d.toISOString(),
  now: () => new Date().toISOString(),
};

function err(e: { message: string } | null) {
  if (e) throw new Error(e.message);
}

/** Subscribe to a table and re-run `load()` on every change. */
function live(table: string, load: () => void): Unsub {
  load();
  const channel = supabase
    .channel(`live_${table}_${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/* ---------------------------------- maps ---------------------------------- */

const toProfile = (r: Row): UserProfile => ({
  uid: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  gameUid: r.game_uid,
  avatarUrl: r.avatar_url,
  joinedAt: r.joined_at,
  role: r.role ?? "user",
  banned: r.banned,
  referralCode: r.referral_code,
  referredBy: r.referred_by,
  notifyMatches: r.notify_matches,
  notifyPromos: r.notify_promos,
  depositBalance: r.deposit_balance,
  winBalance: r.win_balance,
  profileComplete: r.profile_complete,
});

const toTournament = (r: Row): Tournament => ({
  id: r.id,
  title: r.title,
  gameName: r.game_name,
  category: r.category,
  bannerUrl: r.banner_url,
  entryFee: r.entry_fee,
  prizePool: r.prize_pool,
  perKill: r.per_kill,
  map: r.map,
  rules: r.rules ?? [],
  totalSlots: r.total_slots,
  joinedSlots: r.joined_slots,
  startTime: r.start_time,
  status: r.status,
  featured: r.featured,
  createdAt: r.created_at,
});

const fromTournament = (t: Partial<Tournament>): Row => {
  const r: Row = {};
  if (t.title !== undefined) r.title = t.title;
  if (t.gameName !== undefined) r.game_name = t.gameName;
  if (t.category !== undefined) r.category = t.category;
  if (t.bannerUrl !== undefined) r.banner_url = t.bannerUrl;
  if (t.entryFee !== undefined) r.entry_fee = t.entryFee;
  if (t.prizePool !== undefined) r.prize_pool = t.prizePool;
  if (t.perKill !== undefined) r.per_kill = t.perKill;
  if (t.map !== undefined) r.map = t.map;
  if (t.rules !== undefined) r.rules = t.rules;
  if (t.totalSlots !== undefined) r.total_slots = t.totalSlots;
  if (t.startTime !== undefined) r.start_time = t.startTime;
  if (t.status !== undefined) r.status = t.status;
  if (t.featured !== undefined) r.featured = t.featured;
  return r;
};

const toJoin = (r: Row): JoinedPlayer => ({
  id: r.id,
  tournamentId: r.tournament_id,
  userId: r.user_id,
  userName: r.user_name,
  playerGameUid: r.player_game_uid,
  joinedAt: r.joined_at,
  kills: r.kills,
  rank: r.rank,
  points: r.points,
});

const toRoom = (r: Row): Room => ({
  tournamentId: r.tournament_id,
  roomId: r.room_id,
  roomPassword: r.room_password,
  isUnlocked: r.is_unlocked,
  unlockTime: r.unlock_time,
});

const toBoard = (r: Row): LeaderboardEntry => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  avatarUrl: r.avatar_url,
  matchesPlayed: r.matches_played,
  wins: r.wins,
  totalKills: r.total_kills,
  totalPoints: r.total_points,
});

const toTx = (r: Row): Transaction => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  wallet: r.wallet,
  amount: r.amount,
  balanceAfter: r.balance_after,
  note: r.note,
  createdAt: r.created_at,
});

const toRequest = (r: Row): MoneyRequest => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  kind: r.kind,
  amount: r.amount,
  method: r.method,
  accountRef: r.account_ref,
  status: r.status,
  createdAt: r.created_at,
  handledAt: r.handled_at,
  utr: r.utr ?? "",
  proofUrl: r.proof_url ?? "",
});

const toNotification = (r: Row): AppNotification => ({
  id: r.id,
  title: r.title,
  message: r.message,
  createdAt: r.created_at,
  targetAudience: r.target_audience,
});

const toAdvertisement = (r: Row): Advertisement => ({
  id: r.id,
  title: r.title,
  imageUrl: r.image_url,
  linkUrl: r.link_url,
  placement: r.placement,
  startDate: r.start_date,
  endDate: r.end_date,
  active: r.active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/* ---------------------------------- users --------------------------------- */

export async function isAdmin(uid: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  return Boolean(data);
}

export function watchProfile(uid: string, cb: (p: UserProfile | null) => void): Unsub {
  return live("profiles", async () => {
    const [{ data }, admin] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      isAdmin(uid),
    ]);
    cb(data ? toProfile({ ...data, role: admin ? "admin" : "user" }) : null);
  });
}

export async function createProfileIfMissing(
  _uid: string,
  seed: { name: string; email: string; avatarUrl?: string },
) {
  const { error } = await supabase.rpc("ensure_profile", {
    p_name: seed.name,
    p_email: seed.email,
    p_avatar: seed.avatarUrl ?? "",
  });
  err(error);
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>) {
  if (patch.role !== undefined) {
    const { error } = await supabase.rpc("set_user_role", {
      p_user_id: uid,
      p_admin: patch.role === "admin",
    });
    err(error);
  }
  const row: Row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.gameUid !== undefined) row.game_uid = patch.gameUid;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.banned !== undefined) row.banned = patch.banned;
  if (patch.notifyMatches !== undefined) row.notify_matches = patch.notifyMatches;
  if (patch.notifyPromos !== undefined) row.notify_promos = patch.notifyPromos;
  if (patch.profileComplete !== undefined) row.profile_complete = patch.profileComplete;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("profiles").update(row).eq("id", uid);
  err(error);
}

export async function listUsers(): Promise<UserProfile[]> {
  const [{ data, error }, admins] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_user_ids"),
  ]);
  err(error);
  const adminIds = new Set(((admins.data ?? []) as Row[]).map((a) => a.user_id));
  return ((data ?? []) as Row[]).map((r) =>
    toProfile({ ...r, role: adminIds.has(r.id) ? "admin" : "user" }),
  );
}

export async function applyReferral(_uid: string, code: string) {
  const { error } = await supabase.rpc("apply_referral", { p_code: code });
  err(error);
}

/* ------------------------------- tournaments ------------------------------ */

export function watchTournaments(
  cb: (t: Tournament[]) => void,
  onError?: (e: Error) => void,
): Unsub {
  return live("tournaments", async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_time", { ascending: true });
    if (error) return onError?.(new Error(error.message));
    cb((data ?? []).map(toTournament));
  });
}

export function watchTournament(id: string, cb: (t: Tournament | null) => void): Unsub {
  return live("tournaments", async () => {
    const { data } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
    cb(data ? toTournament(data) : null);
  });
}

export async function createTournament(data: Omit<Tournament, "id" | "joinedSlots">) {
  const { data: row, error } = await supabase
    .from("tournaments")
    .insert(fromTournament(data) as never)
    .select("id")
    .single();
  err(error);
  return (row as Row).id as string;
}

export async function updateTournament(id: string, patch: Partial<Tournament>) {
  const { error } = await supabase
    .from("tournaments")
    .update(fromTournament(patch) as never)
    .eq("id", id);
  err(error);
}

export async function deleteTournament(id: string) {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  err(error);
}

/* --------------------------------- joining -------------------------------- */

export function watchMyJoins(uid: string, cb: (j: JoinedPlayer[]) => void): Unsub {
  return live("joined_players", async () => {
    const { data } = await supabase.from("joined_players").select("*").eq("user_id", uid);
    cb((data ?? []).map(toJoin));
  });
}

export function watchTournamentPlayers(tid: string, cb: (j: JoinedPlayer[]) => void): Unsub {
  return live("joined_players", async () => {
    const { data } = await supabase.from("joined_players").select("*").eq("tournament_id", tid);
    cb((data ?? []).map(toJoin));
  });
}

/** Atomic join: checks slots, blocks duplicates and debits the wallet server-side. */
export async function joinTournament(params: {
  tournament: Tournament;
  user: UserProfile;
}): Promise<void> {
  const { error } = await supabase.rpc("join_tournament", {
    p_tournament_id: params.tournament.id,
  });
  err(error);
}

/* ---------------------------------- rooms --------------------------------- */

export function watchRoom(tid: string, cb: (r: Room | null) => void, onError?: () => void): Unsub {
  return live("rooms", async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("tournament_id", tid)
      .maybeSingle();
    if (error) return onError?.();
    cb(data ? toRoom(data) : null);
  });
}

export async function saveRoom(tid: string, data: Omit<Room, "tournamentId">) {
  const { error } = await supabase.from("rooms").upsert(
    {
      tournament_id: tid,
      room_id: data.roomId,
      room_password: data.roomPassword,
      is_unlocked: data.isUnlocked,
      unlock_time: data.unlockTime,
    } as never,
    { onConflict: "tournament_id" },
  );
  err(error);
}

/* ------------------------------- leaderboard ------------------------------ */

export function watchLeaderboard(cb: (l: LeaderboardEntry[]) => void): Unsub {
  return live("leaderboards", async () => {
    const { data } = await supabase
      .from("leaderboards")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(100);
    cb((data ?? []).map(toBoard));
  });
}

export async function submitResult(params: {
  tournamentId: string;
  join: JoinedPlayer;
  kills: number;
  rank: number;
  points: number;
  prize: number;
}) {
  const { error } = await supabase.rpc("submit_result", {
    p_join_id: params.join.id,
    p_kills: params.kills,
    p_rank: params.rank,
    p_points: params.points,
    p_prize: params.prize,
  });
  err(error);
}

/* --------------------------------- wallet --------------------------------- */

export function watchTransactions(uid: string, cb: (t: Transaction[]) => void): Unsub {
  return live("transactions", async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    cb((data ?? []).map(toTx));
  });
}

export async function createMoneyRequest(data: Omit<MoneyRequest, "id" | "status" | "createdAt">) {
  const { error } = await supabase.from("money_requests").insert({
    user_id: data.userId,
    user_name: data.userName,
    kind: data.kind,
    amount: data.amount,
    method: data.method,
    account_ref: data.accountRef,
    utr: data.utr ?? "",
    proof_url: data.proofUrl ?? "",
    status: "pending",
  } as never);
  err(error);
}

export function watchMyRequests(uid: string, cb: (r: MoneyRequest[]) => void): Unsub {
  return live("money_requests", async () => {
    const { data } = await supabase
      .from("money_requests")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    cb((data ?? []).map(toRequest));
  });
}

export function watchAllRequests(cb: (r: MoneyRequest[]) => void): Unsub {
  return live("money_requests", async () => {
    const { data } = await supabase
      .from("money_requests")
      .select("*")
      .order("created_at", { ascending: false });
    cb((data ?? []).map(toRequest));
  });
}

export async function resolveRequest(req: MoneyRequest, approve: boolean) {
  const { error } = await supabase.rpc("resolve_request", {
    p_request_id: req.id,
    p_approve: approve,
  });
  err(error);
}

/* ------------------------------ notifications ----------------------------- */

export function watchNotifications(cb: (n: AppNotification[]) => void): Unsub {
  return live("notifications", async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    cb((data ?? []).map(toNotification));
  });
}

export async function broadcast(data: Omit<AppNotification, "id" | "createdAt">) {
  const { error } = await supabase.from("notifications").insert({
    title: data.title,
    message: data.message,
    target_audience: data.targetAudience,
  } as never);
  err(error);
}

/* ----------------------------- advertisements ---------------------------- */

export function watchAdvertisements(cb: (ads: Advertisement[]) => void): Unsub {
  return live("advertisements", async () => {
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return cb([]);
    cb((data ?? []).map(toAdvertisement));
  });
}

type AdvertisementInput = Omit<Advertisement, "id" | "createdAt" | "updatedAt">;

function fromAdvertisement(ad: AdvertisementInput): Row {
  return {
    title: ad.title,
    image_url: ad.imageUrl,
    link_url: ad.linkUrl,
    placement: ad.placement,
    start_date: ad.startDate || null,
    end_date: ad.endDate || null,
    active: ad.active,
  };
}

export async function createAdvertisement(ad: AdvertisementInput) {
  const { error } = await supabase.from("advertisements").insert(fromAdvertisement(ad) as never);
  err(error);
}

export async function updateAdvertisement(id: string, ad: AdvertisementInput) {
  const { error } = await supabase
    .from("advertisements")
    .update(fromAdvertisement(ad) as never)
    .eq("id", id);
  err(error);
}

export async function deleteAdvertisement(id: string) {
  const { error } = await supabase.from("advertisements").delete().eq("id", id);
  err(error);
}

/* ---------------------------- payment settings ---------------------------- */

const toPaymentSettings = (r: Row): PaymentSettings => ({
  id: r.id,
  upiId: r.upi_id ?? "",
  payeeName: r.payee_name ?? "",
  qrUrl: r.qr_url ?? "",
  note: r.note ?? "",
  minDeposit: r.min_deposit ?? 10,
  maxDeposit: r.max_deposit ?? 100000,
  depositsEnabled: r.deposits_enabled ?? true,
});

export function watchPaymentSettings(cb: (s: PaymentSettings | null) => void): Unsub {
  return live("payment_settings", async () => {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error || !data) return cb(null);
    cb(toPaymentSettings(data));
  });
}

export async function savePaymentSettings(s: Omit<PaymentSettings, "id"> & { id?: string }) {
  const payload = {
    upi_id: s.upiId,
    payee_name: s.payeeName,
    qr_url: s.qrUrl,
    note: s.note,
    min_deposit: s.minDeposit,
    max_deposit: s.maxDeposit,
    deposits_enabled: s.depositsEnabled,
  };
  if (s.id) {
    const { error } = await supabase
      .from("payment_settings")
      .update(payload as never)
      .eq("id", s.id);
    err(error);
    return;
  }
  const { error } = await supabase
    .from("payment_settings")
    .insert({ ...payload, singleton: true } as never);
  err(error);
}

/** Builds a UPI deep link that opens GPay / PhonePe / Paytm with amount prefilled. */
export function upiDeepLink(s: PaymentSettings, amount: number, note = "ClashArena deposit") {
  const params = new URLSearchParams({
    pa: s.upiId,
    pn: s.payeeName || "ClashArena",
    cu: "INR",
    tn: note,
  });
  if (amount > 0) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}
