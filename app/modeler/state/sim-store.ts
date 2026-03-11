import { useEffect, useState } from "react";

export function useSimulationStore(initialTrafficRps: number) {
  const [trafficRps, setTrafficRps] = useState(initialTrafficRps);
  const [isRunning, setIsRunning] = useState(true);
  const [tick, setTick] = useState(1);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 1100);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const resetTick = () => {
    setTick(1);
  };

  return {
    trafficRps,
    setTrafficRps,
    isRunning,
    setIsRunning,
    tick,
    setTick,
    resetTick,
  };
}

