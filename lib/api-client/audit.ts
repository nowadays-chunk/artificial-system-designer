import { getActiveActorId, getActiveTenantId, getActiveRole } from "./auth-headers";

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  role: string;
  action: string;
  timestamp: string;
  payload: string;
  previousHash: string;
  hash: string;
}

const STORAGE_KEY = "asd_sim_audit_logs";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 128-bit custom fast hash that runs synchronously in browser/node
function computeHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xfa5c0001, h4 = 0x12345678;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3242174889);
    h4 = Math.imul(h4 ^ ch, 997);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 15), 2246822507);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 1597334677);
  h4 = Math.imul(h4 ^ (h4 >>> 13), 3242174889);
  
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

export function getAuditLogs(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function appendAuditEvent(action: string, payload: Record<string, unknown>): AuditEvent {
  if (typeof window === "undefined") {
    return {} as AuditEvent;
  }

  const logs = getAuditLogs();
  const previousHash = logs.length > 0 ? logs[logs.length - 1].hash : "00000000000000000000000000000000";

  const tenantId = getActiveTenantId();
  const actorId = getActiveActorId();
  const role = getActiveRole();
  const timestamp = new Date().toISOString();
  const payloadStr = JSON.stringify(payload);

  const blockContent = `${tenantId}|${actorId}|${role}|${action}|${timestamp}|${payloadStr}|${previousHash}`;
  const hash = computeHash(blockContent);

  const event: AuditEvent = {
    id: generateUUID(),
    tenantId,
    actorId,
    role,
    action,
    timestamp,
    payload: payloadStr,
    previousHash,
    hash,
  };

  logs.push(event);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  return event;
}

export function verifyAuditChain(tenantId: string): {
  valid: boolean;
  errorIndex?: number;
  expectedHash?: string;
  foundHash?: string;
} {
  const allLogs = getAuditLogs();
  // Filter by tenant to verify tenant's audit trail
  const tenantLogs = allLogs.filter((log) => log.tenantId === tenantId);

  let previousHash = "00000000000000000000000000000000";

  for (let i = 0; i < tenantLogs.length; i++) {
    const log = tenantLogs[i];

    // Check if the previousHash linked in the log matches our tracked hash
    if (log.previousHash !== previousHash) {
      return {
        valid: false,
        errorIndex: i,
        expectedHash: previousHash,
        foundHash: log.previousHash,
      };
    }

    // Recompute hash for this block
    const blockContent = `${log.tenantId}|${log.actorId}|${log.role}|${log.action}|${log.timestamp}|${log.payload}|${log.previousHash}`;
    const calculatedHash = computeHash(blockContent);

    if (log.hash !== calculatedHash) {
      return {
        valid: false,
        errorIndex: i,
        expectedHash: calculatedHash,
        foundHash: log.hash,
      };
    }

    previousHash = log.hash;
  }

  return { valid: true };
}

export function clearAuditLogs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function tamperAuditLog(id: string, newPayload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const logs = getAuditLogs();
  const index = logs.findIndex((log) => log.id === id);
  if (index !== -1) {
    logs[index].payload = JSON.stringify(newPayload);
    // Do NOT recompute the hash - simulating direct database tampering
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
}
