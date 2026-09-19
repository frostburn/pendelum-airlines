import { DT } from '#game/constants';
import { stopAt } from '#game/moving-stops';
import { drawMovingStop } from '#game/render/platforms';
import { clamp } from '#game/math';
import { point } from '#game/physics';
import { C, sans } from '#game/ui/theme';
import { isBuildingVisible } from '#game/render/viewport';
/** Drawing has no authority to change the simulation. */
export function createRenderer(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx)
    throw new Error('A 2D canvas is required.');
  let width = 1, height = 1, dpr = 1, sim;
  let cam, renderCam, snapCamera = true;
  function resize(w, h, ratio = 1) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    dpr = Math.max(1, Math.min(2, ratio));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  function reset(state) {
    snapCamera = true;
    cam = { x: state.engine.x + 4, y: Math.max(8, state.engine.y - .5), scale: 42 };
    renderCam = { ...cam };
  }
  function sx(x) {
    return (x - renderCam.x) * renderCam.scale + width / 2;
  }
  function sy(y) {
    return height / 2 - (y - renderCam.y) * renderCam.scale;
  }
  function text(x, y, t, size = .26, color = C.ink, align = 'center', weight = 600) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, -1);
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${sans}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(t, 0, 0);
    ctx.restore();
  }
  function line(points, color = C.ink, w = .04) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  function poly(points, fill, stroke = null, w = .035) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  }
  function circle(x, y, r, fill, stroke = null, w = .03) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  }
  function box(x, y, w, h, color, stroke = null) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = .035;
      ctx.strokeRect(x, y, w, h);
    }
  }
  function rounded(x, y, w, h, r, fill, stroke = null) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = .035;
      ctx.stroke();
    }
  }
  function background(t) {
    ctx.fillStyle = sim.level.theme === 1 ? '#e9e6d9' : sim.level.theme === 2 ? '#e0e9e5' : '#e2ebdf';
    ctx.fillRect(0, 0, width, height);
    const sunX = width * .79 - (renderCam.x - 15) * 2, sunY = height * .2 + (renderCam.y - 8) * 1.5;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(width, height) * .11, 0, Math.PI * 2);
    ctx.fillStyle = sim.level.theme === 1 ? '#f5dbac' : '#f2edcf';
    ctx.fill();
    // Soft, deliberately low-contrast hills and a distant town, not collision terrain.
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      const base = height * (.53 + layer * .13) + (renderCam.y - 8) * (6 + layer * 2);
      for (let x = -40; x <= width + 40; x += 20) {
        const v = x + renderCam.x * (4 + layer * 3);
        const y = base + Math.sin(v / (230 - layer * 40) + layer) * 38 + Math.sin(v / (93 + layer * 15) + 2) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = ['#cfdfd2', '#bfd4c8', '#a9c4b8'][layer];
      ctx.fill();
    }
    const base = height * .80 + (renderCam.y - 8) * 12;
    for (let i = -3; i < Math.ceil(width / 90) + 5; i++) {
      const x = i * 91 - ((renderCam.x * 12) % 91), h = 22 + (Math.sin(i * 8.2) + 1) * 34, w = 46 + (Math.cos(i * 7) + 1) * 12;
      ctx.fillStyle = '#99b8ae';
      ctx.fillRect(x, base - h, w, h + 70);
      ctx.beginPath();
      ctx.moveTo(x - 4, base - h);
      ctx.lineTo(x + w * .5, base - h - 13);
      ctx.lineTo(x + w + 4, base - h);
      ctx.fill();
      ctx.fillStyle = '#b3ccc0';
      for (let k = 0; k < 3; k++)
        ctx.fillRect(x + 9 + k * 14, base - h + 12, 5, 9);
    }
    // Sparse little clouds.
    ctx.strokeStyle = '#f7f5e7';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 293 + 83 - renderCam.x * 4 + (reduced ? 0 : t * 1.5)) % (width + 230) + width + 230) % (width + 230) - 100, y = height * (.17 + .065 * (i % 3));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30, y);
      ctx.moveTo(x + 12, y - 7);
      ctx.lineTo(x + 57, y - 7);
      ctx.stroke();
    }
  }
  function building(r) {
    if (!isBuildingVisible(r, renderCam, { width, height }))
      return;
    const { x, y, w, h, style } = r;
    if (style === 'earth') {
      box(x, y, w, h, '#879e8e');
      box(x, y + h - .10, w, .10, '#4b7060');
      ctx.strokeStyle = '#a7b8a0';
      ctx.lineWidth = .025;
      for (let xx = x; xx < x + w; xx += 1.3)
        line([[xx, y + h - .8], [xx + .32, y + h - .95]], '#9cb29e', .025);
      return;
    }
    const colors = {
      teal: ['#81a796', '#618979'],
      plaster: ['#decc9f', '#c6b786'],
      brick: ['#c99576', '#ad785d'],
      roof: ['#638174', '#486b60']
    }, [face, shade] = colors[style] || colors.plaster;
    box(x, y, w, h, face);
    box(x + w - .14, y, .14, h, shade);
    box(x, y, Math.min(.13, w), h, '#ffffff1f');
    ctx.strokeStyle = shade;
    ctx.lineWidth = .02;
    if (style === 'brick') {
      for (let yy = y + .4; yy < y + h; yy += .46) {
        line([[x + .08, yy], [x + w - .16, yy]], '#a66f5239', .018);
        const off = Math.round(yy / .46) % 2 ? .4 : 0;
        for (let xx = x + .4 + off; xx < x + w - .15; xx += .8)
          line([[xx, yy], [xx, Math.min(yy + .46, y + h)]], '#a66f5239', .015);
      }
    }
    if (h > 1.8 && w > 2.2) {
      for (let yy = y + .65; yy < y + h - .85; yy += 1.48)
        for (let xx = x + .63; xx < x + w - .45; xx += 1.25) {
          rounded(xx - .22, yy, .44, .72, .04, style === 'teal' ? '#c3d2b7' : '#6e8975');
          box(xx - .13, yy + .12, .11, .47, '#e7deb442');
          line([[xx, yy + .02], [xx, yy + .66]], '#435f503d', .03);
          box(xx - .26, yy - .03, .52, .07, shade);
        }
    }
    box(x - .08, y + h - .15, w + .16, .18, style === 'roof' ? '#47675c' : '#607c68');
    box(x - .08, y + h + .03, w + .16, .035, '#edecd7');
    if (style === 'roof') {
      for (let xx = x + .16; xx < x + w; xx += .4)
        poly([[xx, y + h + .04], [xx + .18, y + h + .17], [xx + .35, y + h + .04]], '#788d75');
    }
    ctx.strokeStyle = '#36584888';
    ctx.lineWidth = .025;
    ctx.strokeRect(x, y, w, h);
  }
  function person(x, y, color, t = 0, seated = false) {
    ctx.save();
    ctx.translate(x, y);
    const bob = seated ? 0 : (reduced ? 0 : Math.sin(t * 2.2) * .018);
    if (!seated) {
      line([[-.095, .19], [-.12, 0], [-.23, 0]], '#334e45', .055);
      line([[.095, .19], [.13, 0], [.22, 0]], '#334e45', .055);
    }
    else {
      line([[-.12, .12], [-.19, -.06]], '#334e45', .052);
      line([[.12, .12], [.22, -.06]], '#334e45', .052);
    }
    rounded(-.16, .15 + bob, .32, .36, .07, color);
    line([[-.14, .43 + bob], [-.24, .25 + bob]], color, .075);
    line([[.14, .43 + bob], [.22, .29 + bob]], color, .075);
    circle(0, .62 + bob, .145, '#e6c59f');
    poly([[-.17, .65 + bob], [.17, .65 + bob], [.11, .79 + bob], [-.12, .78 + bob]], '#344f46');
    circle(.048, .62 + bob, .015, C.ink);
    if (!seated) {
      rounded(.23, .07, .18, .22, .025, '#927353');
      line([[.27, .30], [.28, .34], [.36, .34], [.37, .3]], '#735f46', .02);
    }
    ctx.restore();
  }
  function station(p, i, t) {
    const targets = sim.targetStops(), active = targets.includes(i), waiting = sim.jobs.filter(j => j.state === 'waiting' && j.from === i), delivered = sim.jobs.filter(j => j.state === 'delivered' && j.to === i).length;
    const color = active ? C.orange : sim.level.practice ? C.teal : '#719080';
    box(p.x - p.w / 2, p.y + .035, p.w, .085, active ? '#eebc65' : '#baceaf');
    for (let xx = p.x - p.w / 2 + .10; xx < p.x + p.w / 2 - .08; xx += .33)
      line([[xx, p.y + .045], [xx + .12, p.y + .11]], '#536e5555', .045);
    text(p.x, p.y - (p.motion ? 1.55 : .42), p.name.toUpperCase(), Math.min(.23, p.w / Math.max(8, p.name.length) * 1.5), '#294f43', 'center', 750);
    const post = p.x - p.w / 2 - .16;
    line([[post, p.y + .04], [post, p.y + .8]], '#416754', .045);
    circle(post, p.y + .92, .19, active ? C.yellow : '#c4d4b7', '#456750', .035);
    text(post, p.y + .91, String(i + 1), .20, C.ink, 'center', 700);
    waiting.forEach((j, k) => person(p.x + p.w / 2 - .62 - k * .48, p.y + .13, j.color, t + k));
    if (delivered)
      for (let k = 0; k < delivered; k++) {
        circle(p.x - p.w / 2 + .23 + k * .18, p.y - .8, .045, C.teal);
      }
    if (active) {
      const y = p.y + 1.9 + (reduced ? 0 : .065 * Math.sin(t * 3));
      poly([[p.x - .18, y + .1], [p.x, y - .07], [p.x + .18, y + .1], [p.x + .18, y + .24], [p.x, y + .08], [p.x - .18, y + .24]], C.orange);
    }
    if (sim.servicing === i) {
      const w = p.w * .7;
      box(p.x - w / 2, p.y - (p.motion ? 1.8 : .75), w, .07, '#b1bfa2');
      box(p.x - w / 2, p.y - (p.motion ? 1.8 : .75), w * clamp(sim.service / .55, 0, 1), .07, C.teal);
    }
  }
  function windsock(x, y, t) {
    line([[x, y], [x, y + 1.45]], '#476f60', .045);
    const wind = sim.windAt(x, y + 1), d = Math.min(1.05, wind * .6 + .22), dy = Math.sin(t * 7 + x) * .04;
    for (let i = 0; i < 5; i++) {
      const a = i / 5, b = (i + 1) / 5;
      poly([[x + a * d, y + 1.5 - a * .18 + dy * a], [x + b * d, y + 1.5 - b * .18 + dy * b], [x + b * d, y + 1.25 - b * .03 + dy * b], [x + a * d, y + 1.25 - a * .03 + dy * a]], i % 2 ? '#f3e7cb' : '#c7744b');
    }
  }
  function engineDraw(e, t, ghost = false) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.a);
    ctx.lineJoin = 'round';
    const dark = ghost ? '#427b6a' : C.ink;
    line([[-.65, -.12], [-.68, -.29], [.68, -.29], [.65, -.12]], dark, .045);
    rounded(-.80, -.10, 1.60, .26, .12, ghost ? '#92bb9f' : '#547e6f', dark);
    rounded(-.37, -.22, .74, .46, .17, ghost ? '#92bb9f' : C.orange, dark);
    rounded(-.25, -.07, .50, .24, .07, ghost ? '#d5dfc9' : '#f3d49a', dark);
    box(-.19, -.025, .38, .04, '#ab7652');
    circle(0, -.33, .065, '#d9d7b9', dark, .025);
    for (const s of [-1, 1]) {
      const xx = s * .61;
      rounded(xx - .13, .04, .26, .23, .06, '#75917a', dark);
      line([[xx, .19], [xx, .40]], dark, .05);
      circle(xx, .4, .06, '#ebd6a6', dark, .018);
      const span = .51 * (.30 + .70 * Math.abs(Math.cos(t * 70 + s * .7)));
      ctx.save();
      ctx.translate(xx, .43);
      ctx.beginPath();
      ctx.ellipse(0, 0, .54, .045, 0, 0, Math.PI * 2);
      ctx.fillStyle = ghost ? '#8bad9655' : '#315c4850';
      ctx.fill();
      line([[-span, 0], [span, 0]], dark, .04);
      ctx.restore();
    }
    circle(-.53, 0, .032, '#eccc8b');
    circle(.53, 0, .032, '#eccc8b');
    ctx.restore();
  }
  function cabinDraw(c, t, passengers = [], ghost = false) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.a);
    const dark = ghost ? '#427b6a' : C.ink;
    line([[-.47, .28], [0, .60], [.47, .28]], dark, .036);
    circle(0, .60, .048, '#c3c9aa', dark, .02);
    line([[-.49, -.33], [-.50, -.53], [-.65, -.53]], dark, .044);
    line([[.49, -.33], [.50, -.53], [.65, -.53]], dark, .044);
    rounded(-.57, -.40, 1.14, .27, .085, ghost ? '#aac6a7' : C.orange, dark);
    rounded(-.46, -.17, .92, .14, .04, ghost ? '#c7d6bc' : '#e8bc69', dark);
    passengers.forEach((p, i) => person(passengers.length === 1 ? 0 : (i - .5) * .44, -.19, p.color, t, true));
    line([[-.56, -.27], [-.56, .28], [.56, .28], [.56, -.27]], dark, .045);
    line([[-.56, .10], [.56, .10]], dark, .035);
    circle(-.48, -.29, .025, '#e8bd73');
    circle(.48, -.29, .025, '#e8bd73');
    text(0, -.29, 'PA–01', .115, ghost ? '#427b6a' : '#fff0cb', 'center', 750);
    ctx.restore();
  }
  function interpolateBody(b, a) {
    return { x: b.ox + (b.x - b.ox) * a, y: b.oy + (b.y - b.oy) * a, a: b.oa + (b.a - b.oa) * a };
  }
  function render(state, { alpha = 1, elapsed = 1 / 60, clock = 0, map = false, panel = false, ghost = null } = {}) {
    sim = state;
    if (!cam)
      reset(sim);
    const e = interpolateBody(sim.engine, alpha), c = interpolateBody(sim.cabin, alpha);
    let scale = clamp(height / 16.6, 27, 52);
    if (width < 640)
      scale = clamp(height / 13.5, 29, 45);
    const halfW = width / (2 * scale), halfH = height / (2 * scale), look = clamp(sim.engine.vx * .65, -2.8, 2.8);
    let tx = e.x * .52 + c.x * .48 + look, ty = Math.max(halfH - 1.6, (e.y + c.y) * .5 + .3);
    tx = sim.level.width + 3 < halfW * 2 ? sim.level.width / 2 : clamp(tx, halfW - 2, sim.level.width + 2 - halfW);
    ty = clamp(ty, halfH - 2, Math.max(halfH - 2, sim.level.height + 14 - halfH));
    tx = Math.min(tx, e.x + halfW - 1.6, c.x + halfW - 1.6);
    tx = Math.max(tx, e.x - halfW + 1.6, c.x - halfW + 1.6);
    const blend = reduced || snapCamera ? 1 : 1 - Math.exp(-elapsed * 3.5);
    cam.x += (tx - cam.x) * blend;
    cam.y += (ty - cam.y) * blend;
    cam.scale = scale;
    snapCamera = false;
    renderCam = map ? { x: sim.level.width / 2, y: sim.level.height / 2 - 1, scale: Math.min(width / (sim.level.width + 5), height / (sim.level.height + 3)) } : { ...cam };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    background(clock);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(renderCam.scale, -renderCam.scale);
    ctx.translate(-renderCam.x, -renderCam.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (sim.level.water) {
      box(-12, -8, sim.level.width + 25, 8.1, '#719f98');
      for (let k = 0; k < 22; k++) {
        const x = k * 2.3 - 3, y = -.10 - (k % 4) * .19;
        line([[x, y], [x + .85, y + .015 * Math.sin(clock * 2 + k)]], '#b0ccc0', .025);
      }
    }
    for (const r of sim.level.terrain)
      building(r);
    // Match platform motion to the interpolated rig, even on paused frames.
    const sceneTime = Math.max(0, sim.time - (1 - alpha) * DT);
    const pads = sim.level.pads.map(p => stopAt(p, sceneTime));
    pads.forEach((p, i) => {
      if (p.motion) drawMovingStop(ctx, p, sim.level.pads[i], map);
      station(p, i, clock);
    });
    if (sim.level.wind) {
      windsock(12, 2.4, clock);
      windsock(22, 7.0, clock);
      windsock(31, 2.4, clock);
    }
    else {
      const p = sim.level.pads[0];
      line([[p.x + p.w / 2 + .43, p.y], [p.x + p.w / 2 + .43, p.y + .85]], '#5c7e68', .035);
      poly([[p.x + p.w / 2 + .43, p.y + .86], [p.x + p.w / 2 + 1.0, p.y + .71], [p.x + p.w / 2 + .43, p.y + .57]], '#9fb39a');
    }
    const gp = ghost;
    if (gp) {
      ctx.save();
      ctx.globalAlpha = .23;
      const ge = { x: gp[0], y: gp[1], a: gp[2] }, gc = { x: gp[3], y: gp[4], a: gp[5] };
      const ep = point({ ...ge }, 0, -.32), cp = point({ ...gc }, 0, .60), p = [[ep.x, ep.y]];
      for (let i = 6; i < 16; i += 2)
        p.push([gp[i], gp[i + 1]]);
      p.push([cp.x, cp.y]);
      ctx.setLineDash([.09, .1]);
      line(p, C.teal, .035);
      ctx.setLineDash([]);
      engineDraw(ge, clock, true);
      cabinDraw(gc, clock, [], true);
      ctx.restore();
    }
    const a = point({ ...e }, 0, -.32), b = point({ ...c }, 0, .60), rope = [[a.x, a.y], ...sim.nodes.map(n => {
        const p = interpolateBody(n, alpha);
        return [p.x, p.y];
      }), [b.x, b.y]];
    line(rope, '#eeeada99', .095);
    line(rope, '#3b5247', .04);
    engineDraw(e, clock);
    cabinDraw(c, clock, sim.onboard());
    ctx.restore();
    // Off-screen stop labels stay legible and do not obscure the aircraft.
    if (!map && !panel) {
      sim.targetStops().forEach((i, n) => {
        const p = pads[i], x = sx(p.x), y = sy(p.y + 2);
        if (x < 20 || x > width - 20 || y < 60 || y > height - 55) {
          const cx = clamp(x, 76, width - 76), cy = clamp(y, 104, height - 72 - n * 28), angle = Math.atan2(y - cy, x - cx);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.font = `600 11px ${sans}`;
          const str = p.name, tw = ctx.measureText(str).width;
          ctx.fillStyle = '#f6f1e5ed';
          ctx.beginPath();
          ctx.roundRect(-tw / 2 - 12, -12, tw + 24, 24, 4);
          ctx.fill();
          ctx.fillStyle = C.ink;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(str, 0, 0);
          ctx.translate(Math.cos(angle) * (tw / 2 + 20), Math.sin(angle) * 22);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(-3, -4);
          ctx.lineTo(-3, 4);
          ctx.closePath();
          ctx.fillStyle = C.orange;
          ctx.fill();
          ctx.restore();
        }
      });
    }
  }
  return {
    render,
    resize,
    reset,
    view: () => ({ camera: renderCam ? { ...renderCam } : null, width, height })
  };
}
