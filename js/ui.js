/* 科研挂机 · 界面层 */
(function () {
  'use strict';
  const G = window.G, D = window.DATA;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = () => G.s;

  // ───────────────────────── 数字格式 ─────────────────────────
  const EN = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const CN = [[1e16, '亿亿'], [1e12, '万亿'], [1e8, '亿'], [1e4, '万']];
  const sig = v => (v >= 1000 ? Math.floor(v).toString() : v >= 100 ? (Math.floor(v * 10) / 10).toFixed(1) : (Math.floor(v * 100) / 100).toFixed(2));
  const small = n => (n >= 100 || Number.isInteger(n) ? Math.floor(n).toLocaleString('en-US') : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$|(\.\d*?)0+$/, '$1');
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    const mode = S() ? S().settings.fmt : 'cn';
    if (mode === 'sci') return n < 1e4 ? small(n) : n.toExponential(2).replace('e+', 'e');
    if (mode === 'en') {
      if (n < 1e3) return small(n);
      const i = Math.floor(Math.log10(n) / 3);
      if (i >= EN.length) return n.toExponential(2).replace('e+', 'e');
      return sig(n / Math.pow(1000, i)) + EN[i];
    }
    if (n < 1e4) return small(n);
    if (n >= 1e20) return n.toExponential(2).replace('e+', 'e');
    for (const [u, name] of CN) if (n >= u) return sig(n / u) + name;
    return small(n);
  }
  G.fmt = fmt;
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    if (d) return `${d}天${h}时`;
    if (h) return `${h}时${m}分`;
    if (m) return `${m}分${x}秒`;
    return `${x}秒`;
  }
  const costHtml = (c, cls = true) => {
    const s = S(), parts = [];
    if (c.f) parts.push(`<span class="${cls && s.funding < c.f ? 'bad' : 'good'}">¥${fmt(c.f)}</span>`);
    if (c.d) parts.push(`<span class="${cls && s.data < c.d ? 'bad' : 'good'}">🧪${fmt(c.d)}</span>`);
    if (c.c) parts.push(`<span class="${cls && s.citations < c.c ? 'bad' : 'good'}">📈${fmt(c.c)}</span>`);
    return parts.join('');
  };

  // ───────────────────────── 顶部资源 ─────────────────────────
  const RES = [
    { id: 'data', cls: 'data', icon: '🧪', label: '数据', val: () => S().data, rate: () => `+${fmt(G.dataPS())}/秒` },
    { id: 'fund', cls: 'fund', icon: '💴', label: '经费', val: () => S().funding, rate: () => `≈ +¥${fmt(S().fundRate)}/秒`, pre: '¥' },
    { id: 'cite', cls: 'cite', icon: '📈', label: '引用', val: () => S().citations, rate: () => `+${fmt(G.citePS())}/秒 · h=${fmt(G.hIndex())}` },
    { id: 'paper', cls: '', icon: '📄', label: '论文', val: () => S().stats.run.papers, rate: () => `声望 ×${G.repMult().toFixed(2)} 经费` },
    { id: 'legacy', cls: 'legacy', icon: '✦', label: '传承', val: () => S().legacy, rate: () => `总计 ${fmt(S().legacyTotal)} · 全产出 ×${G.mods().legacyMult.toFixed(2)}`, show: () => S().legacyTotal > 0 || S().stats.prestiges > 0 },
  ];
  function buildResources() {
    $('#resources').innerHTML = RES.map(r => `
      <div class="res ${r.cls}" id="res-${r.id}" title="${r.label}">
        <div class="lbl">${r.icon} ${r.label}</div>
        <div class="val">${r.pre || ''}<span></span></div>
        <div class="rate"></div>
      </div>`).join('');
  }
  function updateResources() {
    for (const r of RES) {
      const el = $('#res-' + r.id);
      if (r.show) el.style.display = r.show() ? '' : 'none';
      el.querySelector('.val span').textContent = fmt(r.val());
      el.querySelector('.rate').textContent = r.rate();
    }
  }

  // ───────────────────────── 增益 ─────────────────────────
  function updateBuffs() {
    const s = S(), box = $('#buffs');
    const key = s.buffs.map(b => b.id).join();
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = s.buffs.map(b => `<div class="buff" data-id="${b.id}">💡 <b>${esc(b.name)}</b> ${esc(b.label)} <span class="num t"></span><span class="bar"><i></i></span></div>`).join('');
    }
    s.buffs.forEach(b => {
      const el = box.querySelector(`[data-id="${b.id}"]`);
      if (!el) return;
      el.querySelector('.t').textContent = Math.ceil(b.t) + 's';
      el.querySelector('.bar i').style.width = (b.t / b.dur * 100) + '%';
    });
    $('#flask').classList.toggle('frenzy', s.buffs.some(b => b.kind === 'data' || b.kind === 'click'));
  }

  // ───────────────────────── 实验台 ─────────────────────────
  let fxCount = 0;
  function spawnFloat(x, y, text, color) {
    if (!S().settings.particles || fxCount > 40) return;
    const layer = $('#fx-layer');
    const el = document.createElement('div');
    el.className = 'float-num';
    el.textContent = text;
    el.style.left = (x - 20 + Math.random() * 20) + 'px';
    el.style.top = (y - 20) + 'px';
    el.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    if (color) el.style.color = color;
    layer.appendChild(el); fxCount++;
    for (let i = 0; i < 4; i++) {
      const sp = document.createElement('div');
      sp.className = 'spark';
      sp.style.left = x + 'px'; sp.style.top = y + 'px';
      const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 40;
      sp.style.setProperty('--dx', Math.cos(a) * r + 'px');
      sp.style.setProperty('--dy', Math.sin(a) * r + 'px');
      layer.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
    setTimeout(() => { el.remove(); fxCount--; }, 1000);
  }
  function initBench() {
    const flask = $('#flask');
    flask.addEventListener('pointerdown', e => {
      e.preventDefault();
      const v = G.click();
      flask.classList.remove('pop'); void flask.offsetWidth; flask.classList.add('pop');
      const rect = flask.getBoundingClientRect();
      const x = e.clientX || rect.left + rect.width / 2, y = e.clientY || rect.top + rect.height / 2;
      spawnFloat(x, y, '+' + fmt(v));
    });
    flask.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const v = G.click();
        const r = flask.getBoundingClientRect();
        spawnFloat(r.left + r.width / 2, r.top + r.height / 3, '+' + fmt(v));
      }
    });
  }
  function updateBench() {
    $('#click-val').textContent = fmt(G.clickValue());
    $('#dps').textContent = fmt(G.dataPS());
    // 液面高度随数据/秒的数量级上升
    const lvl = Math.min(1, Math.log10(1 + G.dataPS()) / 14);
    $('.liquid-wrap').style.transform = `translateY(${(-lvl * 70).toFixed(1)}px)`;
  }

  // ───────────────────────── 写作台 ─────────────────────────
  let slotKey = '';
  function buildSlots() {
    const s = S(), m = G.mods(), n = G.slotCount();
    const papers = D.PAPERS.filter(p => m.papers.has(p.id));
    const auto = m.feat.has('autoPaper');
    slotKey = n + '|' + papers.length + '|' + auto;
    const opts = (auto ? '<option value="auto">🤖 自动选题</option>' : '') + papers.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('');
    $('#slots').innerHTML = Array.from({ length: n }, (_, i) => `
      <div class="slot" data-i="${i}">
        <div class="slot-head">
          <select aria-label="论文类型">${opts}</select>
          <button class="icon-btn toggle-btn" title="暂停/继续"></button>
        </div>
        <div class="slot-bar" title="点击可加快写作"><div class="fill"></div><div class="txt"><span class="a"></span><span class="b num"></span></div></div>
        <div class="slot-meta"></div>
        <div class="slot-tip"></div>
      </div>`).join('');
    $('#slots').querySelectorAll('.slot').forEach(el => {
      const i = +el.dataset.i;
      const sel = el.querySelector('select');
      sel.value = s.slots[i].paper;
      if (sel.value !== s.slots[i].paper) { G.setSlotPaper(i, sel.value); }
      sel.addEventListener('change', () => G.setSlotPaper(i, sel.value));
      el.querySelector('.toggle-btn').addEventListener('click', () => G.toggleSlot(i));
      el.querySelector('.slot-bar').addEventListener('pointerdown', e => {
        if (G.clickSlot(i)) spawnFloat(e.clientX, e.clientY, '✍️', 'var(--ink-2)');
      });
    });
  }
  function updateSlots() {
    const s = S(), m = G.mods();
    const key = G.slotCount() + '|' + D.PAPERS.filter(p => m.papers.has(p.id)).length + '|' + m.feat.has('autoPaper');
    if (key !== slotKey) buildSlots();
    const ws = G.writeSpeed();
    $('#desk-sub').textContent = `写作速度 ×${ws < 100 ? ws.toFixed(2) : fmt(ws)}`;
    $('#slots').querySelectorAll('.slot').forEach(el => {
      const i = +el.dataset.i, sl = s.slots[i];
      if (!sl) return;
      const pid = G.slotPaper(sl), p = G.PAPERS[pid];
      const bar = el.querySelector('.slot-bar');
      const time = p.time / ws;
      const pct = sl.paid ? Math.min(1, sl.prog / p.time) : 0;
      el.querySelector('.toggle-btn').textContent = sl.on ? '⏸' : '▶';
      bar.classList.toggle('paused', !sl.on);
      bar.classList.toggle('wait', sl.on && !sl.paid);
      bar.classList.toggle('fast', sl.paid && time < 0.35);
      bar.querySelector('.fill').style.width = (pct * 100).toFixed(1) + '%';
      let a, b;
      if (!sl.on) { a = '已暂停'; b = ''; }
      else if (!sl.paid) { a = `等待数据…`; b = `${fmt(s.data)} / ${fmt(p.cost)}`; }
      else { a = `${p.icon} 撰写中${sl.paper === 'auto' ? '（自动）' : ''}`; b = time < 0.35 ? `${(1 / time).toFixed(1)} 篇/秒` : `${(pct * 100).toFixed(0)}% · ${(time * (1 - pct)).toFixed(1)}s`; }
      bar.querySelector('.a').textContent = a;
      bar.querySelector('.b').textContent = b;
      el.querySelector('.slot-meta').innerHTML =
        `<span>消耗 <b>🧪${fmt(p.cost)}</b></span><span>经费 <b>¥${fmt(G.paperFund(pid))}</b></span>` +
        (p.lump ? `<span>引用 <b>+${fmt(G.paperLump(pid))}</b></span>` : '') +
        `<span>用时 <b>${time < 10 ? time.toFixed(2) : time.toFixed(0)}s</b></span>`;
      let tip = '';
      if (sl.paper !== 'auto') {
        const idx = D.PAPERS.findIndex(x => x.id === pid);
        const better = D.PAPERS.filter((x, j) => j > idx && m.papers.has(x.id) && x.cost <= s.data).pop();
        if (better && s.data > p.cost * 20) tip = `💡 数据积压了，试试更高级的「${better.icon} ${better.name}」`;
      }
      const tipEl = el.querySelector('.slot-tip');
      if (tipEl.textContent !== tip) tipEl.textContent = tip;
    });
    const tally = D.PAPERS.filter(p => s.papers[p.id] > 0).map(p => `<span title="${p.name}">${p.icon} ${fmt(s.papers[p.id])}</span>`).join('');
    const t = $('#paper-tally');
    if (t.innerHTML !== tally) t.innerHTML = tally;
  }

  // ───────────────────────── 日志 / 提示 ─────────────────────────
  function addLog(msg, kind, t) {
    const li = document.createElement('li');
    li.className = 'k-' + kind;
    const d = new Date(t || Date.now());
    const p2 = n => String(n).padStart(2, '0');
    const day = d.toDateString() === new Date().toDateString() ? '' : `${d.getMonth() + 1}/${d.getDate()} `;
    li.innerHTML = `<time>${day}${p2(d.getHours())}:${p2(d.getMinutes())}</time>${esc(msg)}`;
    const ol = $('#log');
    ol.prepend(li);
    while (ol.children.length > 80) ol.lastChild.remove();
  }
  function toast(html, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = html;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3600);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  }

  // ───────────────────────── 模态框 ─────────────────────────
  function modal(html, onMount) {
    $('#modal-card').innerHTML = html;
    $('#modal').classList.remove('hidden');
    $('#modal-card').querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    if (onMount) onMount($('#modal-card'));
  }
  function closeModal() { $('#modal').classList.add('hidden'); }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal').dataset.lock) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').dataset.lock) closeModal(); });

  // ───────────────────────── 标签页 ─────────────────────────
  const TABS = [
    { id: 'lab', name: '实验室', show: () => true },
    { id: 'proj', name: '课题', show: () => S().stats.life.funding >= 20 },
    { id: 'disc', name: '学科', show: () => G.mods().feat.has('disc') },
    { id: 'legacy', name: '传承', show: () => G.prestigeUnlocked() },
    { id: 'ach', name: '成就', show: () => Object.keys(S().ach).length > 0 },
    { id: 'stats', name: '统计', show: () => true },
    { id: 'settings', name: '设置', show: () => true },
  ];
  let tab = 'lab', tabKey = '', bodyKey = '';
  const seenTabs = new Set(['lab', 'stats', 'settings']);
  function updateTabs() {
    const vis = TABS.filter(t => t.show());
    const key = vis.map(t => t.id).join();
    if (key !== tabKey) {
      tabKey = key;
      $('#tabs').innerHTML = vis.map(t => `<button class="tab" role="tab" data-tab="${t.id}">${t.name}</button>`).join('');
      $('#tabs').querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; seenTabs.add(tab); bodyKey = ''; renderTab(true); }));
    }
    $('#tabs').querySelectorAll('.tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.classList.toggle('new', !seenTabs.has(b.dataset.tab) && b.dataset.tab !== tab);
    });
    const pb = $('#tabs').querySelector('[data-tab="proj"]');
    if (pb) {
      const n = G.availableProjects().filter(p => G.canAfford(p.cost)).length;
      let badge = pb.querySelector('.badge');
      if (n && tab !== 'proj') { if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; pb.appendChild(badge); } badge.textContent = n; }
      else if (badge) badge.remove();
    }
  }

  const VIEWS = {};
  function renderTab(force) {
    const v = VIEWS[tab];
    const key = tab + '|' + v.key();
    if (force || key !== bodyKey) { bodyKey = key; $('#tab-body').innerHTML = v.build(); v.bind && v.bind($('#tab-body')); }
    v.update($('#tab-body'));
  }

  // 实验室
  VIEWS.lab = {
    key: () => {
      const vis = D.STAFF.filter(x => G.staffVisible(x.id)).length;
      return vis + '|' + S().settings.buyAmt + '|' + G.mods().feat.has('autoHire');
    },
    build() {
      const s = S(), m = G.mods();
      const vis = D.STAFF.filter(x => G.staffVisible(x.id));
      const next = D.STAFF.find(x => !G.staffVisible(x.id));
      const amts = [1, 10, 100, 'max'];
      return `
        <div class="toolbar">
          <div class="seg" id="buyamt">${amts.map(a => `<button data-a="${a}" class="${s.settings.buyAmt === a ? 'on' : ''}">${a === 'max' ? '最大' : '×' + a}</button>`).join('')}</div>
          ${m.feat.has('autoHire') ? `<label class="toggle"><input type="checkbox" id="autohire" ${s.settings.autoHire ? 'checked' : ''}> 自动招聘</label>` : ''}
          <span class="spacer"></span><span class="hint">人员持续产出数据。数据写成论文换取经费。</span>
        </div>
        <div class="staff-list">
          ${vis.map(x => `
            <div class="staff" data-id="${x.id}">
              <div class="ico">${x.icon}</div>
              <div>
                <div class="name">${x.name} <span class="count num"></span></div>
                <div class="desc">${x.desc}</div>
                <div class="prod"></div>
              </div>
              <button class="buy"><span class="l"></span><small></small></button>
            </div>`).join('')}
          ${next ? `<div class="staff mystery"><div class="ico">${next.icon}</div><div><div class="name">？？？</div><div class="desc">继续积累经费以解锁新的研究力量……</div></div></div>` : ''}
        </div>`;
    },
    bind(root) {
      root.querySelectorAll('#buyamt button').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.a; S().settings.buyAmt = a === 'max' ? 'max' : +a;
      }));
      const ah = root.querySelector('#autohire');
      if (ah) ah.addEventListener('change', () => (S().settings.autoHire = ah.checked));
      root.querySelectorAll('.staff[data-id] .buy').forEach(b => b.addEventListener('click', () => {
        const id = b.closest('.staff').dataset.id;
        G.buyStaff(id, S().settings.buyAmt);
      }));
    },
    update(root) {
      const s = S(), amt = s.settings.buyAmt, total = G.baseDataPS() || 1;
      root.querySelectorAll('.staff[data-id]').forEach(el => {
        const id = el.dataset.id;
        const n = amt === 'max' ? Math.max(1, G.staffMaxAfford(id)) : amt;
        const cost = G.staffCost(id, n), unit = G.staffUnit(id), own = s.staff[id];
        el.querySelector('.count').textContent = own ? '×' + own : '';
        el.querySelector('.prod').textContent = `每个 ${fmt(unit)}/秒` + (own ? ` · 共 ${fmt(unit * own)}/秒（${(unit * own / total * 100).toFixed(1)}%）` : '');
        const btn = el.querySelector('.buy');
        btn.disabled = cost > s.funding;
        btn.querySelector('.l').textContent = `招募 ×${n}`;
        btn.querySelector('small').textContent = '¥' + fmt(cost);
      });
    },
  };

  // 课题
  VIEWS.proj = {
    key: () => G.availableProjects().map(p => p.id).join() + '|' + G.mods().feat.has('autoProj') + '|' + Object.keys(S().projects).length,
    build() {
      const s = S(), m = G.mods();
      const list = G.availableProjects();
      const done = D.PROJECTS.filter(p => s.projects[p.id]);
      return `
        <div class="toolbar">
          ${m.feat.has('autoProj') ? `<label class="toggle"><input type="checkbox" id="autoproj" ${s.settings.autoProj ? 'checked' : ''}> 自动立项</label>` : ''}
          <span class="spacer"></span><span class="hint">课题是一次性的永久升级（传承时重置）。</span>
        </div>
        ${list.length ? '' : '<p class="hint">暂时没有可立项的课题。继续积累经费与引用吧。</p>'}
        <div class="proj-grid">
          ${list.map(p => `
            <button class="proj ${p.ending ? 'end' : ''}" data-id="${p.id}">
              <div class="ph"><span class="i">${p.icon}</span><span>${esc(p.name)}</span></div>
              <div class="pd">${esc(p.desc)}</div>
              <div class="pc"></div>
            </button>`).join('')}
        </div>
        ${done.length ? `<details><summary>已完成课题（${done.length}）</summary><div class="done-list">${done.map(p => `<span title="${esc(p.name)}：${esc(p.desc)}">${p.icon}</span>`).join('')}</div></details>` : ''}`;
    },
    bind(root) {
      const ap = root.querySelector('#autoproj');
      if (ap) ap.addEventListener('change', () => (S().settings.autoProj = ap.checked));
      root.querySelectorAll('.proj').forEach(b => b.addEventListener('click', () => {
        const p = G.PROJECTS[b.dataset.id];
        if (p.ending) { if (G.canAfford(p.cost)) confirmEnding(p); return; }
        G.buyProject(b.dataset.id);
      }));
    },
    update(root) {
      root.querySelectorAll('.proj').forEach(b => {
        const p = G.PROJECTS[b.dataset.id];
        const ok = G.canAfford(p.cost);
        b.classList.toggle('ok', ok); b.classList.toggle('no', !ok);
        b.querySelector('.pc').innerHTML = costHtml(p.cost);
      });
    },
  };

  // 学科
  let focusStep = 1;
  VIEWS.disc = {
    key: () => G.totalFocus() + '|' + focusStep + '|' + D.DISCS.filter(d => G.discUnlocked(d.id)).length,
    build() {
      const steps = [1, 5, 25, 'max'];
      return `
        <div class="focus-head">
          <div>可用精力 <span class="focus-pool" id="fpool"></span></div>
          <div class="seg" id="fstep">${steps.map(a => `<button data-a="${a}" class="${focusStep === a ? 'on' : ''}">${a === 'max' ? '全部' : a}</button>`).join('')}</div>
          <button class="btn" id="fclear">全部撤回</button>
          <span class="hint">精力投入学科后会持续获得经验并升级。等级永久保留，传承也不会清空。</span>
        </div>
        <div class="disc-list">
          ${D.DISCS.map(d => {
            const un = G.discUnlocked(d.id);
            return `
            <div class="disc ${un ? '' : 'locked'}" data-id="${d.id}">
              <div class="ico">${un ? d.icon : '🔒'}</div>
              <div>
                <div class="top"><b>${d.name}</b><span class="lv"></span><span class="eff"></span></div>
                <div class="xpbar"><i></i></div>
                <div class="hint xp"></div>
              </div>
              <div class="ctl">${un ? `<button class="icon-btn" data-d="-1">−</button><span class="alloc"></span><button class="icon-btn" data-d="1">＋</button>` : '<span class="hint">需要传承天赋</span>'}</div>
            </div>`;
          }).join('')}
        </div>`;
    },
    bind(root) {
      root.querySelectorAll('#fstep button').forEach(b => b.addEventListener('click', () => { const a = b.dataset.a; focusStep = a === 'max' ? 'max' : +a; }));
      root.querySelector('#fclear').addEventListener('click', () => G.clearFocus());
      root.querySelectorAll('.disc [data-d]').forEach(b => b.addEventListener('click', () => {
        const id = b.closest('.disc').dataset.id, dir = +b.dataset.d;
        const amt = focusStep === 'max' ? 1e9 : focusStep;
        G.allocate(id, dir * amt);
      }));
    },
    update(root) {
      const s = S(), m = G.mods();
      root.querySelector('#fpool').textContent = `${G.totalFocus() - G.usedFocus()} / ${G.totalFocus()}`;
      root.querySelectorAll('.disc').forEach(el => {
        const d = G.DISCS[el.dataset.id], st = s.disc[d.id];
        const req = G.discReq(st.lvl), rate = st.f * m.discSpeed;
        const e = G.discEffect(d.id);
        el.querySelector('.lv').textContent = 'Lv.' + st.lvl;
        el.querySelector('.eff').textContent = `${d.eff} ${d.kind === 'add' ? '+' + ((e - 1) * 100).toFixed(0) + '%' : '×' + e.toFixed(e < 10 ? 3 : 1)}`;
        el.querySelector('.xpbar i').style.width = (st.xp / req * 100).toFixed(1) + '%';
        el.querySelector('.xp').textContent = `${fmt(st.xp)} / ${fmt(req)} 经验` + (rate > 0 ? ` · 升级还需 ${fmtTime((req - st.xp) / rate)}` : '');
        const a = el.querySelector('.alloc');
        if (a) a.textContent = st.f;
      });
    },
  };

  // 传承
  VIEWS.legacy = {
    key: () => Object.keys(S().perks).length + '|' + S().legacyTotal,
    build() {
      return `
        <p class="hint" style="margin-top:0">年岁渐长，是时候把衣钵传给学生了。<b>学术传承</b>会重置本轮的数据、经费、引用、人员、论文与课题，
        但根据你<b>生涯累计引用</b>获得 <b style="color:var(--amber)">✦ 传承点</b>。每个获得过的 ✦ 永久提升数据产出 2%，未花费的 ✦ 还能用来习得传承天赋。学科等级与成就会保留。</p>
        <div class="legacy-box">
          <div class="stat-card"><div class="k">生涯累计引用</div><div class="v" id="lg-cite"></div></div>
          <div class="stat-card"><div class="k">传承后可获得</div><div class="v" id="lg-pend" style="color:var(--amber)"></div></div>
          <div class="stat-card"><div class="k">下一个 ✦ 需要累计引用</div><div class="v" id="lg-next"></div></div>
          <div class="stat-card"><div class="k">可用 / 累计 ✦</div><div class="v" id="lg-have"></div></div>
        </div>
        <button class="big-btn" id="do-prestige">🔥 学术传承</button>
        <div class="perk-grid">
          ${D.PERKS.map(p => `
            <button class="perk" data-id="${p.id}">
              <div class="ph">${p.icon} ${p.name}</div>
              <div class="pd">${p.desc}</div>
              <div class="pc">✦ ${fmt(p.cost)}</div>
            </button>`).join('')}
        </div>`;
    },
    bind(root) {
      root.querySelector('#do-prestige').addEventListener('click', confirmPrestige);
      root.querySelectorAll('.perk').forEach(b => b.addEventListener('click', () => G.buyPerk(b.dataset.id)));
    },
    update(root) {
      const s = S();
      const pend = G.pendingLegacy();
      root.querySelector('#lg-cite').textContent = fmt(s.stats.life.citations);
      root.querySelector('#lg-pend').textContent = '+' + fmt(pend) + ' ✦';
      root.querySelector('#lg-next').textContent = fmt(G.citeForLegacy(G.legacyEarnable() + 1));
      root.querySelector('#lg-have').textContent = `${fmt(s.legacy)} / ${fmt(s.legacyTotal)}`;
      root.querySelector('#do-prestige').disabled = pend < 1;
      root.querySelectorAll('.perk').forEach(b => {
        const p = G.PERKS[b.dataset.id], own = !!s.perks[p.id];
        b.classList.toggle('owned', own);
        b.classList.toggle('ok', !own && s.legacy >= p.cost);
        b.classList.toggle('no', !own && s.legacy < p.cost);
        b.querySelector('.pc').textContent = own ? '✔ 已习得' : '✦ ' + fmt(p.cost);
      });
    },
  };

  // 成就
  VIEWS.ach = {
    key: () => Object.keys(S().ach).length,
    build() {
      const s = S(), got = Object.keys(s.ach).length;
      return `
        <p class="hint" style="margin-top:0">已获得 <b>${got}</b> / ${D.ACHIEVEMENTS.length} 项成就。每项成就使数据产出 +1%（当前 ×${G.mods().achMult.toFixed(2)}）。</p>
        <div class="ach-grid">
          ${D.ACHIEVEMENTS.map(a => {
            const g = !!s.ach[a.id];
            const hidden = a.hidden && !g;
            return `<div class="ach ${g ? 'got' : ''}" title="${esc(hidden ? '隐藏成就' : a.desc)}">
              <div class="i">${hidden ? '❔' : a.icon}</div>
              <div><div class="n">${hidden ? '？？？' : esc(a.name)}</div><div class="d">${hidden ? '隐藏成就' : esc(a.desc)}</div></div>
            </div>`;
          }).join('')}
        </div>`;
    },
    update() {},
  };

  // 统计
  VIEWS.stats = {
    key: () => '',
    build: () => '<div id="stats-body"></div>',
    update(root) {
      const s = S(), r = s.stats.run, l = s.stats.life, m = G.mods();
      const rows = [
        ['本轮', [
          ['游戏时长', fmtTime(r.time)], ['获得数据', fmt(r.data)], ['获得经费', '¥' + fmt(r.funding)], ['获得引用', fmt(r.citations)],
          ['发表论文', fmt(r.papers)], ['点击实验', fmt(r.clicks)], ['抓住灵感', fmt(r.eurekas)],
        ]],
        ['生涯', [
          ['总时长', fmtTime(l.time)], ['累计数据', fmt(l.data)], ['累计经费', '¥' + fmt(l.funding)], ['累计引用', fmt(l.citations)],
          ['累计论文', fmt(l.papers)], ['累计点击', fmt(l.clicks)], ['累计灵感', fmt(l.eurekas)], ['学术传承次数', s.stats.prestiges],
          ['最快一轮传承', s.stats.bestRunTime ? fmtTime(s.stats.bestRunTime) : '—'], ['单秒最高点击', s.stats.maxCps],
        ]],
        ['加成', [
          ['点击倍率', '×' + fmt(m.click)], ['数据倍率', '×' + fmt(m.data * m.all)], ['经费倍率（含声望）', '×' + fmt(m.fund * G.repMult())],
          ['写作速度', '×' + fmt(m.write)], ['引用倍率', '×' + fmt(m.cite)], ['人员成本', '×' + m.cost.toFixed(3)],
          ['灵感频率', '×' + m.eureka.toFixed(2)], ['离线效率 / 上限', `${Math.round(m.offEff * 100)}% / ${fmtTime(m.offCap)}`],
        ]],
      ];
      const html = '<table class="stat-table">' + rows.map(([h, rs]) => `<tr><th colspan="2">${h}</th></tr>` + rs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')).join('') + '</table>';
      root.querySelector('#stats-body').innerHTML = html;
    },
  };

  // 设置
  VIEWS.settings = {
    key: () => S().settings.fmt + S().settings.theme,
    build() {
      const st = S().settings;
      const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, n]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
      return `
        <div class="settings">
          <div class="row"><label>数字格式</label>${seg('set-fmt', [['cn', '万/亿'], ['en', 'K/M/B'], ['sci', '科学计数']], st.fmt)}</div>
          <div class="row"><label>主题</label>${seg('set-theme', [['auto', '跟随系统'], ['light', '纸质笔记'], ['dark', '夜间实验室']], st.theme)}</div>
          <div class="row"><label>特效</label><label class="toggle"><input type="checkbox" id="set-part" ${st.particles ? 'checked' : ''}> 点击飘字与粒子</label>
            <label class="toggle"><input type="checkbox" id="set-ticker" ${st.ticker ? 'checked' : ''}> 学术快讯</label></div>
          <div class="row"><label>存档</label>
            <button class="btn primary" id="set-save">💾 立即保存</button>
            <button class="btn" id="set-export">导出存档</button>
            <button class="btn" id="set-import">导入存档</button>
            <span class="hint">每 15 秒自动保存到本地浏览器。</span></div>
          <div class="row"><label>危险区</label><button class="btn danger" id="set-reset">删除存档并重新开始</button></div>
          <div class="row"><label>关于</label><span class="hint">《科研挂机》灵感来自 Cookie Clicker、Universal Paperclips、Kittens Game、Melvor Idle 与 NGU Idle。<br>所有数据只保存在你的浏览器中。<br>源码：<a href="https://github.com/QIANJINYDX/research-idle" target="_blank" rel="noopener" style="color:var(--blue)">github.com/QIANJINYDX/research-idle</a><br><img src="${COUNTER_VIEW}" alt="访问量" style="margin-top:6px;height:20px" loading="lazy"></span></div>
          <div class="row"><label></label><button class="btn" id="set-help">📖 玩法说明</button></div>
        </div>`;
    },
    bind(root) {
      const s = S();
      root.querySelectorAll('#set-fmt button').forEach(b => b.addEventListener('click', () => { s.settings.fmt = b.dataset.v; }));
      root.querySelectorAll('#set-theme button').forEach(b => b.addEventListener('click', () => { s.settings.theme = b.dataset.v; applyTheme(); }));
      root.querySelector('#set-part').addEventListener('change', e => (s.settings.particles = e.target.checked));
      root.querySelector('#set-ticker').addEventListener('change', e => { s.settings.ticker = e.target.checked; $('#ticker').style.display = e.target.checked ? '' : 'none'; });
      root.querySelector('#set-save').addEventListener('click', () => { G.save(); toast('💾 已保存'); });
      root.querySelector('#set-export').addEventListener('click', () => {
        const str = G.exportSave();
        modal(`<h2>导出存档</h2><p>复制下面的文本妥善保存：</p><textarea class="save-box" readonly>${str}</textarea>
          <div class="actions"><button class="btn" id="cp">复制</button><button class="btn primary" data-close>关闭</button></div>`, card => {
          const ta = card.querySelector('textarea'); ta.select();
          card.querySelector('#cp').addEventListener('click', () => { ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(str) : Promise.reject()).then(() => toast('已复制到剪贴板'), () => { document.execCommand('copy'); toast('已复制'); }); });
        });
      });
      root.querySelector('#set-import').addEventListener('click', () => {
        modal(`<h2>导入存档</h2><p>粘贴导出的存档文本。当前进度将被覆盖。</p><textarea class="save-box" id="imp"></textarea>
          <div class="actions"><button class="btn" data-close>取消</button><button class="btn primary" id="go">导入</button></div>`, card => {
          card.querySelector('#go').addEventListener('click', () => {
            try { G.importSave(card.querySelector('#imp').value); location.reload(); }
            catch (e) { toast('❌ 存档格式不正确'); }
          });
        });
      });
      root.querySelector('#set-reset').addEventListener('click', () => {
        modal(`<h2>确定要删除存档吗？</h2><p>所有进度（包括传承、成就、学科）都将永久消失，且无法恢复。</p>
          <div class="actions"><button class="btn primary" data-close>算了</button><button class="btn danger" id="go">我确定，删除一切</button></div>`, card => {
          card.querySelector('#go').addEventListener('click', () => { resetting = true; G.hardReset(); location.reload(); });
        });
      });
      root.querySelector('#set-help').addEventListener('click', showHelp);
    },
    update() {},
  };

  function applyTheme() {
    document.documentElement.dataset.theme = S().settings.theme;
    const dark = S().settings.theme === 'dark' || (S().settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#10151e' : '#f4efe1';
  }

  // ───────────────────────── 弹窗流程 ─────────────────────────
  function confirmPrestige() {
    const g = G.pendingLegacy();
    if (g < 1) return;
    modal(`<h2>🔥 学术传承</h2>
      <p>你将获得 <b style="color:var(--amber)">${fmt(g)} ✦</b>，累计达到 ${fmt(S().legacyTotal + g)} ✦（数据产出 ×${(1 + 0.02 * (S().legacyTotal + g)).toFixed(2)}）。</p>
      <p>本轮的数据、经费、引用、人员、论文、课题都将重置。学科等级、成就、传承天赋会保留。</p>
      <div class="actions"><button class="btn" data-close>再等等</button><button class="btn danger" id="go">传承衣钵</button></div>`, card => {
      card.querySelector('#go').addEventListener('click', () => {
        G.prestige(); closeModal(); bodyKey = ''; slotKey = '';
        $('#nb-no').textContent = S().stats.prestiges + 1;
        G.save();
      });
    });
  }
  function confirmEnding(p) {
    modal(`<h2>${p.icon} ${p.name}</h2><p>${p.desc}</p><p>这是最后一个课题。完成它，你的研究将抵达终点。（游戏可以继续进行）</p>
      <div class="actions"><button class="btn" data-close>还没准备好</button><button class="btn primary" id="go">开始最后的研究</button></div>`, card => {
      card.querySelector('#go').addEventListener('click', () => { G.buyProject(p.id); });
    });
  }
  const ENDING = [
    '方程在黑板上缓缓收敛。',
    '引力、电磁、强、弱——四种相互作用在同一个对称性下合而为一。',
    '你想起第一次握住那只烧瓶的下午。那时你只想知道，下一组数据会不会更好看一点。',
    '后来有了学生，有了学生的学生。实验室的灯一盏一盏亮起，又一代一代传下去。',
    '而现在，宇宙里再也没有无法解释的东西了。',
    '……除了一件事：',
    '「Reviewer #2 对本文的创新性仍有保留意见。」',
  ];
  function showEnding() {
    const s = S();
    $('#modal').dataset.lock = '1';
    modal(`<h2>🌌 万物理论</h2><div class="ending-text">${ENDING.map((t, i) => `<p style="animation-delay:${i * 1.6}s">${esc(t)}</p>`).join('')}</div>
      <p class="hint" style="margin-top:14px">生涯总时长 ${fmtTime(s.stats.life.time)} · 累计论文 ${fmt(s.stats.life.papers)} 篇 · 累计引用 ${fmt(s.stats.life.citations)} · 传承 ${s.stats.prestiges} 代</p>
      <div class="actions"><button class="btn primary" id="go">继续研究</button></div>`, card => {
      card.querySelector('#go').addEventListener('click', () => { delete $('#modal').dataset.lock; closeModal(); });
    });
  }
  function showHelp() {
    modal(`<h2>📖 玩法说明</h2>
      <ul>
        <li><b>做实验</b>：点击烧瓶获得 🧪 数据。</li>
        <li><b>写论文</b>：写作台会自动消耗数据撰写论文，发表后获得 💴 经费与 📈 引用。点击进度条可以加快写作。更高级的论文需要在「课题」中解锁。</li>
        <li><b>招人</b>：用经费招募人员和建设设施，他们会持续产出数据。</li>
        <li><b>课题</b>：一次性的永久升级，提升各种产出，解锁新功能。</li>
        <li><b>引用</b>：已发表的论文会持续被引用。引用决定 h 指数（声望），声望提高论文的经费回报。</li>
        <li><b>💡 灵光一闪</b>：屏幕上偶尔会出现发光的灯泡，抓住它获得强力增益！</li>
        <li><b>学科</b>：分配精力，让学科持续升级，获得永久加成。</li>
        <li><b>学术传承</b>：累计引用足够多后，可以重置本轮以换取永久的 ✦ 传承点。</li>
        <li><b>离线收益</b>：关闭页面后，研究仍会以 50% 效率继续（最多 12 小时）。</li>
      </ul>
      <p>最终目标：完成「万物理论」。</p>
      <div class="actions"><button class="btn primary" data-close>开始科研！</button></div>`);
  }

  // ───────────────────────── 灵光一闪 ─────────────────────────
  function showEureka() {
    const layer = $('#eureka-layer');
    layer.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'eureka'; b.textContent = '💡'; b.setAttribute('aria-label', '灵光一闪');
    const w = innerWidth, h = innerHeight;
    b.style.left = (40 + Math.random() * (w - 140)) + 'px';
    b.style.top = (90 + Math.random() * (h - 220)) + 'px';
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      const msg = G.clickEureka();
      if (msg) { toast('💡 ' + esc(msg), 'eureka'); spawnFloat(e.clientX, e.clientY, '灵光一闪！', 'var(--amber)'); }
      hideEureka();
    });
    layer.appendChild(b);
  }
  function hideEureka() {
    const b = $('#eureka-layer .eureka');
    if (b) { b.classList.add('out'); setTimeout(() => b.remove(), 600); }
  }

  // ───────────────────────── 快讯 ─────────────────────────
  let lastNews = -1;
  function nextNews() {
    const s = S();
    const pool = D.NEWS.map((n, i) => [n, i]).filter(([n]) => n[0](s));
    let pick;
    do { pick = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && pick[1] === lastNews);
    lastNews = pick[1];
    if (pick[0][2] === 'r2') s.stats.saw2 = true;
    const el = $('#ticker-text');
    el.textContent = pick[0][1];
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }

  // ───────────────────────── 访问计数 ─────────────────────────
  // 游戏页每个浏览器会话计一次；README 与设置页用 query_only 只读，不会增加计数。
  const COUNTER = 'https://visitor-badge.laobi.icu/badge?page_id=qianjinydx.research-idle';
  const COUNTER_VIEW = COUNTER + '&query_only=true&left_text=%E8%AE%BF%E9%97%AE%E9%87%8F%20%20%20&left_color=%23232e47&right_color=%232e7b49';
  function countVisit() {
    const local = !/^https?:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test|local)$/.test(location.hostname);
    if (local) return;
    try { if (sessionStorage.getItem('ri-counted')) return; sessionStorage.setItem('ri-counted', '1'); } catch (e) { /* 无痕模式等：照常计数 */ }
    new Image().src = COUNTER;
  }

  // ───────────────────────── 启动 ─────────────────────────
  let resetting = false;
  function boot() {
    G.on('ach', a => toast(`🏅 获得成就 <b>${esc(a.name)}</b><br><small>${esc(a.desc)}</small>`));
    G.on('eureka-show', showEureka);
    G.on('eureka-hide', hideEureka);
    G.on('ending', () => setTimeout(showEnding, 300));

    const offline = G.load();
    applyTheme();
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
    buildResources();
    initBench();
    $('#nb-no').textContent = S().stats.prestiges + 1;
    if (!S().settings.ticker) $('#ticker').style.display = 'none';
    S().logs.forEach(e => addLog(e.m, e.k, e.t));
    G.on('log', addLog);
    addLog('欢迎回到实验室。', 'info');
    if (S().eureka.live > 0) showEureka();

    if (offline && offline.secs > 0) {
      modal(`<h2>☕ 欢迎回来</h2>
        <p>你离开了 <b>${fmtTime(offline.real)}</b>。课题组没有停下脚步（按 ${fmtTime(offline.secs)} 计算）：</p>
        <ul>
          <li>🧪 获得数据 <b>${fmt(offline.data)}</b></li>
          <li>💴 获得经费 <b>¥${fmt(offline.funding)}</b></li>
          <li>📄 发表论文 <b>${fmt(offline.papers)}</b> 篇</li>
          <li>📈 获得引用 <b>${fmt(offline.citations)}</b></li>
        </ul>
        <div class="actions"><button class="btn primary" data-close>继续科研</button></div>`);
    } else if (S().stats.life.clicks === 0 && S().stats.life.time < 5) {
      showHelp();
    }

    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      let dt = (now - last) / 1000; last = now;
      if (dt <= 0) return;
      if (dt > 1) G.simulate(Math.min(dt, 3600 * 24), false); // 标签页休眠后补算
      else G.tick(dt);
      render();
    }, 100);
    setInterval(() => { if (!resetting) G.save(); }, 15000);
    addEventListener('beforeunload', () => { if (!resetting) G.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !resetting) G.save(); });
    nextNews();
    countVisit();
    setInterval(() => { if (S().settings.ticker) nextNews(); }, 11000);
    render();
  }

  let frame = 0;
  function render() {
    frame++;
    updateResources();
    updateBuffs();
    updateBench();
    updateSlots();
    if (frame % 3 === 1) updateTabs();
    if (!VIEWS[tab] || !TABS.find(t => t.id === tab).show()) tab = 'lab';
    renderTab(false);
  }

  boot();
})();
