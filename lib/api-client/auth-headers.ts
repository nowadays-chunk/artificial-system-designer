export function authHeaders() {
  const actorId = process.env.NEXT_PUBLIC_ACTOR_ID ?? "local-user";
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "default";
  return {
    "x-actor-id": actorId,
    "x-tenant-id": tenantId,
  };
}
