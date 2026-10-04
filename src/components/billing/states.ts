const STATE_LABEL_KEYS: Record<string, string> = {
  TRIAL: "state.trial",
  ACTIVE: "state.active",
  PAST_DUE: "state.pastDue",
  CANCELLED: "state.cancelled",
  EXPIRED: "state.expired",
  SUSPENDED: "state.suspended",
};

const STATE_BADGE_COLORS: Record<
  string,
  "primary" | "success" | "warning" | "error" | "light"
> = {
  TRIAL: "primary",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "light",
  EXPIRED: "error",
  SUSPENDED: "error",
};

const EVENT_LABEL_KEYS: Record<string, string> = {
  CREATED: "type.created",
  PLAN_CHANGED: "type.planChanged",
  STATE_CHANGED: "type.stateChanged",
  RENEWED: "type.renewed",
  CANCELLED: "type.cancelled",
  LIMIT_REACHED: "type.limitReached",
};

const EVENT_BADGE_COLORS: Record<
  string,
  "primary" | "success" | "warning" | "error" | "info" | "light"
> = {
  CREATED: "success",
  PLAN_CHANGED: "primary",
  STATE_CHANGED: "info",
  RENEWED: "success",
  CANCELLED: "light",
  LIMIT_REACHED: "warning",
};

export function stateLabelKey(state: string | null | undefined): string {
  if (!state) {
    return "state.none";
  }
  return STATE_LABEL_KEYS[state] ?? "state.none";
}

export function stateBadgeColor(
  state: string | null | undefined,
): "primary" | "success" | "warning" | "error" | "light" {
  if (!state) {
    return "light";
  }
  return STATE_BADGE_COLORS[state] ?? "light";
}

export function eventLabelKey(type: string): string {
  return EVENT_LABEL_KEYS[type] ?? "type.stateChanged";
}

export function eventBadgeColor(
  type: string,
): "primary" | "success" | "warning" | "error" | "info" | "light" {
  return EVENT_BADGE_COLORS[type] ?? "info";
}
