export function msLeft(endsAt) {
  const t = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, t);
}

export function isPast(endsAt, now = new Date()) {
  return now.getTime() > new Date(endsAt).getTime();
}

