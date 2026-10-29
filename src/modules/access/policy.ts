import type { Role } from "@prisma/client";
export const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "BRANCH_MANAGER",
  "AGENT",
  "COORDINATOR",
  "ACCOUNTANT",
  "AUDITOR",
  "MANAGER",
] as const;
export const resources = [
  "properties",
  "leads",
  "users",
  "branches",
  "content",
  "settings",
  "audit",
  "notifications",
  "agents",
  "media",
  "security",
] as const;
export type Resource = (typeof resources)[number];
export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "publish"
  | "assign"
  | "readAll";
const inventory: Action[] = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "publish",
  "assign",
  "export",
];
const admin: Partial<Record<Resource, readonly Action[]>> = {
  properties: [...inventory, "readAll"],
  leads: ["read", "update", "delete", "assign", "readAll", "export"],
  users: ["read", "create", "update"],
  branches: ["read", "create", "update", "readAll"],
  content: ["read", "create", "update", "delete"],
  settings: ["read", "create", "update"],
  audit: ["read"],
  notifications: ["read"],
  agents: ["read"],
  media: ["create"],
  security: ["read", "update"],
};
const matrix: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  SUPER_ADMIN: admin,
  ADMIN: admin,
  // Compatibility role: existing company-wide managers are never silently re-scoped.
  MANAGER: {
    properties: [...inventory, "readAll"],
    leads: ["read", "update", "assign", "readAll"],
    branches: ["read", "readAll"],
    content: ["read", "create", "update", "delete"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
    security: ["read", "update"],
  },
  BRANCH_MANAGER: {
    properties: inventory,
    leads: ["read", "update", "assign", "export"],
    branches: ["read"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
    security: ["read", "update"],
  },
  AGENT: {
    properties: ["read", "create", "update"],
    leads: ["read", "update"],
    branches: ["read"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
    security: ["read", "update"],
  },
  COORDINATOR: {
    properties: ["read", "create", "update", "assign"],
    leads: ["read", "update", "assign"],
    branches: ["read"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
    security: ["read", "update"],
  },
  ACCOUNTANT: { security: ["read", "update"] },
  AUDITOR: {
    properties: ["read", "readAll"],
    leads: ["read", "readAll"],
    branches: ["read", "readAll"],
    audit: ["read"],
    notifications: ["read"],
    security: ["read", "update"],
  },
};
export function isResource(value: string): value is Resource {
  return (resources as readonly string[]).includes(value);
}
export function can(role: string, resource: Resource, action: Action) {
  return (
    isResource(resource) &&
    Object.hasOwn(matrix, role) &&
    matrix[role as Role][resource]?.includes(action) === true
  );
}
export function isGlobal(role: string) {
  return ["SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR"].includes(role);
}
export type Actor = { id: string; role: string; branchId?: string | null };
export function recordScope(actor: Actor): {
  agentId?: string;
  branchId?: string;
  id?: string;
} {
  if (isGlobal(actor.role)) return {};
  if (actor.role === "AGENT") return { agentId: actor.id };
  if (["BRANCH_MANAGER", "COORDINATOR"].includes(actor.role) && actor.branchId)
    return { branchId: actor.branchId };
  return { id: "__no_access__" };
}
export function inScope(
  actor: Actor,
  record: { agentId: string | null; branchId?: string | null },
) {
  if (isGlobal(actor.role)) return true;
  if (actor.role === "AGENT") return record.agentId === actor.id;
  return (
    ["BRANCH_MANAGER", "COORDINATOR"].includes(actor.role) &&
    !!actor.branchId &&
    actor.branchId === record.branchId
  );
}
export const staffResources = [
  "properties",
  "leads",
  "branches",
  "content",
  "users",
  "settings",
  "audit",
  "security",
] as const;
export function staffNavigation(role: string) {
  return Object.hasOwn(matrix, role)
    ? ["dashboard", ...staffResources.filter((r) => can(role, r, "read"))]
    : [];
}
export function ownsRecord(
  role: string,
  userId: string,
  agentId: string | null,
) {
  return (
    can(role, "properties", "readAll") ||
    (can(role, "properties", "read") && userId === agentId)
  );
}
