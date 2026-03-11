import type { ValidationFinding } from "@asd/contracts/analysis";
import type { GraphDocument } from "@asd/contracts/graph";
import type {
  SimulationMetrics,
  SimulationProfile,
  SimulationRun,
  SimulationScorecard,
  SimulationTick,
} from "@asd/contracts/simulation";

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
