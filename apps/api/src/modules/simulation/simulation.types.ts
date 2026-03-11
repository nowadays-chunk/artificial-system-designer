import type { ValidationFinding } from "../../../../../packages/contracts/src/analysis";
import type { GraphDocument } from "../../../../../packages/contracts/src/graph";
import type {
  SimulationMetrics,
  SimulationProfile,
  SimulationRun,
  SimulationScorecard,
  SimulationTick,
} from "../../../../../packages/contracts/src/simulation";

export type StoredSimulationRun = SimulationRun & {
  graph: GraphDocument;
  trafficRps: number;
};

export type CreateSimulationRunInput = {
  workspaceId: string;
  versionId: string;
  scenarioId: string;
  seed: number;
  profile: SimulationProfile;
  graph: GraphDocument;
  trafficRps: number;
};

export type SimulationRunEnvelope = {
  run: SimulationRun;
  metrics: SimulationMetrics;
  scorecard: SimulationScorecard;
  ticks: SimulationTick[];
  findings: ValidationFinding[];
};
