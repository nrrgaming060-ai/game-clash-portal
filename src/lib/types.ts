import type { Timestamp } from "firebase/firestore";

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
  joinedAt: Timestamp | null;
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
  startTime: Timestamp;
  status: TournamentStatus;
  featured?: boolean;
  createdAt?: Timestamp;
}

export interface JoinedPlayer {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  playerGameUid: string;
  joinedAt: Timestamp | null;
  kills?: number;
  rank?: number;
  points?: number;
}

export interface Room {
  tournamentId: string;
  roomId: string;
  roomPassword: string;
  isUnlocked: boolean;
  unlockTime: Timestamp | null;
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
  createdAt: Timestamp | null;
  targetAudience: string; // "all" | tournament id
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
  createdAt: Timestamp | null;
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
  createdAt: Timestamp | null;
  handledAt?: Timestamp | null;
}
