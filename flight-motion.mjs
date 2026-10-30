const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// All poses derive from scroll position, so reversing scroll reverses the flight.
export function flightPose(progress, reducedMotion = false) {
  const p = clamp(progress);
  if (reducedMotion) return { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, phase: 0 };
  return {
    x: Math.sin(p * Math.PI * 2) * 1.25,
    y: Math.sin(p * Math.PI) * .65,
    yaw: Math.sin(p * Math.PI * 2) * .3,
    pitch: Math.sin(p * Math.PI * 2) * .12,
    roll: smooth((p - .16) / .43) * Math.PI * 2,
    phase: p < .25 ? 0 : p < .62 ? 1 : 2,
  };
}

export function rocketProgress(progress, launch) {
  return clamp((progress - launch) / .23);
}
