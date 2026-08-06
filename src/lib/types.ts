/** ISO timestamp string coming back from the database. */
export type Ts = string | null;

export type Role = "user" | "admin";

export type GameName = "BGMI" | "Free Fire" | "Valorant" | "Call of Duty";
export const GAMES: GameName[] = ["BGMI", "Free Fire", "Valorant", "Call of Duty"];

export type Category = "Solo" | "Duo" | "Squad";
export const CATEGORIES: Category[] = ["Solo", "Duo", "Squad"];

export type TournamentStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  gameUid: string;
  avatarUrl: string;
  joinedAt: Ts;
  role: Role;
  banned?: boolean;
  referralCode: string;
  referredBy?: string | null;
  notifyMatches?: boolean;
  notifyPromos?: boolean;
  depositBalance: number;
  winBalance: number;
  profileComplete: boolean;
}

export interface Tournament {
  id: string;
  title: string;
  gameName: GameName;
  category: Category;
  bannerUrl: string;
  entryFee: number;
  prizePool: number;
  perKill: number;
  map: string;
  rules: string[];
  totalSlots: number;
  joinedSlots: number;
  startTime: string;
  status: TournamentStatus;
  featured?: boolean;
  createdAt?: Ts;
}

export interface JoinedPlayer {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  playerGameUid: string;
  joinedAt: Ts;
  kills?: number;
  rank?: number;
  points?: number;
}

export interface Room {
  tournamentId: string;
  roomId: string;
  roomPassword: string;
  isUnlocked: boolean;
  unlockTime: Ts;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  matchesPlayed: number;
  wins: number;
  totalKills: number;
  totalPoints: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Ts;
  targetAudience: string; // "all" | tournament id
}

export type AdPlacement = "header" | "home" | "tournament";

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: Ts;
  updatedAt: Ts;
}

export type TxType = "credit" | "debit";
export type WalletKind = "deposit" | "win";

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  wallet: WalletKind;
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: Ts;
}

export type RequestStatus = "pending" | "approved" | "rejected";

export interface MoneyRequest {
  id: string;
  userId: string;
  userName: string;
  kind: "deposit" | "withdrawal";
  amount: number;
  method: string;
  accountRef: string;
  status: RequestStatus;
  createdAt: Ts;
  handledAt?: Ts;
  utr?: string;
  proofUrl?: string;
}

export interface PaymentSettings {
  id: string;
  upiId: string;
  payeeName: string;
  qrUrl: string;
  note: string;
  minDeposit: number;
  maxDeposit: number;
  depositsEnabled: boolean;
}
