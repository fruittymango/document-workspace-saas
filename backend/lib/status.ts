export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  unassigned: "Unassigned",
  assigned: "Assigned",
  awaiting_signature: "Awaiting Signature",
  filed: "Filed",
  archived: "Archived",
};

/**
 * Allowed status transitions for the document lifecycle.
 * draft -> in_review -> approved -> filed
 * with the ability to send documents back a step for revisions.
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["assigned", "unassigned", "awaiting_signature", "filed", "archived"],
  unassigned: ["assigned", "awaiting_signature", "filed", "archived"],
  assigned: ["awaiting_signature", "filed", "archived"],
  awaiting_signature: ["filed", "archived"],
  filed: ["archived"],
  archived: [],
};

export function canTransition(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}
