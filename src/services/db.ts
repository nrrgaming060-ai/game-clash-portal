import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type {
  AppNotification,
  JoinedPlayer,
  LeaderboardEntry,
  MoneyRequest,
  Room,
  Tournament,
  Transaction,
  UserProfile,
} from "@/lib/types";

const map = <T,>(d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as T;

/* ---------------------------------- users --------------------------------- */

export function watchProfile(uid: string, cb: (p: UserProfile | null) => void) {
  return onSnapshot(doc(getDb(), "users", uid), (snap) =>
    cb(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null),
  );
}

export async function createProfileIfMissing(
  uid: string,
  seed: { name: string; email: string; avatarUrl?: string },
) {
  const ref = doc(getDb(), "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    name: seed.name,
    email: seed.email,
    phone: "",
    gameUid: "",
    avatarUrl: seed.avatarUrl ?? "",
    joinedAt: serverTimestamp(),
    role: "user",
    banned: false,
    referralCode: `${(seed.name || "player").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "player"}${Math.floor(Math.random() * 900 + 100)}`,
    referredBy: null,
    notifyMatches: true,
    notifyPromos: true,
    depositBalance: 0,
    winBalance: 0,
    profileComplete: false,
  });
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>) {
  await updateDoc(doc(getDb(), "users", uid), patch as Record<string, unknown>);
}

