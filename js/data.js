/* 科研挂机 · 游戏内容定义
 * 所有数值、文本都集中在这里，方便平衡调整。 */
(function (root) {
  'use strict';

  // ───────────────────────── 人员 / 设施（Cookie Clicker 式生产者） ─────────────────────────
  const STAFF = [
    { id: 'intern',     name: '本科实习生',     icon: '🧑‍🎓', cost: 15,     prod: 0.1,   desc: '洗试管、贴标签，偶尔打翻烧杯。' },
    { id: 'master',     name: '硕士研究生',     icon: '📚', cost: 100,    prod: 1,     desc: '精通 Excel，熟练掌握熬夜。' },
    { id: 'phd',        name: '博士研究生',     icon: '🥼', cost: 1100,   prod: 8,     desc: '第五年了，还在等那个显著的 p 值。' },
    { id: 'postdoc',    name: '博士后',         icon: '🧑‍🔬', cost: 1.2e4,  prod: 47,    desc: '两年一签的合同，稳定高效的产出。' },
    { id: 'researcher', name: '副研究员',       icon: '👩‍🏫', cost: 1.3e5,  prod: 260,   desc: '带着自己的小团队，也带着自己的焦虑。' },
    { id: 'robot',      name: '自动化实验台',   icon: '🦾', cost: 1.4e6,  prod: 1400,  desc: '不吃不睡，从不抱怨导师。' },
    { id: 'hpc',        name: '超级计算机',     icon: '🖥️', cost: 2e7,    prod: 7800,  desc: '模拟一切可以模拟的东西，包括你的毕业时间。' },
    { id: 'ai',         name: 'AI 科学家',      icon: '🤖', cost: 3.3e8,  prod: 4.4e4, desc: '会自己提出假设、设计实验，偶尔幻觉出参考文献。' },
    { id: 'quantum',    name: '量子实验室',     icon: '⚛️', cost: 5.1e9,  prod: 2.6e5, desc: '在你观测之前，实验同时成功又失败。' },
    { id: 'collider',   name: '粒子对撞机',     icon: '💥', cost: 7.5e10, prod: 1.6e6, desc: '把粒子撞碎，看看里面还有什么。' },
    { id: 'telescope',  name: '深空望远镜阵列', icon: '🔭', cost: 1e12,   prod: 1e7,   desc: '凝视深渊，深渊也给你发数据。' },
    { id: 'dyson',      name: '戴森球计算中心', icon: '☀️', cost: 1.4e13, prod: 6.5e7, desc: '用一颗恒星的能量跑一次梯度下降。' },
    { id: 'multiverse', name: '多元宇宙观测站', icon: '🌌', cost: 1.7e14, prod: 4.3e8, desc: '在某个平行宇宙里，你的论文已经被接收了。' },
  ];

  // ───────────────────────── 论文（Melvor 式定时行动） ─────────────────────────
  // cost: 消耗数据；time: 秒；fund: 经费奖励；lump: 发表即得引用；rate: 每篇每秒被引
  const PAPERS = [
    { id: 'report',   name: '技术报告', icon: '📝', cost: 10,     time: 2,   fund: 6,      lump: 0,    rate: 0 },
    { id: 'poster',   name: '会议海报', icon: '🪧', cost: 250,    time: 5,   fund: 125,    lump: 1,    rate: 0.004 },
    { id: 'conf',     name: '会议论文', icon: '📄', cost: 6000,   time: 10,  fund: 2700,   lump: 4,    rate: 0.016 },
    { id: 'journal',  name: '期刊论文', icon: '📘', cost: 2e5,    time: 20,  fund: 8e4,    lump: 15,   rate: 0.06 },
    { id: 'top',      name: '顶刊论文', icon: '🏆', cost: 8e6,    time: 40,  fund: 2.8e6,  lump: 60,   rate: 0.25 },
    { id: 'review',   name: '领域综述', icon: '🗂️', cost: 4e8,    time: 60,  fund: 1.4e8,  lump: 250,  rate: 1 },
    { id: 'book',     name: '学术专著', icon: '📖', cost: 2.5e10, time: 90,  fund: 8.75e9, lump: 1000, rate: 4 },
    { id: 'paradigm', name: '范式革命', icon: '🌠', cost: 2e12,   time: 150, fund: 7e11,   lump: 4000, rate: 16 },
  ];

  // ───────────────────────── 学科（NGU 式精力分配 + Melvor 式等级） ─────────────────────────
  const DISCS = [
    { id: 'phys', name: '物理学', icon: '🧲', base: 1.04, eff: '点击产出', kind: 'mult' },
    { id: 'chem', name: '化学',   icon: '⚗️', base: 1.02, eff: '数据产出', kind: 'mult' },
    { id: 'bio',  name: '生物学', icon: '🧬', base: 0.99, eff: '人员成本', kind: 'mult', floor: 0.25 },
    { id: 'cs',   name: '计算机', icon: '💻', base: 1.02, eff: '写作速度', kind: 'mult' },
    { id: 'math', name: '数学',   icon: '📐', base: 1.02, eff: '引用获取', kind: 'mult' },
    { id: 'econ', name: '经济学', icon: '📈', base: 1.02, eff: '经费获取', kind: 'mult' },
    { id: 'phil', name: '哲学',   icon: '🦉', base: 0.01, eff: '传承获取', kind: 'add', perk: 'l_phil' },
  ];

  // ───────────────────────── 研究课题（升级 / 科技树） ─────────────────────────
  // cost: { f: 经费, d: 数据, c: 引用 }；req(s, g) 决定何时出现；fx 为效果列表
  const has = (s, id) => !!s.projects[id];
  const P = [];
  const add = (o) => P.push(o);

  // 点击
  add({ id: 'glove',    name: '加厚实验手套',   icon: '🧤', cost: { f: 40 },   req: s => s.stats.run.clicks >= 15, fx: [['click', 2]], desc: '点击产出 ×2。至少不会再被烫到了。' });
  add({ id: 'pipette',  name: '电动移液枪',     icon: '💉', cost: { f: 400 },  req: s => has(s, 'glove'), fx: [['click', 2]], desc: '点击产出 ×2。手腕终于解放了。' });
  add({ id: 'elnb',     name: '电子实验记录本', icon: '📓', cost: { f: 1e4, d: 2000 }, req: s => has(s, 'pipette') && s.stats.run.data >= 3000, fx: [['clickPct', 0.01]], desc: '每次点击额外获得每秒数据产量的 1%。' });
  add({ id: 'sop',      name: '标准化实验流程', icon: '📋', cost: { f: 1e6 },  req: s => has(s, 'elnb'), fx: [['clickPct', 0.01], ['click', 2]], desc: '点击 ×2，并额外获得每秒产量的 1%。' });
  add({ id: 'hts',      name: '高通量筛选',     icon: '🧫', cost: { f: 1e8 },  req: s => has(s, 'sop'), fx: [['clickPct', 0.01], ['click', 2]], desc: '点击 ×2，并额外获得每秒产量的 1%。' });
  add({ id: 'chip',     name: '微流控芯片',     icon: '🔬', cost: { f: 1e10 }, req: s => has(s, 'hts'), fx: [['clickPct', 0.02]], desc: '每次点击额外获得每秒产量的 2%。' });
  add({ id: 'nanoarm',  name: '纳米操作臂',     icon: '🦿', cost: { f: 1e12 }, req: s => has(s, 'chip'), fx: [['clickPct', 0.02]], desc: '每次点击额外获得每秒产量的 2%。' });
  add({ id: 'bci',      name: '脑机接口',       icon: '🧠', cost: { f: 1e14 }, req: s => has(s, 'nanoarm'), fx: [['clickPct', 0.03]], desc: '想一下就算点击。每次点击额外获得每秒产量的 3%。' });

  // 论文类型解锁
  add({ id: 'u_poster',   name: '学术会议入场券', icon: '🎟️', cost: { f: 60 },              req: s => s.stats.run.funding >= 20, fx: [['paper', 'poster']], desc: '解锁「会议海报」。茶歇点心是真正的福利。' });
  add({ id: 'u_conf',     name: '投稿系统账号',   icon: '🔑', cost: { f: 2500, c: 3 },      req: s => has(s, 'u_poster'), fx: [['paper', 'conf']], desc: '解锁「会议论文」。密码要求 8 位以上含特殊字符。' });
  add({ id: 'u_journal',  name: '审稿人的认可',   icon: '✅', cost: { f: 1.2e5, c: 40 },    req: s => has(s, 'u_conf'), fx: [['paper', 'journal']], desc: '解锁「期刊论文」。Reviewer #2 这次居然没说话。' });
  add({ id: 'u_top',      name: '顶刊编辑的微笑', icon: '😊', cost: { f: 6e6, c: 500 },     req: s => has(s, 'u_journal'), fx: [['paper', 'top']], desc: '解锁「顶刊论文」。Cover letter 改了十二遍。' });
  add({ id: 'u_review',   name: '特邀综述邀请函', icon: '✉️', cost: { f: 3e8, c: 5000 },    req: s => has(s, 'u_top'), fx: [['paper', 'review']], desc: '解锁「领域综述」。你已经是别人引用的那个人了。' });
  add({ id: 'u_book',     name: '出版社合约',     icon: '🖋️', cost: { f: 2e10, c: 5e4 },    req: s => has(s, 'u_review'), fx: [['paper', 'book']], desc: '解锁「学术专著」。稿费约等于一顿火锅。' });
  add({ id: 'u_paradigm', name: '库恩的启示',     icon: '🌀', cost: { f: 2e12, c: 5e5 },    req: s => has(s, 'u_book'), fx: [['paper', 'paradigm']], desc: '解锁「范式革命」。科学不是累积，而是革命。' });

  // 写作槽位
  add({ id: 'slot2', name: '招募合作者',     icon: '🤝', cost: { f: 1500 },          req: s => s.stats.run.funding >= 600, fx: [['slots', 1]], desc: '+1 写作槽位。第二作者的事，能叫抢功吗？' });
  add({ id: 'slot3', name: '跨校联合实验室', icon: '🏫', cost: { f: 2e6, c: 300 },   req: s => has(s, 'slot2') && has(s, 'u_journal'), fx: [['slots', 1]], desc: '+1 写作槽位。' });
  add({ id: 'slot4', name: '国际合作网络',   icon: '🌍', cost: { f: 2e9, c: 3e4 },   req: s => has(s, 'slot3') && has(s, 'u_top'), fx: [['slots', 1]], desc: '+1 写作槽位。时差让你 24 小时都有人在写论文。' });
  add({ id: 'slot5', name: '全球学术共同体', icon: '🕸️', cost: { f: 2e12, c: 3e6 }, req: s => has(s, 'slot4') && has(s, 'u_book'), fx: [['slots', 1]], desc: '+1 写作槽位。' });

  // 写作速度
  add({ id: 'latex',   name: 'LaTeX 模板',       icon: '✍️', cost: { f: 300 },  req: s => s.stats.run.funding >= 150, fx: [['write', 1.5]], desc: '写作速度 ×1.5。再也不用和 Word 的格式搏斗。' });
  add({ id: 'zotero',  name: '文献管理软件',     icon: '🗃️', cost: { f: 3e4 },  req: s => has(s, 'latex') && s.stats.run.funding >= 1e4, fx: [['write', 1.5]], desc: '写作速度 ×1.5。参考文献格式一键生成。' });
  add({ id: 'wgroup',  name: '写作互助小组',     icon: '👥', cost: { f: 3e6 },  req: s => has(s, 'zotero') && s.stats.run.funding >= 1e6, fx: [['write', 1.5]], desc: '写作速度 ×1.5。每天早上 8 点，一起沉默地打字。' });
  add({ id: 'llm',     name: '大语言模型润色',   icon: '💬', cost: { f: 3e9 },  req: s => has(s, 'wgroup') && s.stats.run.funding >= 1e9, fx: [['write', 2]], desc: '写作速度 ×2。记得删掉 "As an AI language model"。' });
  add({ id: 'autogen', name: '自动论文生成器',   icon: '🏭', cost: { f: 3e12 }, req: s => has(s, 'llm') && s.stats.run.funding >= 1e12, fx: [['write', 2]], desc: '写作速度 ×2。审稿也是它自己审的。' });
  add({ id: 'editor',  name: '学术编辑',         icon: '🧑‍💼', cost: { f: 2e5, c: 30 }, req: s => has(s, 'u_journal'), fx: [['feat', 'autoPaper']], desc: '写作槽可选择「自动」：自动挑选当前最合适的论文类型。' });

  // 引用
  add({ id: 'rgate',      name: '学术社交网络', icon: '🌐', cost: { f: 5e4, c: 20 },    req: s => s.citations >= 10, fx: [['cite', 1.5]], desc: '引用获取 ×1.5。' });
  add({ id: 'oa',         name: '开放获取',     icon: '🔓', cost: { f: 5e7, c: 2000 },  req: s => has(s, 'rgate') && s.citations >= 1000, fx: [['cite', 2]], desc: '引用获取 ×2。知识应当自由流动。' });
  add({ id: 'arxiv',      name: '预印本服务器', icon: '📡', cost: { f: 5e10, c: 2e5 },  req: s => has(s, 'oa') && s.citations >= 1e5, fx: [['cite', 2]], desc: '引用获取 ×2。先挂上去，占个坑。' });
  add({ id: 'influencer', name: '学术网红',     icon: '📣', cost: { f: 5e13, c: 2e7 },  req: s => has(s, 'arxiv') && s.citations >= 1e7, fx: [['cite', 2]], desc: '引用获取 ×2。你的论文解读视频播放量破百万。' });

  // 经费
  add({ id: 'horizontal', name: '横向课题',         icon: '💼', cost: { f: 8000 },         req: s => s.stats.run.funding >= 4000, fx: [['fund', 1.2]], desc: '经费获取 ×1.2。企业的钱也是钱。' });
  add({ id: 'nsf',        name: '国家自然科学基金', icon: '🏛️', cost: { f: 8e6, c: 800 },  req: s => has(s, 'horizontal') && s.stats.run.funding >= 4e6, fx: [['fund', 1.3]], desc: '经费获取 ×1.3。申请书写了 80 页。' });
  add({ id: 'major',      name: '重大专项',         icon: '🎯', cost: { f: 8e9, c: 8e4 },  req: s => has(s, 'nsf') && s.stats.run.funding >= 4e9, fx: [['fund', 1.4]], desc: '经费获取 ×1.4。' });
  add({ id: 'transfer',   name: '产学研转化',       icon: '🏗️', cost: { f: 8e12, c: 8e6 }, req: s => has(s, 'major') && s.stats.run.funding >= 4e12, fx: [['fund', 1.5]], desc: '经费获取 ×1.5。你的专利被做成了产品。' });

  // 数据
  add({ id: 'coffee',     name: '咖啡机',              icon: '☕', cost: { f: 800 },   req: s => s.stats.run.funding >= 400, fx: [['data', 1.1]], desc: '数据产出 ×1.1。科研的第一生产力。' });
  add({ id: 'fridge',     name: '实验室冰箱（禁放午饭）', icon: '🧊', cost: { f: 8e4 }, req: s => has(s, 'coffee') && s.stats.run.funding >= 4e4, fx: [['data', 1.1]], desc: '数据产出 ×1.1。' });
  add({ id: 'espresso',   name: '意式咖啡机',          icon: '🫖', cost: { f: 8e6 },   req: s => has(s, 'fridge') && s.stats.run.funding >= 4e6, fx: [['data', 1.15]], desc: '数据产出 ×1.15。浓缩的才是精华。' });
  add({ id: 'lab247',     name: '24 小时开放实验室',   icon: '🌙', cost: { f: 8e8 },   req: s => has(s, 'espresso') && s.stats.run.funding >= 4e8, fx: [['data', 1.2]], desc: '数据产出 ×1.2。凌晨三点的实验室最安静。' });
  add({ id: 'opensrc',    name: '开源社区',            icon: '🐧', cost: { f: 8e10 },  req: s => has(s, 'lab247') && s.stats.run.funding >= 4e10, fx: [['data', 1.25]], desc: '数据产出 ×1.25。站在巨人的 GitHub 上。' });
  add({ id: 'dataset',    name: '标准化数据集',        icon: '💾', cost: { f: 8e12 },  req: s => has(s, 'opensrc') && s.stats.run.funding >= 4e12, fx: [['data', 1.25]], desc: '数据产出 ×1.25。' });
  add({ id: 'reproduce',  name: '可重复性革命',        icon: '🔁', cost: { f: 8e14 },  req: s => has(s, 'dataset') && s.stats.run.funding >= 4e14, fx: [['data', 1.5]], desc: '数据产出 ×1.5。别人终于能复现你的结果了。' });

  // 功能
  add({ id: 'disc',       name: '跨学科研究中心', icon: '🧭', cost: { f: 2e4, d: 5000 }, req: s => has(s, 'u_conf') && s.stats.run.funding >= 8000, fx: [['feat', 'disc'], ['focus', 3]], desc: '解锁「学科」：分配精力，让各学科持续升级。+3 精力。' });
  add({ id: 'meditate',   name: '正念冥想课',     icon: '🧘', cost: { f: 2e6 },  req: s => has(s, 'disc'), fx: [['focus', 2]], desc: '+2 精力。' });
  add({ id: 'pomodoro',   name: '番茄工作法',     icon: '🍅', cost: { f: 2e9 },  req: s => has(s, 'meditate') && s.stats.run.funding >= 5e8, fx: [['focus', 3]], desc: '+3 精力。25 分钟专注，5 分钟刷手机。' });
  add({ id: 'flow',       name: '心流状态',       icon: '🌊', cost: { f: 2e12 }, req: s => has(s, 'pomodoro') && s.stats.run.funding >= 5e11, fx: [['focus', 5]], desc: '+5 精力。' });
  add({ id: 'library',    name: '学科图书馆',     icon: '🏛️', cost: { f: 5e7, c: 1000 }, req: s => has(s, 'disc'), fx: [['discSpeed', 2]], desc: '学科经验获取 ×2。' });
  add({ id: 'academy',    name: '学部委员会',     icon: '🎓', cost: { f: 5e11, c: 2e5 }, req: s => has(s, 'library'), fx: [['discSpeed', 2]], desc: '学科经验获取 ×2。' });
  add({ id: 'hr',         name: '人事处',         icon: '🗂️', cost: { f: 5e5, c: 100 }, req: s => s.staff.postdoc >= 1, fx: [['feat', 'autoHire']], desc: '解锁「自动招聘」：自动招募性价比最高的人员（只花当前经费的一半）。' });
  add({ id: 'secretary',  name: '科研秘书',       icon: '📎', cost: { f: 5e8, c: 1e4 }, req: s => has(s, 'hr'), fx: [['feat', 'autoProj']], desc: '解锁「自动立项」：自动购买买得起的最便宜课题。' });
  add({ id: 'notebook',   name: '灵感笔记本',     icon: '💡', cost: { f: 3000 },  req: s => s.stats.run.eurekas >= 1, fx: [['eureka', 1.5]], desc: '灵光一闪出现频率 ×1.5。' });
  add({ id: 'serendip',   name: '意外发现',       icon: '🍀', cost: { f: 3e7 },  req: s => has(s, 'notebook') && s.stats.run.eurekas >= 5, fx: [['eureka', 1.3], ['buffDur', 1.5]], desc: '灵光一闪频率 ×1.3，增益持续时间 ×1.5。青霉素就是这么来的。' });
  add({ id: 'shower',     name: '淋浴间思考',     icon: '🚿', cost: { f: 3e10 }, req: s => has(s, 'serendip') && s.stats.run.eurekas >= 15, fx: [['eureka', 1.3], ['buffPow', 1.5]], desc: '灵光一闪频率 ×1.3，增益效果更强。' });

  // 终局
  add({ id: 'toe', name: '万物理论', icon: '🌌', cost: { f: 3e17, d: 3e17, c: 3e10 }, req: s => has(s, 'u_paradigm') && s.papers.paradigm >= 10, fx: [['ending', 1]], desc: '统一四种基本相互作用。一切都将被解释。', ending: true });

  // 人员专属升级（自动生成）
  const TIERS = [
    { n: 1, c: 10, name: '入门培训' }, { n: 5, c: 50, name: '进阶训练' }, { n: 25, c: 500, name: '专业认证' },
    { n: 50, c: 5e4, name: '骨干计划' }, { n: 100, c: 5e6, name: '领军人才' }, { n: 150, c: 5e8, name: '杰出贡献' },
    { n: 200, c: 5e10, name: '传奇之路' }, { n: 250, c: 5e12, name: '超越极限' }, { n: 300, c: 5e14, name: '永恒传说' },
  ];
  STAFF.forEach((st) => {
    TIERS.forEach((t, i) => {
      add({
        id: `su_${st.id}_${i}`, name: `${st.name} · ${t.name}`, icon: st.icon, staffUp: true,
        cost: { f: st.cost * t.c },
        req: s => s.staff[st.id] >= t.n,
        fx: [['staff', st.id, 2]],
        desc: `${st.name}产出 ×2。（需拥有 ${t.n} 个）`,
      });
    });
  });

  // ───────────────────────── 传承天赋（Prestige 永久升级） ─────────────────────────
  const PERKS = [
    { id: 'l_start',  name: '校友捐赠',   icon: '🎁', cost: 1,    fx: [['startFund', 2000]],               desc: '每轮开局获得 ¥2,000 启动经费。' },
    { id: 'l_click',  name: '肌肉记忆',   icon: '💪', cost: 2,    fx: [['click', 3]],                      desc: '点击产出 ×3。' },
    { id: 'l_eureka', name: '天赋异禀',   icon: '✨', cost: 3,    fx: [['eureka', 2]],                     desc: '灵光一闪出现频率 ×2。' },
    { id: 'l_write',  name: '笔耕不辍',   icon: '🖊️', cost: 5,    fx: [['write', 2]],                      desc: '写作速度 ×2。' },
    { id: 'l_slot',   name: '永久合作者', icon: '🫂', cost: 10,   fx: [['slots', 1]],                      desc: '永久 +1 写作槽位。' },
    { id: 'l_cost',   name: '名师效应',   icon: '🧑‍🏫', cost: 10,   fx: [['cost', 0.85]],                    desc: '人员成本 ×0.85。大家都想进你的组。' },
    { id: 'l_focus',  name: '冥想大师',   icon: '🪷', cost: 15,   fx: [['focus', 5]],                      desc: '+5 精力（需解锁学科）。' },
    { id: 'l_auto',   name: '行政遗产',   icon: '🏢', cost: 20,   fx: [['feat', 'autoHire'], ['feat', 'autoProj'], ['feat', 'autoPaper']], desc: '每轮开局即拥有自动招聘、自动立项与自动选题。' },
    { id: 'l_cite',   name: '经典永流传', icon: '📜', cost: 25,   fx: [['cite', 2]],                       desc: '引用获取 ×2。' },
    { id: 'l_offline',name: '时间管理',   icon: '⏳', cost: 30,   fx: [['offEff', 1], ['offCap', 24 * 3600]], desc: '离线收益效率 100%，上限 24 小时。' },
    { id: 'l_keep',   name: '学术底蕴',   icon: '🏺', cost: 40,   fx: [['keepPapers', 1]],                 desc: '传承后保留所有论文类型与写作槽位课题。' },
    { id: 'l_phil',   name: '哲学之门',   icon: '🦉', cost: 50,   fx: [['phil', 1]],                       desc: '解锁学科「哲学」：每级传承获取 +1%。' },
    { id: 'l_fund',   name: '校董会',     icon: '🏦', cost: 100,  fx: [['fund', 2]],                       desc: '经费获取 ×2。' },
    { id: 'l_data',   name: '群星闪耀',   icon: '🌟', cost: 250,  fx: [['data', 2]],                       desc: '数据产出 ×2。' },
    { id: 'l_disc',   name: '通才教育',   icon: '📚', cost: 400,  fx: [['discSpeed', 3]],                  desc: '学科经验获取 ×3。' },
    { id: 'l_nobel',  name: '诺贝尔奖',   icon: '🏅', cost: 1000, fx: [['all', 5], ['fund', 5]], desc: '数据与经费 ×5。斯德哥尔摩来电。' },
  ];

  // ───────────────────────── 成就 ─────────────────────────
  const A = [];
  const ach = (id, name, icon, desc, cond, hidden) => A.push({ id, name, icon, desc, cond, hidden: !!hidden });
  const life = s => s.stats.life;
  const N = n => (n >= 1e16 ? n / 1e16 + '亿亿' : n >= 1e12 ? n / 1e12 + '万亿' : n >= 1e8 ? n / 1e8 + '亿' : n >= 1e4 ? n / 1e4 + '万' : String(n));
  [[1, '第一个数据点', '一切的开始'], [1e3, '小样本', ''], [1e6, '大数据', ''], [1e9, '数据洪流', ''], [1e12, '数据海洋', ''], [1e15, '数据宇宙', ''], [1e18, '信息奇点', '']]
    .forEach(([n, name], i) => ach(`data${i}`, name, '🧪', `累计获得 ${N(n)} 数据`, s => life(s).data >= n));
  [[100, '第一笔经费'], [1e5, '小有积蓄'], [1e8, '经费充足'], [1e11, '富可敌所'], [1e14, '富可敌国']]
    .forEach(([n, name], i) => ach(`fund${i}`, name, '💰', `累计获得 ¥${N(n)} 经费`, s => life(s).funding >= n));
  [[1, '处女作'], [50, '高产作者'], [500, '灌水大师'], [5000, '著作等身'], [5e4, '论文工厂']]
    .forEach(([n, name], i) => ach(`paper${i}`, name, '📄', `累计发表 ${N(n)} 篇论文`, s => life(s).papers >= n));
  [[1, '被引用了！'], [1e3, '小有名气'], [1e5, '领域专家'], [1e7, '学术大牛'], [1e9, '学术泰斗']]
    .forEach(([n, name], i) => ach(`cite${i}`, name, '📈', `累计获得 ${N(n)} 次引用`, s => life(s).citations >= n));
  [[10, 'h 指数 10'], [50, 'h 指数 50'], [100, 'h 指数 100'], [1000, 'h 指数 1000']]
    .forEach(([n, name], i) => ach(`h${i}`, name, '🎖️', `当前 h 指数达到 ${n}`, s => Math.sqrt(s.citations) >= n));
  [[100, '勤劳的双手'], [1000, '腱鞘炎预警'], [10000, '点击之神']]
    .forEach(([n, name], i) => ach(`click${i}`, name, '👆', `累计点击实验 ${N(n)} 次`, s => life(s).clicks >= n));
  [[1, '灵光一闪'], [10, '灵感源泉'], [50, '天才'], [200, '缪斯的宠儿']]
    .forEach(([n, name], i) => ach(`eureka${i}`, name, '💡', `累计抓住 ${n} 次灵感`, s => life(s).eurekas >= n));
  const totalStaff = s => Object.values(s.staff).reduce((a, b) => a + b, 0);
  [[10, '小课题组'], [100, '大课题组'], [500, '研究所'], [1500, '国家实验室']]
    .forEach(([n, name], i) => ach(`staff${i}`, name, '🏢', `同时拥有 ${n} 名人员/设施`, s => totalStaff(s) >= n));
  ach('intern100', '本科生军团', '🧑‍🎓', '拥有 100 名本科实习生', s => s.staff.intern >= 100);
  ach('phd50', '博士工厂', '🥼', '拥有 50 名博士研究生', s => s.staff.phd >= 50);
  ach('ai1', '奇点临近', '🤖', '拥有一位 AI 科学家', s => s.staff.ai >= 1);
  ach('multi1', '观测多元宇宙', '🌌', '建造多元宇宙观测站', s => s.staff.multiverse >= 1);
  ach('top1', 'Nature 封面', '🏆', '发表第一篇顶刊论文', s => s.stats.lifePapers.top >= 1);
  ach('review1', '领域代言人', '🗂️', '发表第一篇综述', s => s.stats.lifePapers.review >= 1);
  ach('book1', '立言', '📖', '出版第一部专著', s => s.stats.lifePapers.book >= 1);
  ach('paradigm1', '范式转移', '🌠', '发动第一次范式革命', s => s.stats.lifePapers.paradigm >= 1);
  ach('report1000', '报告写手', '📝', '累计写出 1000 份技术报告', s => s.stats.lifePapers.report >= 1000);
  ach('prest1', '薪火相传', '🔥', '完成第一次学术传承', s => s.stats.prestiges >= 1);
  ach('prest5', '桃李满天下', '🍑', '完成 5 次学术传承', s => s.stats.prestiges >= 5);
  ach('prest20', '学派宗师', '🏯', '完成 20 次学术传承', s => s.stats.prestiges >= 20);
  ach('disc10', '博学家', '🧭', '所有基础学科达到 10 级', s => ['phys', 'chem', 'bio', 'cs', 'math', 'econ'].every(d => s.disc[d].lvl >= 10));
  ach('disc50', '专精', '🎯', '任一学科达到 50 级', s => Object.values(s.disc).some(d => d.lvl >= 50));
  ach('disc100', '一代宗师', '🥋', '任一学科达到 100 级', s => Object.values(s.disc).some(d => d.lvl >= 100));
  ach('ending', '万物皆可解释', '🌌', '完成万物理论', s => s.stats.ended);
  ach('theory', '纯理论派', '📐', '在没有任何人员的情况下拥有 1000 数据', s => totalStaff(s) === 0 && s.data >= 1000, true);
  ach('idle', '挂机的艺术', '😴', '连续 30 分钟不点击实验（游戏需开启）', s => s.stats.noClick >= 1800, true);
  ach('speed', '手速狂人', '⚡', '一秒内点击 15 次', s => s.stats.maxCps >= 15, true);
  ach('broke', '经费见底', '🪙', '经费超过 ¥1万后又花到只剩不到 ¥1', s => s.stats.life.funding >= 1e4 && s.funding < 1, true);
  ach('reviewer2', 'Reviewer #2', '😈', '在新闻里看到 Reviewer #2 出现', s => s.stats.saw2, true);

  // ───────────────────────── 灵光一闪效果 ─────────────────────────
  const EUREKA = [
    { id: 'lucky',  w: 40, name: '数据大丰收' },
    { id: 'frenzy', w: 30, name: '灵感迸发',   buff: { kind: 'data',  mult: 7,  dur: 60, label: '数据 ×7' } },
    { id: 'write',  w: 15, name: '文思泉涌',   buff: { kind: 'write', mult: 5,  dur: 30, label: '写作 ×5' } },
    { id: 'click',  w: 8,  name: '手速爆发',   buff: { kind: 'click', mult: 77, dur: 13, label: '点击 ×77' } },
    { id: 'grant',  w: 12, name: '经费到账' },
    { id: 'cite',   w: 10, name: '大佬转发' },
  ];

  // ───────────────────────── 新闻滚动条 ─────────────────────────
  const NEWS = [
    [s => true, '研究表明：咖啡是科研的第一生产力。'],
    [s => true, '导师：「这个实验很简单，周末就能做完。」'],
    [s => true, '据统计，论文中 99% 的 "Future work" 从未被实现。'],
    [s => true, '某实验室冰箱中发现 2019 年的午饭，已被正式命名为新物种。'],
    [s => true, 'p = 0.051，全组陷入沉思。'],
    [s => true, '新研究：组会上打瞌睡的学生创造力提升 12%（样本量 n = 3）。'],
    [s => true, '「这个结果很有意思」——导师在看到错误的结果时如是说。'],
    [s => true, '学术会议茶歇点心被一抢而空，与会者称之为「资源竞争实验」。'],
    [s => true, '某课题组的 GitHub 仓库 README 只有一行：TODO。'],
    [s => true, '本周最常用词汇：「再跑一次试试」。'],
    [s => s.stats.life.papers >= 1, '第三位审稿人要求补充 37 个对比实验。'],
    [s => s.stats.life.papers >= 1, 'Reviewer #2 又出现了。', 'r2'],
    [s => s.stats.life.papers >= 5, '你的论文被拒：「创新性不足」。同期一篇内容相同的论文被接收。'],
    [s => s.stats.life.papers >= 5, 'Deadline 前三小时，全组 GPU 利用率达到 100%。'],
    [s => s.staff.phd >= 1, '某博士生声称其模型准确率达到 101%，审稿人正在调查。'],
    [s => s.staff.phd >= 5, '博士生们成立了互助组织：「延毕不延志」。'],
    [s => s.staff.postdoc >= 1, '博士后们讨论下一份合同在哪里，地图已经精确到了南极。'],
    [s => s.staff.robot >= 1, '自动化实验台第一次独立完成实验，并要求署名。'],
    [s => s.staff.hpc >= 1, '超级计算机开始抱怨电费。'],
    [s => s.staff.ai >= 1, 'AI 科学家申请了自己的科研基金，并且一次就中了。'],
    [s => s.staff.ai >= 5, 'AI 科学家们开始引用彼此的论文，引用网络迅速闭环。'],
    [s => s.staff.quantum >= 1, '量子实验室的猫同时处于毕业和延毕两种状态。'],
    [s => s.staff.collider >= 1, '粒子对撞机发现新粒子：「截稿日期子」，寿命极短。'],
    [s => s.staff.telescope >= 1, '深空望远镜在 130 亿光年外发现了一条审稿意见。'],
    [s => s.staff.dyson >= 1, '戴森球维护人员询问：太阳的电费能报销吗？'],
    [s => s.staff.multiverse >= 1, '多元宇宙观测站报告：在第 42 号宇宙，你的基金申请一次就过了。'],
    [s => s.citations >= 1000, '有人在你的论文下评论：「这不就是我三年前的想法吗？」'],
    [s => s.citations >= 1e5, '你的名字出现在了教科书的脚注里。'],
    [s => s.citations >= 1e7, '本科生开始在考试中背诵你的公式。'],
    [s => s.stats.prestiges >= 1, '你的学生在开题报告里写：「站在导师的肩膀上」。'],
    [s => s.stats.prestiges >= 3, '学派内部爆发了一场关于奠基人原意的激烈争论。'],
  ];

  root.DATA = { STAFF, PAPERS, DISCS, PROJECTS: P, PERKS, ACHIEVEMENTS: A, EUREKA, NEWS };
})(typeof window !== 'undefined' ? window : globalThis);
