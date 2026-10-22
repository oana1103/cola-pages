import { idlePose } from './idle-behavior.mjs';
import { TaskPose } from './task-pose.mjs';
const taskPose = new TaskPose();
import { PokeReaction } from './poke-reaction.mjs';
const reaction = new PokeReaction();

// All geometry and motion are native Rive; this adapter supplies task and pointer inputs.
const modes = ['我在，慢慢说', '让我想一想…', '正在帮你处理…', '正在回复…', '等你确认', '做好啦'];
const stateNames = ['idle', 'thinking', 'working', 'replying', 'waiting', 'complete'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const label = document.querySelector('#label');
let mode = 0, inputs, raf, previous = 0, x = 50, y = 50, tx = 50, ty = 50;
let lastActivity = performance.now(), preview = null, displayedPose = -1;
const owner = parent !== window ? parent.document : document;

rive.RuntimeLoader.setWasmUrl('vendor/rive.wasm');
const player = new rive.Rive({
  src: 'perching-rive/build/perching-co.riv?v=wink-tilt-5deg-15',
  canvas: document.querySelector('#co'), stateMachine: 'Companion', autoplay: true,
  layout: new rive.Layout({ fit: rive.Fit.Contain }),
  onLoad() {
    player.resizeDrawingSurfaceToCanvas();
    inputs = Object.fromEntries(player.stateMachineInputs('Companion').map(input => [input.name, input]));
    sync();
  },
});
function activity() {
  lastActivity = performance.now();
  preview = null;
}
function reset() { tx = ty = 50; }
function tick(time) {
  const dt = Math.min(50, time - previous || 16);
  previous = time;
  mode = taskPose.advance(time);
  const pose = reaction.pose(time) ?? idlePose(mode, time - lastActivity, preview);
  const following = mode === 0 && pose !== 7 && pose !== 8 && !reduced.matches;
  const amount = 1 - Math.exp(-dt / (140 / 1.2));
  x += ((following ? tx : 50) - x) * amount;
  y += ((following ? ty : 50) - y) * amount;
  if (inputs) {
    inputs.lookX.value = x;
    inputs.lookY.value = y;
    if (pose !== displayedPose) {
      inputs.mode.value = pose * 12.5;
      displayedPose = pose;
      label.textContent = pose === 7 ? '眯一会儿，叫我就好' : modes[mode];
      if (parent !== window) parent.postMessage({ type: 'cola-companion-pose', pose, label: label.textContent }, location.origin);
    }
  }
  raf = requestAnimationFrame(tick);
}
function sync() {
  cancelAnimationFrame(raf);
  previous = 0;
  if (document.hidden) { player.pause(); return; }
  // Keep input updates live with reduced motion, while disabling looping motion.
  if (reduced.matches) player.pause();
  else player.play('Companion');
  raf = requestAnimationFrame(tick);
}
function look(event) {
  activity();
  if (mode !== 0 || reduced.matches) return;
  const frame = frameElement?.getBoundingClientRect();
  const face = document.querySelector('#co').getBoundingClientRect();
  tx = 50 + 50 * Math.tanh((event.clientX - (frame?.left || 0) - face.left - face.width / 2) / 180);
  ty = 50 + 50 * Math.tanh((event.clientY - (frame?.top || 0) - face.top - face.height / 2) / 140);
}
function local(event) {
  const box = frameElement?.getBoundingClientRect();
  look({ clientX: event.clientX + (box?.left || 0), clientY: event.clientY + (box?.top || 0) });
}
function wink() {
  activity();
  reaction.click(performance.now());
}
function message(event) {
  if (event.source !== parent || event.origin !== location.origin) return;
  if (event.data?.type === 'cola-companion-state') {
    const next = stateNames.indexOf(event.data.state);
    if (next < 0) return;
    if (next === 5 && event.data.previewReplay && taskPose.value !== 5) taskPose.reset();
    mode = taskPose.receive(next, performance.now());
    reaction.reset();
    activity();
    reset();
    displayedPose = -1;
  } else if (event.data?.type === 'cola-companion-idle-preview' && event.data.pose === 'sleep') {
    taskPose.reset();
    mode = 0;
    reaction.reset();
    activity();
    preview = event.data.pose;
    reset();
  }
}
function visibility() { activity(); sync(); }
document.querySelector('#greet').addEventListener('click', wink);
window.addEventListener('message', message);
document.addEventListener('pointermove', local);
document.addEventListener('visibilitychange', visibility);
reduced.addEventListener('change', sync);
owner.addEventListener('keydown', activity);
owner.addEventListener('pointerdown', activity);
owner.addEventListener('scroll', activity, true);
if (owner !== document) {
  owner.addEventListener('pointermove', look);
  owner.addEventListener('pointerleave', reset);
  document.addEventListener('keydown', activity);
}
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(raf);
  player.cleanup();
  window.removeEventListener('message', message);
  reduced.removeEventListener('change', sync);
  owner.removeEventListener('keydown', activity);
  owner.removeEventListener('pointerdown', activity);
  owner.removeEventListener('scroll', activity, true);
  owner.removeEventListener('pointermove', look);
  owner.removeEventListener('pointerleave', reset);
});
