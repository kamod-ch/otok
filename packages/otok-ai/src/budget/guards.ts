import type { AiBudgetReservationStore, AiBudgetStore } from "../types.js";

export function isAiBudgetReservationStore(store: AiBudgetStore): store is AiBudgetReservationStore {
  const candidate = store as AiBudgetReservationStore;
  return (
    typeof candidate.acquireReservation === "function" &&
    typeof candidate.settleReservation === "function" &&
    typeof candidate.releaseReservation === "function"
  );
}
