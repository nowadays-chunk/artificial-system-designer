import { useState } from "react";

export type ModelerTool = "select" | "add" | "layout";

export function useModelerShellUiStore<TSelectionInfo>(
  initialScenarioName: string,
  initialSelectionInfo: TSelectionInfo,
) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ModelerTool>("select");
  const [announcement, setAnnouncement] = useState("Modeler ready");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [selectedScenarioName, setSelectedScenarioName] = useState(initialScenarioName);
  const [selectedElementInfo, setSelectedElementInfo] = useState<TSelectionInfo>(
    initialSelectionInfo,
  );

  return {
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    activeTool,
    setActiveTool,
    announcement,
    setAnnouncement,
    showShortcuts,
    setShowShortcuts,
    showAnalysis,
    setShowAnalysis,
    paletteQuery,
    setPaletteQuery,
    selectedScenarioName,
    setSelectedScenarioName,
    selectedElementInfo,
    setSelectedElementInfo,
  };
}

export function useDiagramUiStore(
  initialScenarioName: string,
  initialGuidedStepCount: number,
) {
  const [selectedScenarioName, setSelectedScenarioName] = useState(initialScenarioName);
  const [guidedStepCount, setGuidedStepCount] = useState(initialGuidedStepCount);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [draftPurpose, setDraftPurpose] = useState("Primary request flow");
  const [draftProtocol, setDraftProtocol] = useState("HTTPS");

  return {
    selectedScenarioName,
    setSelectedScenarioName,
    guidedStepCount,
    setGuidedStepCount,
    paletteQuery,
    setPaletteQuery,
    draftPurpose,
    setDraftPurpose,
    draftProtocol,
    setDraftProtocol,
  };
}

