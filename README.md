# 2026 FIFA 世界杯冠军预测工具 / 淘汰赛推演器

React + TypeScript + Tailwind + Framer Motion 实现的世界杯推演工具。

## 功能

- 48 队、12 小组小组赛比分录入
- 胜平负快捷预测，自动生成默认比分
- 小组最终排名指定，自动反推组内赛果
- 小组积分、净胜球、进球数、最佳第三名动态排名
- 32 强开始的淘汰赛 bracket
- 第三名晋级组合动态分配到 FIFA 公布的 Round of 32 候选槽位
- 随机模拟、ELO 预测、1000 次模拟夺冠概率
- 分享链接、导出图片、深色/浅色主题

## 运行

```bash
npm install
npm run dev
```

## 核心逻辑文件

- `src/data/worldCup2026.ts`: 分组、球队、基础赛程数据
- `src/lib/tournament.ts`: 小组排名、最佳第三名、32 强对阵、淘汰赛推进
- `src/lib/simulation.ts`: 随机模拟、ELO 概率模拟、分享状态编码
- `src/lib/tournament.test.ts`: 赛制逻辑测试

## 规则来源

- FIFA World Cup 26 final draw results: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-results
- FIFA World Cup 26 match schedule: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
- Round of 32 第三名候选槽位和 495 组合说明参考 FIFA Regulations Annex C 公开转载表。

当前实现内置了 FIFA 公布的每个 32 强第三名候选槽位，并对 495 种晋级组合做有效分配校验。若需要逐行复刻 Annex C 的官方矩阵，可在 `deriveThirdPlaceSlots` 中替换为完整 lookup table，外层 UI 和 bracket 逻辑不需要改。
