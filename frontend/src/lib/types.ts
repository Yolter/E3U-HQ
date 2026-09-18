// Hand-written mirrors of backend/models/schemas.py — keep both sides in sync in one edit.
export type Role = "R1" | "R2" | "R3" | "R4" | "R5";
export type ResourceKey = "cash" | "arms" | "cargo" | "diamonds";
export type Lang = "ru" | "en" | "es" | "tr";
export type MemberStatus = "pending" | "active" | "rejected";
export type Specialization =
  | "bank_manager"
  | "truck_manager"
  | "recruit_officer"
  | "diplomat"
  | "forum_moderator"
  | "event_officer";

export interface UserPublic {
  id: string;
  nickname: string;
  email: string;
  city: string;
  language: Lang;
  role: Role;
  officer_roles: Specialization[];
  title: string;
  status: MemberStatus;
  game_id: string;
  troop_type: string;
  power: number;
  telegram: string;
  whatsapp: string;
  joined_at: string;
  last_active: string;
  contribution: number;
  activity: number;
  truck_count: number;
  warning_count: number;
  online: boolean;
  avatar_seed: string;
}

export interface MyPermissions {
  role: Role;
  officer_roles: Specialization[];
  permissions: string[];
}

export interface Donation {
  id: string;
  player_id: string;
  player_nickname: string;
  resource: ResourceKey;
  amount: number;
  notes: string;
  status: "pending" | "awaiting_second" | "approved" | "rejected";
  approved_by: string | null;
  first_approved_by: string | null;
  second_approved_by: string | null;
  created_at: string;
}

export interface BankSummary {
  totals: Record<string, number>;
  pending_count: number;
  approved_count: number;
  top_contributors: { nickname: string; amount: number }[];
  timeline: { day: string; amount: number }[];
}

export interface Truck {
  id: string;
  title: string;
  scheduled_for: string;
  route: string;
  capacity: number;
  participants: string[];
  participant_names: string[];
  attended: string[];
  completed: boolean;
  created_by: string;
}

export interface TruckStats {
  total: number;
  completed: number;
  upcoming: number;
  attendance_rate: number;
  top_participants: { nickname: string; runs: number }[];
}

export interface ForumCategory {
  slug: string;
  name: string;
  thread_count: number;
}

export interface ForumThread {
  id: string;
  category: string;
  title: string;
  body: string;
  image_url: string;
  pinned: boolean;
  locked: boolean;
  author_id: string;
  author_nickname: string;
  author_role: Role;
  reply_count: number;
  created_at: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  body: string;
  author_id: string;
  author_nickname: string;
  author_role: Role;
  created_at: string;
}

export type EventKind = "governor_battle" | "family_event" | "custom";

export interface ClanEvent {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  kind: EventKind;
  participants: string[];
  participant_names: string[];
  reminder_sent: boolean;
}

export interface ApplicationHistoryEntry {
  at: string;
  by: string;
  role: string;
  status: string;
  notes: string;
}

export interface Application {
  id: string;
  nickname: string;
  game_id: string;
  city: string;
  troop_type: string;
  power: number;
  language: Lang;
  telegram: string;
  whatsapp: string;
  screenshot_url: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  reviewed_by: string | null;
  approved_by: string | null;
  interview_notes: string;
  history: ApplicationHistoryEntry[];
  created_at: string;
}

export type PenaltyKind = "warning" | "fine" | "violation" | "note";

export interface Penalty {
  id: string;
  member_id: string;
  member_nickname: string;
  kind: PenaltyKind;
  reason: string;
  amount: number;
  issued_by: string;
  created_at: string;
}

export type ReportCategory =
  | "complaint"
  | "suggestion"
  | "conflict"
  | "leadership"
  | "trucks"
  | "bank"
  | "other";

export interface Report {
  id: string;
  category: ReportCategory;
  body: string;
  anonymous: boolean;
  author_nickname: string;
  language: Lang;
  status: "open" | "closed";
  reply: string;
  created_at: string;
}

export type Relation = "ally" | "enemy" | "nap" | "neutral";

export interface DiplomacyEntry {
  id: string;
  clan_name: string;
  relation: Relation;
  leader_contact: string;
  notes: string;
  updated_by: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_nickname: string;
  actor_role: string;
  action: string;
  module: string;
  target: string;
  details: string;
  created_at: string;
}

export interface TranslateResponse {
  original: string;
  translated: string;
  target_lang: Lang;
}

export interface AssistantMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CodexEntry {
  id: string;
  section: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
}

export interface CodexResponse {
  sections: string[];
  entries: CodexEntry[];
}

export interface AdminOverview {
  members: number;
  pending_members: number;
  role_counts: Record<Role, number>;
  pending_donations: number;
  trucks: number;
  open_trucks: number;
  threads: number;
  events: number;
  pending_applications: number;
  open_reports: number;
  penalties: number;
  audit_entries: number;
  diplomacy_entries: number;
}
