# ⚗️ 科研挂机 · Research Idle

[![游戏访问量](https://visitor-badge.laobi.icu/badge?page_id=qianjinydx.research-idle&query_only=true&left_text=%E6%B8%B8%E6%88%8F%E8%AE%BF%E9%97%AE%E9%87%8F&left_color=%23232e47&right_color=%232e7b49)](https://qianjinydx.github.io/research-idle/)

一款科研主题的放置 / 增量游戏。从一只烧瓶开始做实验，写论文换经费，招募学生、博士后、超级计算机和 AI 科学家，攒引用、提升 h 指数，开宗立派、代代传承——最终解出**万物理论**。

**在线游玩：** https://qianjinydx.github.io/research-idle/

灵感来自 Cookie Clicker、Universal Paperclips、Kittens Game、Melvor Idle 和 NGU Idle。

## 玩法

| 系统 | 说明 | 灵感 |
| --- | --- | --- |
| 实验台 | 点击烧瓶获得数据 | Cookie Clicker |
| 人员 / 设施 | 13 种生产者，从本科实习生到多元宇宙观测站 | Cookie Clicker |
| 写作台 | 多个写作槽位自动消耗数据撰写论文，换取经费和引用；点击进度条可加速 | Melvor Idle |
| 资源链 | 数据 → 论文 → 经费 + 引用 → 声望（h 指数）→ 更高的经费回报 | Universal Paperclips / Kittens Game |
| 课题 | 160+ 项一次性升级与功能解锁（自动招聘、自动立项、自动选题…） | Cookie Clicker / Paperclips |
| 学科 | 分配精力让 7 个学科持续升级，获得永久加成 | NGU Idle / Melvor Idle |
| 💡 灵光一闪 | 随机出现的灯泡，抓住获得强力增益 | Golden Cookie |
| 学术传承 | 重置本轮换取 ✦ 传承点，购买 16 项永久天赋 | Prestige |
| 成就 | 58 项（含隐藏成就），每项 +1% 数据产出 | — |
| 终局 | 完成「万物理论」，观看结局 | Universal Paperclips |

另有离线收益、自动存档、存档导入导出、三种数字格式、纸质笔记 / 夜间实验室双主题，支持手机浏览器。

## 本地运行

纯静态网页，无需构建。直接用浏览器打开 `index.html`，或：

```bash
node tools/serve.js
```

## 平衡模拟

`tools/sim.js` 用一个贪心机器人跑完整个游戏，用于调整数值：

```bash
node tools/sim.js 40 4
```

参数为模拟小时数和每秒点击次数；设置环境变量 `NOP=1` 可关闭传承。

## 结构

```
index.html      页面骨架
css/style.css   实验记录本风格样式（含暗色主题）
js/data.js      全部游戏内容与数值
js/game.js      游戏引擎（纯逻辑，可在 Node 中运行）
js/ui.js        界面渲染与交互
tools/          本地服务器与平衡模拟
```
