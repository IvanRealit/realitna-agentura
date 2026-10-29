import type { Role } from "@prisma/client";
export const resources = [
  "properties",
  "leads",
  "users",
  "content",
  "settings",
  "audit",
  "notifications",
  "agents",
  "media",
] as const;
export type Resource = (typeof resources)[number];
export type Action =
  "read" | "create" | "update" | "delete" | "publish" | "assign" | "readAll";
const matrix: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  ADMIN: {
    properties: [
      "read",
      "create",
      "update",
      "delete",
      "publish",
      "assign",
      "readAll",
    ],
    leads: ["read", "update", "delete", "assign", "readAll"],
    users: ["read", "create", "update"],
    content: ["read", "create", "update", "delete"],
    settings: ["read", "create", "update"],
    audit: ["read"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
  },
  MANAGER: {
    properties: [
      "read",
      "create",
      "update",
      "delete",
      "publish",
      "assign",
      "readAll",
    ],
    leads: ["read", "update", "assign", "readAll"],
    content: ["read", "create", "update", "delete"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
  },
  AGENT: {
    properties: ["read", "create", "update"],
    leads: ["read", "update"],
    notifications: ["read"],
    agents: ["read"],
    media: ["create"],
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
export const staffResources = [
  "properties",
  "leads",
  "content",
  "users",
  "settings",
  "audit",
] as const;
export function staffNavigation(role: string) {
  if (!can(role, "properties", "read") && !can(role, "leads", "read"))
    return [];
  return ["dashboard", ...staffResources.filter((r) => can(role, r, "read"))];
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
// Legacy MANAGER is company-wide. Seven-role branch scoping is a separate migration,
// never silently inferred from this three-role compatibility policy.
