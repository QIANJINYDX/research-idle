// 平衡性模拟：一个"贪心玩家"机器人。用法: node tools/sim.js [小时数] [每秒点击]
require('../js/data.js'); require('../js/game.js');
const G = globalThis.G;
const HOURS = +process.argv[2] || 10, CPS = +(process.argv[3] ?? 4);
G.load();
const s = () => G.s;
const t0 = {}; const mark = (k, t) => { if (!(k in t0)) { t0[k] = t; } };
const f = n => n >= 1e4 ? n.toExponential(2) : n.toFixed(1);
let t = 0, dt = 1, lastPrint = 0;
const disc = ['chem', 'econ', 'cs', 'phys', 'math', 'bio'];
while (t < HOURS * 3600) {
  const S = s();
  const activeClick = t < 3 * 3600; // 前 3 小时会点
  if (activeClick) for (let i = 0; i < CPS; i++) G.click();
  if (S.eureka.live > 0 && Math.random() < 0.6) G.clickEureka();
  // 项目
  for (const p of G.availableProjects()) if (!p.ending || true) if (G.canAfford(p.cost)) G.buyProject(p.id);
  // 人员
  for (let k = 0; k < 50; k++) {
    let best = null, br = 0;
    for (const x of globalThis.DATA.STAFF) { if (!G.staffVisible(x.id)) continue; const r = G.staffUnit(x.id) / G.staffCost(x.id); if (r > br) { br = r; best = x.id; } }
    if (!best || G.staffCost(best) > S.funding) break; G.buyStaff(best, 1);
  }
  // 写作：自动
  S.slots.forEach((sl, i) => { if (sl.paper !== 'auto') G.setSlotPaper(i, 'auto'); });
  // 学科
  if (G.mods().feat.has('disc')) { const free = G.totalFocus() - G.usedFocus(); if (free > 0) { G.allocate(disc[(t / 60 | 0) % 6], free); } }
  for (const p of globalThis.DATA.PERKS) G.buyPerk(p.id);
  G.tick(dt);
  for (const x of globalThis.DATA.STAFF) if (S.staff[x.id] > 0) mark('staff:' + x.id, t);
  for (const id of Object.keys(S.projects)) if (!id.startsWith('su_')) mark('proj:' + id, t);
  // 传承：待领取 ≥ max(10, 已有)
  const pend = G.pendingLegacy();
  if (!process.env.NOP && pend >= Math.max(10, S.legacyTotal)) { console.log(`[${(t/3600).toFixed(2)}h] PRESTIGE +${pend} (cit life ${f(S.stats.life.citations)})`); G.prestige(); }
  if (process.env.DBG && t % 600 === 0) { const m = G.mods(); console.log(`  t=${(t/60)|0}m data×${f(m.data)} all×${f(m.all)} fund×${f(m.fund)} rep ${f(G.repMult())} write×${f(m.write)} cite×${f(m.cite)} buffs ${S.buffs.map(b=>b.id)} staff ${globalThis.DATA.STAFF.filter(x=>S.staff[x.id]).map(x=>x.id+":"+S.staff[x.id]+"x"+m.staff[x.id]).join(" ")} disc ${Object.entries(S.disc).map(([k,v])=>k+v.lvl).join(",")} slots ${S.slots.map(sl=>G.slotPaper(sl)).join(",")}`); }
  if (t - lastPrint >= 1800) { lastPrint = t; console.log(`[${(t/3600).toFixed(2)}h] data/s ${f(G.dataPS())} fund/s ${f(S.fundRate)} fund ${f(S.funding)} cit ${f(S.citations)} h ${G.hIndex()} papers ${S.stats.run.papers} ✦pend ${G.pendingLegacy()} tot ${S.legacyTotal}`); }
  if (S.stats.ended) { console.log('ENDING at', (t/3600).toFixed(2), 'h'); break; }
  t += dt;
}
console.log(Object.entries(t0).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${(v / 60).toFixed(1)}m ${k}`).join('\n'));
