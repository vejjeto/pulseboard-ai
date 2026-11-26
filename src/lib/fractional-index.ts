export const INDEX_STEP = 1024;
export const MIN_GAP = 1;

export interface PositionResult {
  position: number;
  needsRebalance: boolean;
}

export function computePosition(
  prev: number | null,
  next: number | null,
): PositionResult {
  if (prev === null && next === null) {
    return { position: INDEX_STEP, needsRebalance: false };
  }
  if (prev === null && next !== null) {
    const position = next / 2;
    const needsRebalance = Math.abs(next - position) < MIN_GAP || position <= 0;
    return { position, needsRebalance };
  }
  if (prev !== null && next === null) {
    return { position: prev + INDEX_STEP, needsRebalance: false };
  }
  const low = prev as number;
  const high = next as number;
  const position = (low + high) / 2;
  const needsRebalance = Math.abs(high - low) < MIN_GAP;
  return { position, needsRebalance };
}

export function rebalancePositions(
  ids: string[],
): Array<{ id: string; position: number }> {
  return ids.map((id, index) => ({
    id,
    position: (index + 1) * INDEX_STEP,
  }));
}
