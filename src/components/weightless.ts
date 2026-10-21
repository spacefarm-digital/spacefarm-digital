// Zero-g for the "Our apps" icons. Each icon is a body tethered to its slot in the grid by a soft
// spring: left alone it drifts a few pixels, as it did on CSS; grabbed and flung it tumbles, bumps
// into the other icons and the edges of the section, and drifts back home. A phone's tilt pulls
// the whole arena to one side for a moment. A plain click (no drag) still opens the app's site.
// Nothing here runs under prefers-reduced-motion; the icons then stay still, as before.

type Sample = { x: number; y: number; t: number };

type Body = {
  app: HTMLElement;
  el: HTMLElement;
  /** Collision radius, a little under half the icon (its corners are rounded) */
  r: number;
  /** Home centre, in arena coordinates, measured with the transform cleared */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Angle in radians and angular velocity */
  a: number;
  va: number;
  /** Idle drift: two slow sines with their own phases, so the four never move in step */
  p1: number;
  p2: number;
  f1: number;
  f2: number;
  dragging: boolean;
  pointerId: number;
  /** Where in the icon it was grabbed, relative to its centre */
  gx: number;
  gy: number;
  /** Recent pointer positions, for the fling velocity on release */
  samples: Sample[];
  /** Set once a drag moved far enough that the click after it should not open the link */
  moved: boolean;
  startX: number;
  startY: number;
  last: string;
};

