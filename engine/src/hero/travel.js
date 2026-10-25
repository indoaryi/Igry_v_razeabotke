  // ================= travel: the hero walks into an exit zone, the screen fades, the next location comes =================
  import { toast } from '../core/toast.js';
  import { MAP } from '../world/map.js';
  import { enterLocation, exitAt } from '../world/locations.js';
  import { hero } from './hero.js';
  import { walkTo } from './state.js';
  export let travelState = null;     // { exit, t, phase: 'out' | 'in' } while the screen fades
  export let stageFade = 0;          // 0…1 darkness drawn over the stage
  // walk to the exit that leads to another location (the location buttons under the stage use this)
  export function goToLocation(id) {
    if (id === MAP.id || travelState) return;
    const e = (MAP.exits || []).find((x) => x.to === id);
    if (!e) return;
    walkTo(e.go[0], e.go[1]);
  }
  export function updateTravel(dt) {
    const T = travelState;
    if (T) {
      T.t += dt;
      if (T.phase === 'out') {
        stageFade = Math.min(1, T.t / 0.35);
        if (T.t >= 0.4) { enterLocation(T.exit.to, T.exit.arrive); T.phase = 'in'; T.t = 0; stageFade = 1; }
      } else {
        stageFade = Math.max(0, 1 - T.t / 0.55);
        if (T.t >= 0.55) { travelState = null; stageFade = 0; toast(MAP.name + (MAP.arrival ? '. ' + MAP.arrival : '')); }
      }
      return;
    }
    const e = exitAt(hero.x, hero.z);
    if (!e) { hero.arrived = false; return; }
    if (hero.arrived) return;
    if (hero.act && !hero.vehicle) return;
    if (hero.vehicle && hero.vehicle.ride && !hero.vehicle.ride.canTravel()) return;
    travelState = { exit: e, t: 0, phase: 'out' };
    hero.path.length = 0; hero.queue.length = 0; hero.target = null;
  }
