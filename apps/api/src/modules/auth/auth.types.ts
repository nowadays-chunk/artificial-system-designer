export type WorkspaceRole = "viewer" | "editor" | "owner";

export type RequestAuthContext = {
  actorId: string;
  tenantId: string;
  actorType: "user" | "service";
};
