export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatDateTimeLocalInput(value: Date) {
  return value.toISOString().slice(0, 16);
}
