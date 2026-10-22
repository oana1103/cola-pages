// Task states always take precedence over ambient idle behavior.
export function idlePose(mode, elapsed, preview = null) {
  if (mode !== 0) return mode;
  if (preview === 'sleep') return 7;
  if (elapsed >= 60_000) return 7;
  return 0;
}
