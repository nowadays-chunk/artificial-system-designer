import type { RequestAuthContext } from "./auth.types";

export type AuthProvider = "in_memory" | "header";

export type AuthConfig = {
  provider: AuthProvider;
  simulationActor: RequestAuthContext;
};

export function readAuthConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const provider =
    env.API_AUTH_PROVIDER === "header" && env.API_AUTH_SIMULATION !== "1"
      ? "header"
      : "in_memory";

  const actorType = env.API_AUTH_SIM_ACTOR_TYPE === "service" ? "service" : "user";
  const simulationActor: RequestAuthContext = {
    actorId: env.API_AUTH_SIM_ACTOR_ID ?? "local-user",
    tenantId: env.API_AUTH_SIM_TENANT_ID ?? "default",
    actorType,
  };

  return {
    provider,
    simulationActor,
  };
}
