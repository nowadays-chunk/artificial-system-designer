export function authHeaders() {
  if (typeof window === "undefined") {
    return {
      "x-actor-id": "local-user",
      "x-tenant-id": "default",
    };
  }
  const actorId = window.localStorage.getItem("asd_sim_actor_id") ?? "local-user";
  const tenantId = window.localStorage.getItem("asd_sim_tenant_id") ?? "default";
  return {
    "x-actor-id": actorId,
    "x-tenant-id": tenantId,
  };
}

export function getActiveActorId(): string {
  if (typeof window === "undefined") return "local-user";
  return window.localStorage.getItem("asd_sim_actor_id") ?? "local-user";
}

export function getActiveTenantId(): string {
  if (typeof window === "undefined") return "default";
  return window.localStorage.getItem("asd_sim_tenant_id") ?? "default";
}

export type UserRole = "viewer" | "editor" | "admin";

export function getActiveRole(): UserRole {
  if (typeof window === "undefined") return "editor";
  return (window.localStorage.getItem("asd_sim_actor_role") as UserRole) ?? "editor";
}

export function updateSimulatedAuth(actorId: string, tenantId: string, role: UserRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("asd_sim_actor_id", actorId);
  window.localStorage.setItem("asd_sim_tenant_id", tenantId);
  window.localStorage.setItem("asd_sim_actor_role", role);
}

