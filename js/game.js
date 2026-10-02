/* 科研挂机 · 游戏引擎（纯逻辑，无 DOM，可在 Node 中运行模拟） */
(function (root) {
  'use strict';
  const DATA = root.DATA;
  const SAVE_KEY = 'research-idle-save-v1';
  const GROWTH = 1.15;
  const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
  const STAFF = byId(DATA.STAFF), PAPERS = byId(DATA.PAPERS), PROJECTS = byId(DATA.PROJECTS);
  const PERKS = byId(DATA.PERKS), DISCS = byId(DATA.DISCS);

  let S = null;      // 存档状态
  let M = null;      // 缓存的修正值
  let dirty = true;  // 修正值需要重算
  const listeners = {};
  const on = (e, f) => (listeners[e] = listeners[e] || []).push(f);
  const emit = (e, ...a) => (listeners[e] || []).forEach(f => f(...a));
  const log = (msg, kind = 'info') => emit('log', msg, kind);

  // ───────────────────────── 状态 ─────────────────────────
  const blankStats = () => ({ data: 0, funding: 0, citations: 0, papers: 0, clicks: 0, eurekas: 0, time: 0 });
  const newSlot = () => ({ paper: 'report', prog: 0, paid: false, on: true });

  function newState() {
    const s = {
      v: 1,
      data: 0, funding: 0, citations: 0,
      staff: {}, papers: {}, projects: {},
      slots: [newSlot()],
      disc: {},
      legacy: 0, legacyTotal: 0, perks: {},
      ach: {},
      buffs: [],
      eureka: { t: 40, live: 0 },
      fundRate: 0,
      stats: {
        run: blankStats(), life: blankStats(), lifePapers: {},
        prestiges: 0, started: Date.now(), runStarted: Date.now(),
        ended: false, endedAt: 0, noClick: 0, maxCps: 0, saw2: false, bestRunTime: 0,
      },
      settings: { fmt: 'cn', theme: 'auto', buyAmt: 1, autoHire: true, autoProj: true, ticker: true, particles: true },
      lastTick: Date.now(),
    };
    DATA.STAFF.forEach(x => (s.staff[x.id] = 0));
    DATA.PAPERS.forEach(x => { s.papers[x.id] = 0; s.stats.lifePapers[x.id] = 0; });
    DATA.DISCS.forEach(x => (s.disc[x.id] = { lvl: 0, xp: 0, f: 0 }));
    return s;
  }

  // 深度合并：让旧存档自动获得新增字段
  function merge(base, saved) {
    if (saved === null || typeof saved !== 'object' || Array.isArray(saved)) return saved === undefined ? base : saved;
    const out = Array.isArray(base) ? [] : { ...base };
    for (const k of Object.keys(saved)) {
      out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
        ? merge(base[k], saved[k]) : saved[k];
    }
    return out;
  }

  // ───────────────────────── 修正值 ─────────────────────────
  function computeMods() {
    const m = {
      click: 1, clickPct: 0, data: 1, fund: 1, write: 1, cite: 1, slots: 1, cost: 1,
      staff: {}, focus: 0, eureka: 1, buffDur: 1, buffPow: 1, papers: new Set(['report']), feat: new Set(),
      offEff: 0.5, offCap: 12 * 3600, startFund: 0, legacyGain: 1, all: 1, discSpeed: 1, keepPapers: false, phil: false,
    };
    DATA.STAFF.forEach(x => (m.staff[x.id] = 1));
    const apply = fx => fx.forEach(([k, a, b]) => {
      switch (k) {
        case 'staff': m.staff[a] *= b; break;
        case 'clickPct': case 'slots': case 'focus': case 'startFund': m[k] += a; break;
        case 'paper': m.papers.add(a); break;
        case 'feat': m.feat.add(a); break;
        case 'offEff': m.offEff = Math.max(m.offEff, a); break;
        case 'offCap': m.offCap = Math.max(m.offCap, a); break;
        case 'keepPapers': m.keepPapers = true; break;
        case 'phil': m.phil = true; break;
        case 'ending': break;
        default: m[k] *= a;
      }
    });
    for (const p of DATA.PROJECTS) if (S.projects[p.id]) apply(p.fx);
    for (const p of DATA.PERKS) if (S.perks[p.id]) apply(p.fx);
    if (!m.feat.has('disc')) m.focus = 0;

    m.achMult = 1 + 0.01 * Object.keys(S.ach).length;
    m.legacyMult = 1 + 0.02 * S.legacyTotal;
    m.data *= m.achMult;
    m.all *= m.legacyMult;

    const lv = id => S.disc[id].lvl;
    m.click *= discEffect('phys');
    m.data *= discEffect('chem');
    m.cost *= discEffect('bio');
    m.write *= discEffect('cs');
    m.cite *= discEffect('math');
    m.fund *= discEffect('econ');
    if (m.phil) m.legacyGain *= discEffect('phil');
    M = m; dirty = false;
    return m;
  }
  function discEffect(id) {
    const d = DISCS[id], l = S.disc[id].lvl;
    if (d.kind === 'add') return 1 + d.base * l;
    const v = Math.pow(d.base, l);
    return d.floor ? Math.max(d.floor, v) : v;
  }
  const mods = () => (dirty || !M ? computeMods() : M);
  const markDirty = () => { dirty = true; };

  // ───────────────────────── 计算 ─────────────────────────
  const buffMult = kind => S.buffs.reduce((a, b) => (b.kind === kind ? a * b.mult : a), 1);
  const staffUnit = id => STAFF[id].prod * mods().staff[id] * M.data * M.all;
  const baseDataPS = () => DATA.STAFF.reduce((a, x) => a + S.staff[x.id] * staffUnit(x.id), 0);
  const dataPS = () => baseDataPS() * buffMult('data');
  const clickValue = () => (mods().click + M.clickPct * dataPS()) * buffMult('click');
  const writeSpeed = () => mods().write * buffMult('write');
  const hIndex = () => Math.floor(Math.sqrt(S.citations));
  const repMult = () => 1 + Math.log10(1 + hIndex()) * 0.3;
  const paperFund = id => PAPERS[id].fund * mods().fund * repMult();
  const paperLump = id => PAPERS[id].lump * mods().cite;
  const citePS = () => DATA.PAPERS.reduce((a, p) => a + S.papers[p.id] * p.rate, 0) * mods().cite;
  const slotCount = () => Math.min(8, mods().slots);
  const totalFocus = () => mods().focus;
  const usedFocus = () => Object.values(S.disc).reduce((a, d) => a + d.f, 0);
  const discReq = l => 10 * Math.pow(1.25, l);
  const discUnlocked = id => !DISCS[id].perk || !!S.perks[DISCS[id].perk];

  function staffCost(id, n = 1) {
    const b = STAFF[id].cost * mods().cost * Math.pow(GROWTH, S.staff[id]);
    return b * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1);
  }
  function staffMaxAfford(id) {
    const b = STAFF[id].cost * mods().cost * Math.pow(GROWTH, S.staff[id]);
    return Math.max(0, Math.floor(Math.log(S.funding * (GROWTH - 1) / b + 1) / Math.log(GROWTH)));
  }
  function staffVisible(id) {
    const i = DATA.STAFF.findIndex(x => x.id === id);
    if (i === 0 || S.staff[id] > 0) return true;
    const prev = DATA.STAFF[i - 1];
    return S.staff[prev.id] > 0 || S.stats.run.funding >= STAFF[id].cost * 0.5;
  }

  const projVisible = p => !S.projects[p.id] && p.req(S, api);
  const canAfford = c => S.funding >= (c.f || 0) && S.data >= (c.d || 0) && S.citations >= (c.c || 0);
  const availableProjects = () => DATA.PROJECTS.filter(projVisible).sort((a, b) => (a.cost.f || 0) - (b.cost.f || 0));

  // ───────────────────────── 资源增减 ─────────────────────────
  function gainData(x) { S.data += x; S.stats.run.data += x; S.stats.life.data += x; }
  function gainFund(x) { S.funding += x; S.stats.run.funding += x; S.stats.life.funding += x; S._fundTick += x; }
  function gainCite(x) { S.citations += x; S.stats.run.citations += x; S.stats.life.citations += x; }

  // ───────────────────────── 行动 ─────────────────────────
  let clickTimes = [];
  function click() {
    const v = clickValue();
    gainData(v);
    S.stats.run.clicks++; S.stats.life.clicks++;
    S.stats.noClick = 0;
    const now = Date.now();
    clickTimes.push(now);
    clickTimes = clickTimes.filter(t => now - t < 1000);
    S.stats.maxCps = Math.max(S.stats.maxCps, clickTimes.length);
    return v;
  }

  function buyStaff(id, amt) {
    let n = amt === 'max' ? staffMaxAfford(id) : amt;
    if (n <= 0) return 0;
    const c = staffCost(id, n);
    if (c > S.funding) return 0;
    S.funding -= c;
    S.staff[id] += n;
    if (S.staff[id] === n) log(`首位${STAFF[id].name}加入了实验室！`, 'good');
    return n;
  }

  function buyProject(id) {
    const p = PROJECTS[id];
    if (!p || S.projects[id] || !p.req(S, api) || !canAfford(p.cost)) return false;
    S.funding -= p.cost.f || 0; S.data -= p.cost.d || 0; S.citations -= p.cost.c || 0;
    S.projects[id] = true;
    markDirty();
    if (!p.staffUp) log(`完成课题「${p.name}」`, 'proj');
    if (p.ending) { S.stats.ended = true; S.stats.endedAt = Date.now(); emit('ending'); }
    syncSlots();
    return true;
  }

  function buyPerk(id) {
    const p = PERKS[id];
    if (!p || S.perks[id] || S.legacy < p.cost) return false;
    S.legacy -= p.cost; S.perks[id] = true; markDirty();
    log(`习得传承天赋「${p.name}」`, 'legacy');
    syncSlots();
    return true;
  }

  function syncSlots() {
    const n = slotCount();
    while (S.slots.length < n) S.slots.push(newSlot());
  }

  function setSlotPaper(i, pid) {
    const sl = S.slots[i];
    if (!sl) return;
    if (pid !== 'auto' && !mods().papers.has(pid)) return;
    if (sl.paid && sl.paper !== 'auto') S.data += PAPERS[sl.paper].cost; // 退还
    if (sl.paid && sl.paper === 'auto' && sl.cur) S.data += PAPERS[sl.cur].cost;
    sl.paper = pid; sl.prog = 0; sl.paid = false; sl.cur = null; sl.on = true;
  }
  function toggleSlot(i) { const sl = S.slots[i]; if (sl) sl.on = !sl.on; }
  function clickSlot(i) {
    const sl = S.slots[i];
    if (!sl || !sl.paid) return false;
    const p = PAPERS[slotPaper(sl)];
    sl.prog += p.time * 0.04;
    return true;
  }
  // 自动选题：挑选当前数据能支撑的最高级论文
  function autoPick() {
    const dps = dataPS() + 3 * clickValue() * (S.stats.noClick < 5 ? 1 : 0);
    const unlocked = DATA.PAPERS.filter(p => M.papers.has(p.id));
    let best = unlocked[0];
    for (const p of unlocked) if (p.cost <= Math.max(S.data, dps * p.time / writeSpeed() * 1.2 + 1)) best = p;
    return best.id;
  }
  const slotPaper = sl => (sl.paper === 'auto' ? (sl.cur || autoPick()) : sl.paper);

  function processSlot(sl, dt) {
    if (!sl.on) return;
    if (!sl.paid) {
      const pid = sl.paper === 'auto' ? autoPick() : sl.paper;
      const c = PAPERS[pid].cost;
      if (S.data < c) return;
      S.data -= c; sl.paid = true; sl.prog = 0; sl.cur = pid;
    }
    const pid = sl.cur || sl.paper;
    const p = PAPERS[pid];
    sl.prog += dt * writeSpeed();
    if (sl.prog < p.time) return;
    const k = Math.floor(sl.prog / p.time);
    const extra = Math.min(k - 1, Math.floor(S.data / p.cost));
    const done = 1 + Math.max(0, extra);
    S.data -= (done - 1) * p.cost;
    publish(pid, done);
    sl.prog -= done * p.time;
    sl.paid = false; sl.cur = null;
    if (done < k) sl.prog = 0;
    else if (sl.paper !== 'auto' && S.data >= p.cost && sl.on) { S.data -= p.cost; sl.paid = true; sl.cur = pid; }
    else sl.prog = 0;
  }

  function publish(pid, n) {
    const first = S.stats.lifePapers[pid] === 0;
    S.papers[pid] += n;
    S.stats.lifePapers[pid] += n;
    S.stats.run.papers += n; S.stats.life.papers += n;
    gainFund(paperFund(pid) * n);
    gainCite(paperLump(pid) * n);
    if (first) log(`你的第一篇「${PAPERS[pid].name}」发表了！`, 'good');
  }

  // 学科精力分配
  function allocate(id, delta) {
    if (!mods().feat.has('disc') || !discUnlocked(id)) return;
    const d = S.disc[id];
    const free = totalFocus() - usedFocus();
    if (delta > 0) d.f += Math.min(delta, free);
    else d.f = Math.max(0, d.f + delta);
  }
  function clearFocus() { Object.values(S.disc).forEach(d => (d.f = 0)); }

  // ───────────────────────── 灵光一闪 ─────────────────────────
  const nextEureka = () => (60 + Math.random() * 120) / mods().eureka;
  function clickEureka() {
    if (S.eureka.live <= 0) return null;
    S.eureka.live = 0;
    S.stats.run.eurekas++; S.stats.life.eurekas++;
    const pool = DATA.EUREKA;
    let r = Math.random() * pool.reduce((a, e) => a + e.w, 0), e = pool[0];
    for (const x of pool) { if ((r -= x.w) < 0) { e = x; break; } }
    const m = mods();
    let msg = '';
    if (e.buff) {
      const mult = 1 + (e.buff.mult - 1) * m.buffPow;
      const dur = e.buff.dur * m.buffDur;
      S.buffs = S.buffs.filter(b => b.id !== e.id);
      S.buffs.push({ id: e.id, kind: e.buff.kind, mult, t: dur, dur, name: e.name, label: e.buff.label.replace(/×\d+/, '×' + Math.round(mult)) });
      msg = `${e.name}！${e.buff.label.replace(/×\d+/, '×' + Math.round(mult))}，持续 ${Math.round(dur)} 秒`;
    } else if (e.id === 'lucky') {
      const g = Math.min(S.data * 0.15, baseDataPS() * 900 * m.buffPow) + 13 + clickValue() * 30;
      gainData(g); msg = `${e.name}！获得 ${api.fmt(g)} 数据`;
    } else if (e.id === 'grant') {
      const g = Math.max(S.fundRate * 300, 50, baseDataPS() * 120) * m.buffPow;
      gainFund(g); msg = `${e.name}！获得 ¥${api.fmt(g)} 经费`;
    } else {
      const g = Math.max(citePS() * 600, 5 + hIndex()) * m.buffPow;
      gainCite(g); msg = `${e.name}！获得 ${api.fmt(g)} 引用`;
    }
    log('💡 ' + msg, 'eureka');
    return msg;
  }

  // ───────────────────────── 自动化 ─────────────────────────
  function autoHire() {
    for (let i = 0; i < 30; i++) {
      let best = null, bestR = 0;
      for (const x of DATA.STAFF) {
        if (!staffVisible(x.id)) continue;
        const r = staffUnit(x.id) / staffCost(x.id);
        if (r > bestR) { bestR = r; best = x.id; }
      }
      if (!best || staffCost(best) > S.funding * 0.5) return;
      buyStaff(best, 1);
    }
  }
  function autoProj() {
    const list = availableProjects().filter(p => !p.ending && canAfford(p.cost));
    if (list.length) buyProject(list[0].id);
  }

  // ───────────────────────── 主循环 ─────────────────────────
  let achTimer = 0, autoTimer = 0;
  function tick(dt, offline = false) {
    const m = mods();
    S._fundTick = 0;
    S.stats.run.time += dt; S.stats.life.time += dt;
    if (!offline) {
      S.stats.noClick += dt;
      S.buffs.forEach(b => (b.t -= dt));
      const before = S.buffs.length;
      S.buffs = S.buffs.filter(b => b.t > 0);
      if (S.buffs.length !== before) emit('buffs');
    }
    gainData(dataPS() * dt);
    gainCite(citePS() * dt);
    syncSlots();
    for (let i = 0; i < slotCount(); i++) processSlot(S.slots[i], dt);

    if (m.feat.has('disc')) {
      for (const d of DATA.DISCS) {
        const st = S.disc[d.id];
        if (st.f <= 0 || !discUnlocked(d.id)) continue;
        st.xp += st.f * m.discSpeed * dt;
        let up = false;
        while (st.xp >= discReq(st.lvl)) { st.xp -= discReq(st.lvl); st.lvl++; up = true; }
        if (up) markDirty();
      }
    }

    autoTimer += dt;
    if (autoTimer >= 1) {
      autoTimer = 0;
      if (m.feat.has('autoHire') && S.settings.autoHire) autoHire();
      if (m.feat.has('autoProj') && S.settings.autoProj) autoProj();
    }

    if (!offline) {
      if (S.eureka.live > 0) {
        S.eureka.live -= dt;
        if (S.eureka.live <= 0) emit('eureka-hide');
      } else {
        S.eureka.t -= dt;
        if (S.eureka.t <= 0) { S.eureka.live = 13; S.eureka.t = nextEureka(); emit('eureka-show'); }
      }
    }

    const a = Math.min(1, dt / 8);
    S.fundRate = S.fundRate * (1 - a) + (S._fundTick / dt) * a;

    achTimer += dt;
    if (achTimer >= 1) { achTimer = 0; checkAchievements(); }
  }

  function checkAchievements() {
    for (const a of DATA.ACHIEVEMENTS) {
      if (!S.ach[a.id] && a.cond(S, api)) {
        S.ach[a.id] = Date.now(); markDirty();
        log(`🏅 获得成就「${a.name}」`, 'ach');
        emit('ach', a);
      }
    }
  }

  // ───────────────────────── 传承 ─────────────────────────
  const legacyEarnable = () => Math.floor(10 * Math.pow(S.stats.life.citations / 1e5, 0.25) * mods().legacyGain);
  const pendingLegacy = () => Math.max(0, legacyEarnable() - S.legacyTotal);
  const citeForLegacy = n => Math.pow(n / (10 * mods().legacyGain), 4) * 1e5;
  const prestigeUnlocked = () => S.stats.prestiges > 0 || S.stats.life.citations >= 1e4;

  function prestige() {
    const g = pendingLegacy();
    if (g < 1) return false;
    const keep = mods().keepPapers;
    S.legacy += g; S.legacyTotal += g;
    S.stats.prestiges++;
    if (!S.stats.bestRunTime || S.stats.run.time < S.stats.bestRunTime) S.stats.bestRunTime = S.stats.run.time;
    S.data = 0; S.funding = 0; S.citations = 0; S.fundRate = 0;
    DATA.STAFF.forEach(x => (S.staff[x.id] = 0));
    DATA.PAPERS.forEach(x => (S.papers[x.id] = 0));
    const kept = {};
    if (keep) for (const id of Object.keys(S.projects)) if (/^(u_|slot)/.test(id)) kept[id] = true;
    S.projects = kept;
    S.slots = [newSlot()];
    S.buffs = [];
    S.stats.run = blankStats();
    S.stats.runStarted = Date.now();
    markDirty();
    S.funding = mods().startFund;
    clearFocus();
    syncSlots();
    log(`🔥 学术传承完成，获得 ${g} ✦。新的一代从这里开始。`, 'legacy');
    emit('reset');
    return g;
  }

  // ───────────────────────── 存档 ─────────────────────────
  const hasStorage = () => { try { return typeof localStorage !== 'undefined'; } catch (e) { return false; } };
  function serialize() { S.lastTick = Date.now(); const o = { ...S }; delete o._fundTick; return JSON.stringify(o); }
  function save() {
    if (!hasStorage()) return false;
    try { localStorage.setItem(SAVE_KEY, serialize()); return true; } catch (e) { return false; }
  }
  function loadFrom(json) {
    const saved = JSON.parse(json);
    S = merge(newState(), saved);
    S.slots = (saved.slots || []).map(sl => ({ ...newSlot(), ...sl }));
    if (!S.slots.length) S.slots = [newSlot()];
    markDirty(); syncSlots();
  }
  function load() {
    S = newState(); markDirty();
    let offline = null;
    if (hasStorage()) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) { loadFrom(raw); offline = applyOffline(); }
      } catch (e) { console.error('读档失败', e); S = newState(); markDirty(); }
    }
    return offline;
  }
  function applyOffline() {
    const m = mods();
    const real = Math.max(0, (Date.now() - (S.lastTick || Date.now())) / 1000);
    if (real < 30) return null;
    const secs = Math.min(real, m.offCap) * m.offEff;
    const before = { data: S.stats.life.data, funding: S.stats.life.funding, citations: S.stats.life.citations, papers: S.stats.life.papers };
    simulate(secs, true);
    S.eureka.live = 0;
    return {
      real, secs,
      data: S.stats.life.data - before.data, funding: S.stats.life.funding - before.funding,
      citations: S.stats.life.citations - before.citations, papers: S.stats.life.papers - before.papers,
    };
  }
  function simulate(secs, offline) {
    const steps = Math.min(2000, Math.max(1, Math.ceil(secs / 0.5)));
    const dt = secs / steps;
    for (let i = 0; i < steps; i++) tick(dt, offline);
  }
  function exportSave() {
    const json = serialize();
    return typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
  }
  function importSave(str) {
    const json = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(str.trim()))) : Buffer.from(str, 'base64').toString();
    loadFrom(json); save(); return true;
  }
  function hardReset() { if (hasStorage()) localStorage.removeItem(SAVE_KEY); S = newState(); markDirty(); }

  // ───────────────────────── 导出 API ─────────────────────────
  const api = {
    get s() { return S; }, mods, markDirty, on, emit, log,
    has: id => !!S.projects[id],
    newState, load, save, exportSave, importSave, hardReset, simulate,
    tick, click, buyStaff, buyProject, buyPerk, setSlotPaper, toggleSlot, clickSlot, slotPaper,
    allocate, clearFocus, clickEureka, prestige,
    dataPS, baseDataPS, clickValue, writeSpeed, hIndex, repMult, paperFund, paperLump, citePS, staffUnit,
    staffCost, staffMaxAfford, staffVisible, slotCount, totalFocus, usedFocus, discReq, discEffect, discUnlocked,
    availableProjects, canAfford, buffMult, legacyEarnable, pendingLegacy, citeForLegacy, prestigeUnlocked,
    fmt: n => String(Math.round(n)), // UI 会替换为本地化格式
    STAFF, PAPERS, PROJECTS, PERKS, DISCS,
  };
  root.G = api;
})(typeof window !== 'undefined' ? window : globalThis);
