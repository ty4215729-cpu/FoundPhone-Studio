import type { Runtime, RuntimeSnapshot } from "../schema";

export function runtimeSnapshot(state: Runtime): RuntimeSnapshot {
  const copy = structuredClone(state);
  delete copy.checkpoints;
  delete copy.routeRecords;
  return copy;
}
export function restoreCheckpoint(
  state: Runtime,
  key: string,
  variables: Runtime["variables"] = {},
): Runtime {
  const saved = state.checkpoints?.[key];
  if (!saved) return state;
  return {
    ...structuredClone(saved),
    checkpoints: structuredClone(state.checkpoints),
    routeRecords: structuredClone(state.routeRecords),
    variables: { ...saved.variables, ...variables },
  };
}
