// Stable world slots, like the town skyline: camera travel never rerolls a shed.
export function foundryBuildings(cameraX, width, layer) {
  const spacing = 238, offset = cameraX * (layer ? 16 : 7);
  const out = [];
  for (let id = Math.floor(offset / spacing) - 2; id <= Math.ceil((offset + width) / spacing) + 1; id++) {
    out.push({id, x: id * spacing - offset, type: ((id % 4) + 4) % 4,
      height: 65 + (Math.sin(id * 7.31 + layer) + 1) * 23});
  }
  return out;
}

export function drawFoundry(ctx, camera, width, height, time, reduced) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#ddd8ca'); sky.addColorStop(1, '#c1cbc2');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f2ddaf'; ctx.beginPath();
  ctx.arc(width * .78 - camera.x * 2, height * .21 + (camera.y - 8) * 1.5, 37, 0, Math.PI * 2); ctx.fill();
  for (let layer = 0; layer < 2; layer++) {
    const base = height * (.67 + layer * .16) + (camera.y - 8) * (7 + layer * 5);
    const dark = layer ? '#8fa39e' : '#afb9b0', light = layer ? '#b0beb1' : '#c6cdc0';
    ctx.fillStyle = dark; ctx.fillRect(0, base, width, Math.max(0, height - base));
    for (const b of foundryBuildings(camera.x, width, layer)) {
      const {x, height: h, type} = b;
      ctx.fillStyle = dark; ctx.strokeStyle = dark; ctx.lineWidth = 5;
      // Pipe bridges connect the works, supported above the service roads.
      ctx.fillRect(x, base - 26, 242, 6);
      ctx.fillRect(x + 218, base - 29, 5, 45);
      if (type === 0 || type === 3) {
        ctx.fillRect(x, base - h, 178, h + 15);
        ctx.beginPath(); ctx.moveTo(x, base - h);
        for (let n = 0; n < 4; n++) {
          ctx.lineTo(x + n * 44 + 37, base - h - 24);
          ctx.lineTo(x + n * 44 + 37, base - h);
        }
        ctx.lineTo(x + 178, base - h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = light;
        for (let n = 0; n < 7; n++) ctx.fillRect(x + 12 + n * 23, base - h + 14, 14, 19);
        if (type === 0) for (let n = 0; n < 2; n++) {
          const sx = x + 30 + n * 51, top = base - h - 76 - n * 22;
          ctx.fillStyle = dark; ctx.fillRect(sx, top, 17, base - top);
          ctx.fillStyle = light; ctx.fillRect(sx, top + 15, 17, 9); ctx.fillRect(sx, top + 39, 17, 9);
          // A fixed number of translucent puffs; no growing particle collection.
          for (let k = 0; k < 4; k++) {
            const phase = reduced ? 0 : Math.sin(time * .23 + k + b.id) * 5;
            ctx.fillStyle = '#a5aaa01d'; ctx.beginPath();
            ctx.ellipse(sx + 9 + k * 17 + phase, top - 10 - k * 13, 15 + k * 6, 9 + k * 3, -.3, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (type === 1) {
        // Storage silos and their elevated loading conveyor.
        for (let n = 0; n < 3; n++) {
          const sx = x + 15 + n * 51;
          ctx.fillStyle = dark; ctx.fillRect(sx, base - h, 40, h - 17);
          ctx.beginPath(); ctx.ellipse(sx + 20, base - h, 20, 9, 0, Math.PI, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx, base - 17); ctx.lineTo(sx + 20, base); ctx.lineTo(sx + 40, base - 17); ctx.fill();
          ctx.fillStyle = light; ctx.fillRect(sx + 7, base - h + 10, 4, h - 38);
        }
        ctx.fillStyle = dark; ctx.fillRect(x + 10, base - h - 17, 174, 5);
      } else {
        // A riveted gantry crane behind the playable machines.
        ctx.fillRect(x + 15, base - h - 60, 7, h + 80);
        ctx.fillRect(x + 182, base - h - 60, 7, h + 80);
        ctx.strokeStyle = dark; ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, base - h - 65, 197, 22);
        ctx.beginPath();
        for (let n = 0; n < 8; n++) {
          ctx.moveTo(x + 3 + n * 24, base - h - 43); ctx.lineTo(x + 27 + n * 24, base - h - 65);
        }
        ctx.stroke();
        ctx.fillRect(x + 85, base - h - 44, 24, 9);
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 97, base - h - 35); ctx.lineTo(x + 97, base - 30);
        ctx.arc(x + 102, base - 30, 5, Math.PI, 0, true); ctx.stroke();
        ctx.fillRect(x + 30, base - 21, 53, 21); ctx.fillRect(x + 116, base - 34, 53, 34);
      }
    }
  }
}
