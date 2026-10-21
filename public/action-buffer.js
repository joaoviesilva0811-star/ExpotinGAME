// Shared input allowance. Execution, resources and expiration stay authoritative
// on the server; clients never schedule repeated presses.
export const ACTION_BUFFER_WINDOW = .14;
export const withinActionBuffer = (readyAt, now) => Number.isFinite(readyAt) && Number.isFinite(now) && readyAt > now && readyAt - now <= ACTION_BUFFER_WINDOW + 1e-9;