/** Spring home: natural period 1.6 s, damping ratio 0.45, so a fling travels before it comes back */
const OMEGA = (2 * Math.PI) / 1.6;
const K = OMEGA * OMEGA;
const C = 2 * 0.45 * OMEGA;
/** Spin settles faster than position */
const OMEGA_A = (2 * Math.PI) / 1.1;
const K_A = OMEGA_A * OMEGA_A;
const C_A = 2 * 0.7 * OMEGA_A;
/** Collisions and walls keep most of the energy */
const BOUNCE = 0.62;
const WALL_BOUNCE = 0.55;
const MAX_SPEED = 2800;
const DRIFT = 7;
const DRAG_THRESHOLD = 6;
const TILT_ACCEL = 1100;
const MAX_TILT_ACCEL = 650;
const STEP = 1 / 120;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function weightless(list: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icons = [...list.querySelectorAll<HTMLElement>('.icon')];
  if (icons.length < 2) return;

  const bodies: Body[] = icons.map((el) => ({
    app: el.closest<HTMLElement>('.app') ?? el,
    el,
    r: 1,
    hx: 0,
    hy: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    a: 0,
    va: 0,
    p1: Math.random() * Math.PI * 2,
    p2: Math.random() * Math.PI * 2,
    f1: 0.35 + Math.random() * 0.25,
    f2: 0.3 + Math.random() * 0.25,
    dragging: false,
    pointerId: -1,
    gx: 0,
    gy: 0,
    samples: [],
    moved: false,
    startX: 0,
    startY: 0,
    last: '',
  }));

  // The arena is the list's box; the icons may cross the copy while flying but always come home.
  let width = 0;
  let height = 0;
  let top = 0;
  const measure = () => {
    for (const b of bodies) b.el.style.transform = '';
    const box = list.getBoundingClientRect();
    width = box.width;
    height = box.height;
    top = -24;
    for (const b of bodies) {
      const r = b.el.getBoundingClientRect();
      const hx = r.left - box.left + r.width / 2;
      const hy = r.top - box.top + r.height / 2;
      b.x += hx - b.hx;
      b.y += hy - b.hy;
      b.hx = hx;
      b.hy = hy;
      b.r = (r.width / 2) * 0.97;
      b.last = '';
    }
    render();
  };

  const render = () => {
    for (const b of bodies) {
      const t = `translate(${(b.x - b.hx).toFixed(2)}px, ${(b.y - b.hy).toFixed(2)}px) rotate(${b.a.toFixed(4)}rad)`;
      if (t !== b.last) {
        b.last = t;
        b.el.style.transform = t;
      }
    }
  };

  // Pointer: grab, follow with a little lag, fling on release.
  const pointerPos = (b: Body, e: PointerEvent) => {
    const box = list.getBoundingClientRect();
    return { x: e.clientX - box.left - b.gx, y: e.clientY - box.top - b.gy };
  };
  const pointerTarget = new Map<Body, { x: number; y: number }>();

  for (const b of bodies) {
    b.el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || b.dragging) return;
      // Native image dragging and text selection would take over otherwise
      e.preventDefault();
      b.el.setPointerCapture(e.pointerId);
      const box = list.getBoundingClientRect();
      b.gx = e.clientX - box.left - b.x;
      b.gy = e.clientY - box.top - b.y;
      b.dragging = true;
      b.pointerId = e.pointerId;
      b.moved = false;
      b.startX = e.clientX;
      b.startY = e.clientY;
      b.samples = [{ x: b.x, y: b.y, t: performance.now() }];
      pointerTarget.set(b, { x: b.x, y: b.y });
      b.app.classList.add('is-dragging');
      wake();
    });
    b.el.addEventListener('pointermove', (e) => {
      if (!b.dragging || e.pointerId !== b.pointerId) return;
      const p = pointerPos(b, e);
      pointerTarget.set(b, p);
      if (!b.moved && Math.hypot(e.clientX - b.startX, e.clientY - b.startY) > DRAG_THRESHOLD) {
        b.moved = true;
      }
      const now = performance.now();
      b.samples.push({ x: p.x, y: p.y, t: now });
      while (b.samples.length > 8) b.samples.shift();
    });
    const release = (e: PointerEvent) => {
      if (!b.dragging || e.pointerId !== b.pointerId) return;
      b.dragging = false;
      b.app.classList.remove('is-dragging');
      pointerTarget.delete(b);
      // Fling: the pointer's velocity over the last stretch of the drag
      const now = performance.now();
      const latest = b.samples[b.samples.length - 1];
      let oldest = b.samples[0];
      for (const s of b.samples)
        if (now - s.t <= 90) break;
        else oldest = s;
      if (latest && oldest && latest.t > oldest.t && now - latest.t < 80) {
        const dt = (latest.t - oldest.t) / 1000;
        b.vx = clamp(((latest.x - oldest.x) / dt) * 0.9, -MAX_SPEED, MAX_SPEED);
        b.vy = clamp(((latest.y - oldest.y) / dt) * 0.9, -MAX_SPEED, MAX_SPEED);
        // A fling off the icon's centre spins it
        const lever = (b.gx * b.vy - b.gy * b.vx) / (b.r * b.r);
        b.va = clamp(b.va + lever * 0.9, -9, 9);
      }
      if (b.moved) {
        // Ask for the phone's tilt now, on a gesture, once the first drag is over
        enableTilt();
        // The click that follows a drag must not open the link
        const swallow = (ev: Event) => {
          ev.preventDefault();
          ev.stopImmediatePropagation();
        };
        b.app.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => b.app.removeEventListener('click', swallow, { capture: true }), 300);
      }
    };
    b.el.addEventListener('pointerup', release);
    b.el.addEventListener('pointercancel', release);
    b.el.addEventListener('lostpointercapture', (e) => {
      if (b.dragging && e.pointerId === b.pointerId) release(e);
    });
    b.el.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // Tilt: the phone's orientation, relative to how it was held a moment ago, pulls the arena.
  // Holding it steady at any angle counts as level, so only a change in tilt moves the icons.
  let tiltX = 0;
  let tiltY = 0;
  let refBeta: number | null = null;
  let refGamma = 0;
  let tiltEnabled = false;
  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    let beta = e.beta;
    let gamma = e.gamma;
    const angle =
      screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0;
    if (angle === 90) [beta, gamma] = [gamma, -beta];
    else if (angle === 270 || angle === -90) [beta, gamma] = [-gamma, beta];
    if (refBeta === null) {
      refBeta = beta;
      refGamma = gamma;
    }
    // The reference eases toward the current pose, so a sustained tilt lets the icons settle
    refBeta += (beta - refBeta) * 0.03;
    refGamma += (gamma - refGamma) * 0.03;
    const rx = ((gamma - refGamma) * Math.PI) / 180;
    const ry = ((beta - refBeta) * Math.PI) / 180;
    tiltX = clamp(Math.sin(rx) * TILT_ACCEL, -MAX_TILT_ACCEL, MAX_TILT_ACCEL);
    tiltY = clamp(Math.sin(ry) * TILT_ACCEL, -MAX_TILT_ACCEL, MAX_TILT_ACCEL);
    wake();
  };
  const enableTilt = () => {
    if (tiltEnabled || !('DeviceOrientationEvent' in window)) return;
    tiltEnabled = true;
    const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof ctor.requestPermission === 'function') {
      // iOS asks the visitor; the end of the first drag is the gesture that lets us ask
      ctor
        .requestPermission()
        .then((state) => {
          if (state === 'granted') addEventListener('deviceorientation', onOrientation);
        })
        .catch(() => {});
    } else {
      addEventListener('deviceorientation', onOrientation);
    }
  };
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
    const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (!('requestPermission' in ctor)) enableTilt();
  }

  // Physics, in fixed steps.
  const step = (dt: number, now: number) => {
    const t = now / 1000;
    for (const b of bodies) {
      if (b.dragging) {
        const target = pointerTarget.get(b);
        if (target) {
          const f = Math.min(1, dt * 28);
          const nx = b.x + (target.x - b.x) * f;
          const ny = b.y + (target.y - b.y) * f;
          b.vx = (nx - b.x) / dt;
          b.vy = (ny - b.y) / dt;
          b.x = nx;
          b.y = ny;
        }
        // Leans into the direction it is pulled, as an object on a string would
        const lean = clamp(b.vx * 0.00035, -0.3, 0.3);
        const aa = -K_A * 1.6 * (b.a - lean) - C_A * 1.4 * b.va;
        b.va += aa * dt;
        b.a += b.va * dt;
        continue;
      }
      const tx = b.hx + DRIFT * Math.sin(t * b.f1 + b.p1);
      const ty = b.hy + DRIFT * Math.sin(t * b.f2 + b.p2);
      let ax = -K * (b.x - tx) - C * b.vx + tiltX;
      let ay = -K * (b.y - ty) - C * b.vy + tiltY;
      b.vx += ax * dt;
      b.vy += ay * dt;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vy *= MAX_SPEED / speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const aa = -K_A * b.a - C_A * b.va;
      b.va += aa * dt;
      b.a += b.va * dt;
    }

    // Icons bump into each other
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const p = bodies[i];
        const q = bodies[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let dist = Math.hypot(dx, dy);
        const min = p.r + q.r;
        if (dist >= min) continue;
        if (dist < 0.001) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = min - dist;
        // A held icon does not budge; the other takes the whole correction
        const wp = p.dragging ? 0 : q.dragging ? 1 : 0.5;
        const wq = 1 - wp;
        p.x -= nx * overlap * wp;
        p.y -= ny * overlap * wp;
        q.x += nx * overlap * wq;
        q.y += ny * overlap * wq;
        const rvx = q.vx - p.vx;
        const rvy = q.vy - p.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn >= 0) continue;
        const impulse = -(1 + BOUNCE) * vn;
        const jp = p.dragging ? 0 : q.dragging ? impulse : impulse / 2;
        const jq = q.dragging ? 0 : p.dragging ? impulse : impulse / 2;
        p.vx -= nx * jp;
        p.vy -= ny * jp;
        q.vx += nx * jq;
        q.vy += ny * jq;
        // The glancing part of the hit spins both
        const vt = rvx * -ny + rvy * nx;
        if (!p.dragging) p.va = clamp(p.va + (vt / p.r) * 0.25, -9, 9);
        if (!q.dragging) q.va = clamp(q.va - (vt / q.r) * 0.25, -9, 9);
      }
    }

    // And into the edges of the section
    for (const b of bodies) {
      if (b.dragging) continue;
      if (b.x < b.r) {
        b.x = b.r;
        if (b.vx < 0) {
          b.vx = -b.vx * WALL_BOUNCE;
          b.va = clamp(b.va + b.vy * 0.004, -9, 9);
        }
      } else if (b.x > width - b.r) {
        b.x = width - b.r;
        if (b.vx > 0) {
          b.vx = -b.vx * WALL_BOUNCE;
          b.va = clamp(b.va - b.vy * 0.004, -9, 9);
        }
      }
      if (b.y < top + b.r) {
        b.y = top + b.r;
        if (b.vy < 0) {
          b.vy = -b.vy * WALL_BOUNCE;
          b.va = clamp(b.va - b.vx * 0.004, -9, 9);
        }
      } else if (b.y > height - b.r) {
        b.y = height - b.r;
        if (b.vy > 0) {
          b.vy = -b.vy * WALL_BOUNCE;
          b.va = clamp(b.va + b.vx * 0.004, -9, 9);
        }
      }
    }
  };

  // The loop runs while the section is on screen.
  let running = false;
  let visible = false;
  let last = 0;
  let accumulator = 0;
  const frame = (now: number) => {
    if (!visible) {
      running = false;
      return;
    }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 8) {
      step(STEP, now - (accumulator - STEP) * 1000);
      accumulator -= STEP;
      steps++;
    }
    if (steps === 8) accumulator = 0;
    render();
    requestAnimationFrame(frame);
  };
  const wake = () => {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    accumulator = 0;
    requestAnimationFrame(frame);
  };

  new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) wake();
    },
    { rootMargin: '80px' },
  ).observe(list);
  new ResizeObserver(() => measure()).observe(list);

  list.classList.add('is-live');
  measure();
}
