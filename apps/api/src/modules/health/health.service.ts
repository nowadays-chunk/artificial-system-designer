export type HealthStatus = {
  status: "ok";
  service: "asd-api";
  uptimeSeconds: number;
  timestamp: string;
};

export function getHealthStatus(startedAtMs: number): HealthStatus {
  const uptimeSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  return {
    status: "ok",
    service: "asd-api",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  };
}

