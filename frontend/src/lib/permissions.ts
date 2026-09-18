/** Mirror of backend/lib/auth.py. Frontend gating must match the server exactly. */
import type { Role, Specialization, UserPublic } from "@/lib/types";

export const ROLE_RANK: Record<Role, number> = { R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 };

export const SPECIALIZATIONS: Record<Specialization, string[]> = {
  bank_manager: ["bank.approve", "bank.report", "bank.export"],
  truck_manager: ["trucks.manage", "trucks.attendance", "trucks.report"],
  recruit_officer: ["recruit.review", "recruit.interview"],
  diplomat: ["diplomacy.view", "diplomacy.manage"],
  forum_moderator: ["forum.moderate", "forum.pin"],
  event_officer: ["events.manage", "events.remind"],
};

export const SPECIALIZATION_KEYS = Object.keys(SPECIALIZATIONS) as Specialization[];

export const PERMISSIONS: Record<string, number> = {
  "bank.view": 1,
  "bank.donate": 1,
  "trucks.view": 1,
  "trucks.join": 1,
  "forum.view": 1,
  "forum.post": 1,
  "events.view": 1,
  "events.join": 1,
  "members.view": 1,
  "reports.create": 1,
  "encyclopedia.view": 1,
  "ai.use": 1,
  "penalties.view_own": 1,
  "bank.approve": 4,
  "bank.report": 4,
  "bank.export": 4,
  "trucks.manage": 4,
  "trucks.attendance": 4,
  "trucks.report": 4,
  "recruit.review": 4,
  "recruit.interview": 4,
  "diplomacy.view": 4,
  "diplomacy.manage": 4,
  "forum.moderate": 4,
  "forum.pin": 4,
  "events.manage": 4,
  "events.remind": 4,
  "reports.read": 4,
  "penalties.manage": 4,
  "recruit.approve": 5,
  "members.manage": 5,
  "roles.manage": 5,
  "audit.view": 5,
  "admin.access": 5,
  "settings.manage": 5,
};

const SPEC_GATED = new Set(Object.values(SPECIALIZATIONS).flat());

export function can(user: UserPublic | null | undefined, permission: string): boolean {
  if (!user) return false;
  const required = PERMISSIONS[permission];
  if (required === undefined) return false;
  const userRank = ROLE_RANK[user.role] ?? 0;
  if (userRank < required) return false;
  if (userRank >= 5) return true;
  if (SPEC_GATED.has(permission)) {
    const granted = new Set((user.officer_roles ?? []).flatMap((s) => SPECIALIZATIONS[s] ?? []));
    return granted.has(permission);
  }
  return true;
}

/** Any officer tool at all — drives the "Officer" nav entry. */
export function isOfficer(user: UserPublic | null | undefined): boolean {
  if (!user) return false;
  return user.role === "R5" || (user.officer_roles?.length ?? 0) > 0;
}
