import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flightPose, rocketProgress } from '../flight-motion.mjs';

test('scroll completes a roll and reverses to the same pose', () => {
  assert.equal(flightPose(0).roll, 0);
  assert.equal(flightPose(.6).roll, Math.PI * 2);
  const middle = flightPose(.4);
  flightPose(.9);
  assert.deepEqual(flightPose(.4), middle);
  assert.deepEqual(flightPose(-1), flightPose(0));
  assert.deepEqual(flightPose(2), flightPose(1));
});

test('rockets launch on distinct scroll beats and reset on reverse scroll', () => {
  assert.equal(rocketProgress(.63, .64), 0);
  assert.ok(rocketProgress(.7, .64) > 0);
  assert.equal(rocketProgress(.7, .715), 0);
  assert.equal(rocketProgress(1, .64), 1);
  assert.equal(rocketProgress(.3, .64), 0);
});

test('reduced motion keeps the airframe stationary throughout the sequence', () => {
  for (const p of [0, .25, .5, .75, 1]) {
    assert.deepEqual(flightPose(p, true), { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, phase: 0 });
  }
});