export async function listUsers() {
  const snap = await getDocs(query(collection(getDb(), "users"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function applyReferral(uid: string, code: string) {
  const db = getDb();
  const found = await getDocs(
    query(collection(db, "users"), where("referralCode", "==", code), limit(1)),
  );
  if (found.empty) throw new Error("Referral code not found");
  const referrer = found.docs[0]!;
  if (referrer.id === uid) throw new Error("You cannot use your own code");
  await updateDoc(doc(db, "users", uid), { referredBy: referrer.id, depositBalance: increment(5) });
  await updateDoc(doc(db, "users", referrer.id), { depositBalance: increment(5) });
  await addTx(uid, { type: "credit", wallet: "deposit", amount: 5, note: "Referral bonus" });
  await addTx(referrer.id, {
    type: "credit",
    wallet: "deposit",
    amount: 5,
    note: "Referral bonus",
  });
}

/* ------------------------------- tournaments ------------------------------ */

export function watchTournaments(cb: (t: Tournament[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(collection(getDb(), "tournaments"), orderBy("startTime", "asc")),
    (snap) => cb(snap.docs.map((d) => map<Tournament>(d))),
    (e) => onError?.(e),
  );
}

export function watchTournament(id: string, cb: (t: Tournament | null) => void) {
  return onSnapshot(doc(getDb(), "tournaments", id), (s) =>
    cb(s.exists() ? ({ id: s.id, ...s.data() } as Tournament) : null),
  );
}

export async function createTournament(data: Omit<Tournament, "id" | "joinedSlots">) {
  const ref = await addDoc(collection(getDb(), "tournaments"), {
    ...data,
    joinedSlots: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTournament(id: string, patch: Partial<Tournament>) {
  await updateDoc(doc(getDb(), "tournaments", id), patch as Record<string, unknown>);
}

export async function deleteTournament(id: string) {
  await deleteDoc(doc(getDb(), "tournaments", id));
}

/* --------------------------------- joining -------------------------------- */

export function watchMyJoins(uid: string, cb: (j: JoinedPlayer[]) => void) {
  return onSnapshot(
    query(collection(getDb(), "joined_players"), where("userId", "==", uid)),
    (snap) => cb(snap.docs.map((d) => map<JoinedPlayer>(d))),
  );
}

export function watchTournamentPlayers(tid: string, cb: (j: JoinedPlayer[]) => void) {
  return onSnapshot(
    query(collection(getDb(), "joined_players"), where("tournamentId", "==", tid)),
    (snap) => cb(snap.docs.map((d) => map<JoinedPlayer>(d))),
  );
}

/**
 * Atomic join: blocks duplicates, checks slots, debits the wallet
 * (deposit balance first, then winnings) and increments joinedSlots.
 */
export async function joinTournament(params: {
  tournament: Tournament;
  user: UserProfile;
}): Promise<void> {
  const db = getDb();
  const { tournament, user } = params;
  const joinId = `${tournament.id}_${user.uid}`;
  const joinRef = doc(db, "joined_players", joinId);
  const tRef = doc(db, "tournaments", tournament.id);
  const uRef = doc(db, "users", user.uid);

  await runTransaction(db, async (tx) => {
    const [joinSnap, tSnap, uSnap] = await Promise.all([
      tx.get(joinRef),
      tx.get(tRef),
      tx.get(uRef),
    ]);
    if (joinSnap.exists()) throw new Error("You have already joined this tournament");
    if (!tSnap.exists()) throw new Error("Tournament no longer exists");
    const t = tSnap.data() as Tournament;
    if (t.status === "COMPLETED" || t.status === "CANCELLED")
      throw new Error("Registration is closed for this match");
    if ((t.joinedSlots ?? 0) >= t.totalSlots) throw new Error("All slots are full");

    const u = uSnap.data() as UserProfile;
    if (u.banned) throw new Error("Your account is suspended");
    const fee = t.entryFee ?? 0;
    const total = (u.depositBalance ?? 0) + (u.winBalance ?? 0);
    if (total < fee) throw new Error("Insufficient wallet balance. Add funds to join.");

    const fromDeposit = Math.min(u.depositBalance ?? 0, fee);
    const fromWin = fee - fromDeposit;

    tx.update(uRef, {
      depositBalance: (u.depositBalance ?? 0) - fromDeposit,
      winBalance: (u.winBalance ?? 0) - fromWin,
    });
    tx.update(tRef, { joinedSlots: increment(1) });
    tx.set(joinRef, {
      tournamentId: tournament.id,
      userId: user.uid,
      userName: user.name,
      playerGameUid: user.gameUid,
      joinedAt: serverTimestamp(),
      kills: 0,
      rank: 0,
      points: 0,
    });
    if (fee > 0) {
      tx.set(doc(collection(db, "transactions")), {
        userId: user.uid,
        type: "debit",
        wallet: fromDeposit >= fee ? "deposit" : "win",
        amount: fee,
        balanceAfter: total - fee,
        note: `Entry fee — ${t.title}`,
        createdAt: serverTimestamp(),
      });
    }
  });
}

/* ---------------------------------- rooms --------------------------------- */

export function watchRoom(tid: string, cb: (r: Room | null) => void, onError?: () => void) {
  return onSnapshot(
    doc(getDb(), "rooms", tid),
    (s) => cb(s.exists() ? ({ tournamentId: s.id, ...s.data() } as Room) : null),
    () => onError?.(),
  );
}

export async function saveRoom(tid: string, data: Omit<Room, "tournamentId">) {
  await setDoc(doc(getDb(), "rooms", tid), data, { merge: true });
}

/* ------------------------------- leaderboard ------------------------------ */

export function watchLeaderboard(cb: (l: LeaderboardEntry[]) => void) {
  return onSnapshot(
    query(collection(getDb(), "leaderboards"), orderBy("totalPoints", "desc"), limit(100)),
    (snap) => cb(snap.docs.map((d) => map<LeaderboardEntry>(d))),
  );
}

export async function submitResult(params: {
  tournamentId: string;
  join: JoinedPlayer;
  kills: number;
  rank: number;
  points: number;
  prize: number;
}) {
  const db = getDb();
  const { join, kills, rank, points, prize, tournamentId } = params;
  await updateDoc(doc(db, "joined_players", join.id), { kills, rank, points });

  const lbRef = doc(db, "leaderboards", join.userId);
  const lbSnap = await getDoc(lbRef);
  const prev = lbSnap.exists() ? (lbSnap.data() as LeaderboardEntry) : null;
  await setDoc(
    lbRef,
    {
      userId: join.userId,
      userName: join.userName,
      matchesPlayed: (prev?.matchesPlayed ?? 0) + 1,
      wins: (prev?.wins ?? 0) + (rank === 1 ? 1 : 0),
      totalKills: (prev?.totalKills ?? 0) + kills,
      totalPoints: (prev?.totalPoints ?? 0) + points,
    },
    { merge: true },
  );

  if (prize > 0) {
    const uRef = doc(db, "users", join.userId);
    const uSnap = await getDoc(uRef);
    const u = uSnap.data() as UserProfile | undefined;
    await updateDoc(uRef, { winBalance: increment(prize) });
    await addTx(join.userId, {
      type: "credit",
      wallet: "win",
      amount: prize,
      note: `Prize payout — match ${tournamentId.slice(0, 6)}`,
      balanceAfter: (u?.winBalance ?? 0) + prize,
    });
  }
}

/* --------------------------------- wallet --------------------------------- */

export function watchTransactions(uid: string, cb: (t: Transaction[]) => void) {
  return onSnapshot(
    query(collection(getDb(), "transactions"), where("userId", "==", uid)),
    (snap) =>
      cb(
        snap.docs
          .map((d) => map<Transaction>(d))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
      ),
  );
}

export async function addTx(
  uid: string,
  data: Omit<Transaction, "id" | "userId" | "createdAt" | "balanceAfter"> & {
    balanceAfter?: number;
  },
) {
  await addDoc(collection(getDb(), "transactions"), {
    userId: uid,
    balanceAfter: 0,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function createMoneyRequest(
  data: Omit<MoneyRequest, "id" | "status" | "createdAt">,
) {
  await addDoc(collection(getDb(), "money_requests"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function watchMyRequests(uid: string, cb: (r: MoneyRequest[]) => void) {
  return onSnapshot(
    query(collection(getDb(), "money_requests"), where("userId", "==", uid)),
    (snap) =>
      cb(
        snap.docs
          .map((d) => map<MoneyRequest>(d))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
      ),
  );
}

export function watchAllRequests(cb: (r: MoneyRequest[]) => void) {
  return onSnapshot(query(collection(getDb(), "money_requests")), (snap) =>
    cb(
      snap.docs
        .map((d) => map<MoneyRequest>(d))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
    ),
  );
}

export async function resolveRequest(req: MoneyRequest, approve: boolean) {
  const db = getDb();
  await runTransaction(db, async (tx) => {
    const reqRef = doc(db, "money_requests", req.id);
    const uRef = doc(db, "users", req.userId);
    const [reqSnap, uSnap] = await Promise.all([tx.get(reqRef), tx.get(uRef)]);
    if (!reqSnap.exists() || (reqSnap.data() as MoneyRequest).status !== "pending")
      throw new Error("Request already handled");
    const u = uSnap.data() as UserProfile;

    if (approve) {
      if (req.kind === "deposit") {
        tx.update(uRef, { depositBalance: (u.depositBalance ?? 0) + req.amount });
        tx.set(doc(collection(db, "transactions")), {
          userId: req.userId,
          type: "credit",
          wallet: "deposit",
          amount: req.amount,
          balanceAfter: (u.depositBalance ?? 0) + req.amount,
          note: `Deposit approved (${req.method})`,
          createdAt: serverTimestamp(),
        });
      } else {
        if ((u.winBalance ?? 0) < req.amount) throw new Error("User has insufficient winnings");
        tx.update(uRef, { winBalance: (u.winBalance ?? 0) - req.amount });
        tx.set(doc(collection(db, "transactions")), {
          userId: req.userId,
          type: "debit",
          wallet: "win",
          amount: req.amount,
          balanceAfter: (u.winBalance ?? 0) - req.amount,
          note: `Withdrawal paid to ${req.accountRef}`,
          createdAt: serverTimestamp(),
        });
      }
    }
    tx.update(reqRef, {
      status: approve ? "approved" : "rejected",
      handledAt: serverTimestamp(),
    });
  });
}

/* ------------------------------ notifications ----------------------------- */

export function watchNotifications(cb: (n: AppNotification[]) => void) {
  return onSnapshot(query(collection(getDb(), "notifications")), (snap) =>
    cb(
      snap.docs
        .map((d) => map<AppNotification>(d))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
    ),
  );
}

export async function broadcast(data: Omit<AppNotification, "id" | "createdAt">) {
  await addDoc(collection(getDb(), "notifications"), { ...data, createdAt: serverTimestamp() });
}

export { Timestamp };
