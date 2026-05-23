import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Award,
  Camera,
  Info,
  Moon,
  RotateCcw,
  Share2,
  Shuffle,
  Sparkles,
  Sun,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { getFlagUrl, GROUPS, teamById } from "./data/worldCup2026";
import {
  analyzeThirdPlaceBoundary,
  buildKnockoutBracket,
  computeAllTables,
  computeThirdPlaceTable,
  deriveThirdPlaceSlots,
  generateFixturesForOrder,
  groupFixtures,
  initialFixtures,
  markThirdPlaceQualified,
  setOutcome,
} from "./lib/tournament";
import {
  knockoutOrder,
  loadSharedState,
  predictGroupStageByStrength,
  randomizeGroupStage,
  runMonteCarlo,
  shareState,
  shareStateJson,
  simulateFullTournament,
} from "./lib/simulation";
import type { FairPlayRecord, Fixture, GroupLetter, KnockoutMatch, TeamId } from "./types";

type Language = "zh" | "en";
type Side = "left" | "right";

const leftRounds = [
  ["R32", "32 强"],
  ["R16", "16 强"],
  ["QF", "8 强"],
  ["SF", "半决赛"],
] as const;

const rightRounds = [...leftRounds].reverse();
const mobileRounds = [
  ["R32", "32强"],
  ["R16", "16强"],
  ["QF", "8强"],
  ["SF", "半决赛"],
  ["F", "决赛"],
] as const;

function App() {
  const loaded = loadSharedState(window.location.hash.replace("#state=", ""));
  const exportRef = useRef<HTMLDivElement | null>(null);
  const simulationRunRef = useRef(0);
  const qualifiedThirdKeyRef = useRef("");
  const [dark, setDark] = useState(true);
  const language: Language = "zh";
  const [shareMessage, setShareMessage] = useState("");
  const [manualShareUrl, setManualShareUrl] = useState("");
  const [fixtures, setFixtures] = useState<Record<string, Fixture>>(() => {
    const base = initialFixtures();
    loaded?.g?.forEach(([id, score]) => {
      if (base[id]) base[id] = { ...base[id], score };
    });
    return base;
  });
  const [winners, setWinners] = useState<Record<number, TeamId>>(() => loaded?.k ?? {});
  const [scores, setScores] = useState<Record<number, [number, number]>>(() => loaded?.s ?? {});
  const [fairPlay, setFairPlay] = useState<Record<TeamId, FairPlayRecord>>(() => loaded?.fp ?? {});
  const [simulations, setSimulations] = useState<ReturnType<typeof runMonteCarlo>>({ championCounts: {}, simulations: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const [manualThirdGroups, setManualThirdGroups] = useState<GroupLetter[] | null>(null);

  const tables = useMemo(() => computeAllTables(fixtures, fairPlay), [fixtures, fairPlay]);
  const thirdTable = useMemo(() => computeThirdPlaceTable(fixtures, fairPlay), [fixtures, fairPlay]);
  const thirdBoundary = useMemo(() => analyzeThirdPlaceBoundary(thirdTable), [thirdTable]);
  const qualifiedThirdGroups = useMemo(() => {
    if (!thirdBoundary.hasBoundaryDispute) return thirdBoundary.defaultQualifiedGroups;
    const manualIsValid = manualThirdGroups?.length === thirdBoundary.slotsAvailable;
    return [
      ...thirdBoundary.definiteQualified.map((entry) => entry.group),
      ...(manualIsValid ? manualThirdGroups : thirdBoundary.defaultQualifiedGroups.filter((group) =>
        thirdBoundary.disputed.some((entry) => entry.group === group),
      )),
    ];
  }, [manualThirdGroups, thirdBoundary]);
  const effectiveThirdTable = useMemo(
    () => markThirdPlaceQualified(thirdTable, qualifiedThirdGroups),
    [thirdTable, qualifiedThirdGroups],
  );
  const thirdSlots = useMemo(() => deriveThirdPlaceSlots(qualifiedThirdGroups), [qualifiedThirdGroups]);
  const bracket = useMemo(
    () => buildKnockoutBracket(fixtures, winners, scores, fairPlay, qualifiedThirdGroups),
    [fixtures, winners, scores, fairPlay, qualifiedThirdGroups],
  );
  const champion = winners[104] ? teamById[winners[104]] : undefined;

  useEffect(() => {
    setManualThirdGroups(null);
  }, [thirdBoundary.defaultQualifiedGroups.join("|"), thirdBoundary.disputed.map((entry) => entry.group).join("|")]);

  useEffect(() => {
    const key = qualifiedThirdGroups.join("|");
    if (!qualifiedThirdKeyRef.current) {
      qualifiedThirdKeyRef.current = key;
      return;
    }
    if (qualifiedThirdKeyRef.current === key) return;
    qualifiedThirdKeyRef.current = key;
  }, [qualifiedThirdGroups]);

  const resetKnockout = () => {
    setWinners({});
    setScores({});
  };

  const updateManualThirdGroups = (groups: GroupLetter[] | null) => {
    setManualThirdGroups(groups);
    resetKnockout();
  };

  const updateFixtureScore = (id: string, score?: [number, number]) => {
    setFixtures((current) => ({ ...current, [id]: { ...current[id], score } }));
    resetKnockout();
  };

  const updateFixtureOutcome = (id: string, outcome: "home" | "draw" | "away") => {
    setFixtures((current) => ({ ...current, [id]: setOutcome(current[id], outcome) }));
    resetKnockout();
  };

  const applyGroupOrder = (group: GroupLetter, orderedIds: TeamId[]) => {
    const generated = generateFixturesForOrder(group, orderedIds);
    setFixtures((current) => {
      const next = { ...current };
      generated.forEach((fixture) => {
        next[fixture.id] = fixture;
      });
      return next;
    });
    resetKnockout();
  };

  const updateFairPlay = (teamId: TeamId, key: keyof FairPlayRecord, value: number) => {
    setFairPlay((current) => ({
      ...current,
      [teamId]: { ...defaultFairPlay(current[teamId]), [key]: Math.max(0, value) },
    }));
  };

  const pickWinner = (matchItem: KnockoutMatch, teamId: TeamId) => {
    if (!matchItem.home || !matchItem.away) return;
    const affected = downstreamMatches(bracket, matchItem.matchNo);
    setWinners((current) => pruneAffectedWinners(current, bracket, matchItem.matchNo, teamId));
    setScores((current) => ({
      ...omitScores(current, affected),
      [matchItem.matchNo]: current[matchItem.matchNo] ?? (teamId === matchItem.home ? [2, 1] : [1, 2]),
    }));
  };

  const updateKnockoutScore = (matchItem: KnockoutMatch, score?: [number, number]) => {
    const affected = downstreamMatches(bracket, matchItem.matchNo);
    setScores((current) => {
      const next = omitScores(current, affected);
      if (score) next[matchItem.matchNo] = score;
      else delete next[matchItem.matchNo];
      return next;
    });
    setWinners((current) => {
      const next = pruneAffectedWinners(current, bracket, matchItem.matchNo);
      if (!score || !matchItem.home || !matchItem.away) return next;
      if (score[0] > score[1]) next[matchItem.matchNo] = matchItem.home;
      if (score[1] > score[0]) next[matchItem.matchNo] = matchItem.away;
      return next;
    });
  };

  const scheduleMonteCarlo = (baseFixtures: Record<string, Fixture>, iterations = 300) => {
    const runId = simulationRunRef.current + 1;
    simulationRunRef.current = runId;
    setIsSimulating(true);
    setSimulations({ championCounts: {}, simulations: 0 });

    const championCounts: Record<TeamId, number> = {};
    let completed = 0;
    const chunkSize = 5;

    const runChunk = () => {
      if (simulationRunRef.current !== runId) return;
      const remaining = iterations - completed;
      const result = runMonteCarlo(Math.min(chunkSize, remaining), baseFixtures);
      for (const [teamId, count] of Object.entries(result.championCounts)) {
        championCounts[teamId] = (championCounts[teamId] ?? 0) + count;
      }
      completed += result.simulations;

      if (completed < iterations) {
        window.setTimeout(runChunk, 0);
        return;
      }

      setSimulations({ championCounts, simulations: completed });
      setIsSimulating(false);
    };

    window.setTimeout(runChunk, 0);
  };

  const randomGroupStageOnly = () => {
    if (isSimulating) return;
    const randomized = randomizeGroupStage();
    setFixtures(randomized);
    resetKnockout();
    scheduleMonteCarlo(randomized);
  };

  const randomFullTournament = () => {
    if (isSimulating) return;
    const result = simulateFullTournament();
    setFixtures(result.fixtures);
    setWinners(result.winners);
    setScores(result.scores);
    scheduleMonteCarlo(result.fixtures);
  };

  const predictAll = () => {
    if (isSimulating) return;
    const predicted = predictGroupStageByStrength();
    const seededWinners: Record<number, TeamId> = {};
    const seededScores: Record<number, [number, number]> = {};
    for (const matchNo of knockoutOrder) {
      const running = buildKnockoutBracket(predicted, seededWinners, seededScores);
      const matchItem = running.find((item) => item.matchNo === matchNo);
      if (!matchItem?.home || !matchItem.away) continue;
      const winner = teamById[matchItem.home].elo >= teamById[matchItem.away].elo ? matchItem.home : matchItem.away;
      seededWinners[matchNo] = winner;
      seededScores[matchNo] = winner === matchItem.home ? [2, 1] : [1, 2];
    }
    setFixtures(predicted);
    setWinners(seededWinners);
    setScores(seededScores);
    scheduleMonteCarlo(predicted);
  };

  const share = async () => {
    const encoded = shareState(fixtures, winners, scores, fairPlay, language);
    const url = `${window.location.origin}${window.location.pathname}#state=${encoded}`;
    window.history.replaceState(null, "", `#state=${encoded}`);
    setManualShareUrl("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "2026世界杯模拟器",
          text: "查看我的世界杯预测结果",
          url,
        });
        setShareMessage("分享链接已打开");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("预测链接已复制");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      setManualShareUrl(url);
      setShareMessage("无法自动复制，请手动复制链接");
    }
  };

  const copyShareJson = async () => {
    try {
      await navigator.clipboard.writeText(shareStateJson(fixtures, winners, scores, fairPlay, language));
      setShareMessage("预测 JSON 已复制");
    } catch {
      setShareMessage("复制 JSON 失败，请检查浏览器剪贴板权限");
    }
  };

  const exportImage = async () => {
    const node = exportRef.current;
    if (!node) {
      setShareMessage("导出失败：未找到页面内容");
      return;
    }
    setShareMessage("正在导出图片...");
    node.classList.add("exporting");
    try {
      await waitForExportReady(node);
      const canvas = await html2canvas(node, {
        backgroundColor: dark ? "#06111d" : "#f5f7fb",
        scale: Math.min(window.devicePixelRatio || 1.5, 2),
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
        width: node.scrollWidth,
        height: node.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas export failed");
      const link = document.createElement("a");
      link.download = "world-cup-2026-bracket.png";
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      setShareMessage("图片已导出");
    } catch (error) {
      console.error(error);
      setShareMessage("导出失败：请稍后重试，或检查国旗图片是否加载完成");
    } finally {
      node.classList.remove("exporting");
    }
  };

  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-[#06111d] dark:text-slate-50">
        <div ref={exportRef} id="simulator-root" className="stadium-backdrop">
          <section className="mx-auto flex max-w-[1800px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
            <TopBar
              dark={dark}
              language={language}
              champion={champion?.id}
              shareMessage={shareMessage}
              isSimulating={isSimulating}
              onTheme={() => setDark((value) => !value)}
              onReset={() => {
                simulationRunRef.current += 1;
                setFixtures(initialFixtures());
                setFairPlay({});
                setManualThirdGroups(null);
                setSimulations({ championCounts: {}, simulations: 0 });
                setIsSimulating(false);
                resetKnockout();
              }}
              onRandomGroups={randomGroupStageOnly}
              onRandomFull={randomFullTournament}
              onPredict={predictAll}
              onShare={share}
            />
            {manualShareUrl && (
              <ShareFallback url={manualShareUrl} onClose={() => setManualShareUrl("")} />
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0 space-y-5">
                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {GROUPS.map((group) => (
                    <GroupCard
                      key={group}
                      group={group}
                      fixtures={fixtures}
                      table={tables[group]}
                      language={language}
                      onScore={updateFixtureScore}
                      onOutcome={updateFixtureOutcome}
                      onOrder={applyGroupOrder}
                      fairPlay={fairPlay}
                      onFairPlay={updateFairPlay}
                    />
                  ))}
                </div>

                <ThirdPlacePanel
                  thirdTable={effectiveThirdTable}
                  boundary={thirdBoundary}
                  manualThirdGroups={manualThirdGroups}
                  onManualThirdGroups={updateManualThirdGroups}
                  thirdSlots={thirdSlots}
                  language={language}
                  groupStageComplete={Object.values(fixtures).every((fixture) => fixture.score)}
                />

                <Bracket
                  bracket={bracket}
                  champion={champion?.id}
                  language={language}
                  onPick={pickWinner}
                  onScore={updateKnockoutScore}
                />
              </section>

              <aside className="min-w-0 space-y-5">
                <ProbabilityPanel simulations={simulations} language={language} isSimulating={isSimulating} />
                <AdvancedSharePanel onShareJson={copyShareJson} />
              </aside>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function TopBar({
  dark,
  language,
  champion,
  shareMessage,
  isSimulating,
  onTheme,
  onReset,
  onRandomGroups,
  onRandomFull,
  onPredict,
  onShare,
}: {
  dark: boolean;
  language: Language;
  champion?: TeamId;
  shareMessage: string;
  isSimulating: boolean;
  onTheme: () => void;
  onReset: () => void;
  onRandomGroups: () => void;
  onRandomFull: () => void;
  onPredict: () => void;
  onShare: () => void;
}) {
  const [buttonHint, setButtonHint] = useState("");
  const showButtonHint = (message: string) => {
    setButtonHint(message);
    window.setTimeout(() => setButtonHint((current) => (current === message ? "" : current)), 1800);
  };

  return (
    <header className="overflow-hidden rounded-lg border border-white/10 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur dark:bg-slate-950/70">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="app-title text-2xl font-black sm:text-3xl">2026世界杯模拟器</h1>
          {shareMessage && <p className="mt-1 text-xs text-teal-600 dark:text-teal-200">{shareMessage}</p>}
          {isSimulating && <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-300">计算中，页面可继续操作</p>}
        </div>
        <div className="top-actions">
          <div className="flex flex-wrap items-center gap-2">
          <IconButton
            label="随机小组赛"
            tooltip="基于球队实力概率随机生成小组赛比分，仅模拟小组赛阶段。"
            onClick={onRandomGroups}
            onHint={showButtonHint}
            icon={<Shuffle size={17} />}
          />
          <IconButton
            label="随机模拟"
            tooltip="基于球队实力概率随机生成完整赛事，可能出现冷门。"
            onClick={onRandomFull}
            onHint={showButtonHint}
            icon={<Trophy size={17} />}
          />
          <IconButton
            label="实力预测"
            tooltip="基于内置实力评分自动推演，结果更稳定。"
            onClick={onPredict}
            onHint={showButtonHint}
            icon={<Sparkles size={17} />}
          />
          <IconButton label="分享" tooltip="复制或分享当前预测结果。" onClick={onShare} onHint={showButtonHint} icon={<Share2 size={17} />} />
          <IconButton label="重置" tooltip="清空当前预测结果。" onClick={onReset} onHint={showButtonHint} icon={<RotateCcw size={17} />} />
          <IconButton label={dark ? "浅色" : "深色"} tooltip="切换界面主题。" onClick={onTheme} onHint={showButtonHint} icon={dark ? <Sun size={17} /> : <Moon size={17} />} />
          </div>
          {buttonHint && <div className="button-hint">{buttonHint}</div>}
        </div>
      </div>
      <AnimatePresence>
        {champion && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="champion-strip">
            <Trophy size={22} />
            <span>预测冠军</span>
            <strong className="inline-flex items-center gap-2">
              <FlagImage teamId={champion} />
              {teamText(champion, language)}
            </strong>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function ShareFallback({ url, onClose }: { url: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="share-fallback">
      <div className="share-fallback-title">手动复制分享链接</div>
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        onClick={(event) => event.currentTarget.select()}
      />
      <div className="share-fallback-actions">
        <button
          className="tiny-btn"
          onClick={() => {
            inputRef.current?.select();
            document.execCommand("copy");
          }}
        >
          复制
        </button>
        <button className="tiny-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}

function ThirdPlacePanel({
  thirdTable,
  boundary,
  manualThirdGroups,
  onManualThirdGroups,
  thirdSlots,
  language,
  groupStageComplete,
}: {
  thirdTable: ReturnType<typeof computeThirdPlaceTable>;
  boundary: ReturnType<typeof analyzeThirdPlaceBoundary>;
  manualThirdGroups: GroupLetter[] | null;
  onManualThirdGroups: (groups: GroupLetter[] | null) => void;
  thirdSlots: ReturnType<typeof deriveThirdPlaceSlots>;
  language: Language;
  groupStageComplete: boolean;
}) {
  const selectedGroups = manualThirdGroups ?? [];
  const toggleManualGroup = (group: GroupLetter) => {
    const selected = new Set(selectedGroups);
    if (selected.has(group)) {
      selected.delete(group);
    } else {
      if (selected.size >= boundary.slotsAvailable) {
        const first = selected.values().next().value;
        if (first) selected.delete(first);
      }
      selected.add(group);
    }
    onManualThirdGroups([...selected]);
  };
  const manualReady = !boundary.hasBoundaryDispute || selectedGroups.length === boundary.slotsAvailable;

  return (
    <section className="panel">
      <div className="panel-title">
        <Award size={18} />
        <h2>最佳第三名系统</h2>
      </div>
      <div className="space-y-2">
        {thirdTable.map((row, index) => (
          <motion.div layout key={row.teamId} className={`third-row ${row.qualified ? "third-row-on" : ""}`}>
            <span className="w-6 text-sm font-bold">{index + 1}</span>
            <FlagImage teamId={row.teamId} />
            <span className="min-w-0 flex-1 truncate font-semibold">{teamText(row.teamId, language)}</span>
            <span className="stat-pill">{row.points} 分</span>
            <span className="stat-pill">净 {row.goalDiff}</span>
            <span className="stat-pill">进 {row.goalsFor}</span>
            <span className="stat-pill" title="FP = 公平竞赛分，用于积分、净胜球、进球数仍无法区分时的排名">
              FP {row.fairPlay}
            </span>
          </motion.div>
        ))}
      </div>
      {groupStageComplete && boundary.hasBoundaryDispute && (
        <div className="tie-alert">
          <p>晋级线附近存在无法通过当前数据区分的第三名，需要依据 FIFA 官方规则或手动选择进入前 8 的球队。</p>
          <div className="boundary-grid">
            {boundary.disputed.map((entry) => {
              const selected = selectedGroups.includes(entry.group);
              return (
                <button
                  key={entry.teamId}
                  className={`boundary-choice ${selected ? "boundary-choice-on" : ""}`}
                  onClick={() => toggleManualGroup(entry.group)}
                >
                  <FlagImage teamId={entry.teamId} />
                  <span>{teamText(entry.teamId, language)}</span>
                  <strong>3{entry.group}</strong>
                </button>
              );
            })}
          </div>
          <p>
            需要选择 {boundary.slotsAvailable} 支；当前已选择 {selectedGroups.length} 支。
            {!manualReady && " 未完成前暂用默认顺序生成对阵。"}
          </p>
        </div>
      )}
      <div className="mt-4 rounded-lg bg-slate-100 p-3 dark:bg-white/5">
        <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">第三名进入 32 强的动态槽位</p>
        <div className="grid gap-2 text-sm">
          {thirdSlots.map((slot) => (
            <div key={slot.matchNo} className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">M{slot.matchNo} · {slot.winnerSlot}</span>
              <strong className="rounded bg-teal-500/15 px-2 py-1 text-teal-700 dark:text-teal-200">
                {slot.assignedGroup ? `3${slot.assignedGroup}` : slot.allowedGroups.map((group) => `3${group}`).join("/")}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProbabilityPanel({
  simulations,
  language,
  isSimulating,
}: {
  simulations: ReturnType<typeof runMonteCarlo>;
  language: Language;
  isSimulating: boolean;
}) {
  const top = Object.entries(simulations.championCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <section className="panel">
      <div className="panel-title">
        <Sparkles size={18} />
        <h2>示例实力概率</h2>
        <span
          className="info-dot"
          title={`示例数据：球队实力评分是内置估算值，并非实时官方或权威 ELO 数据。概率由当前状态补全后进行 ${simulations.simulations} 次 Monte Carlo 模拟估算，仅供娱乐参考。`}
        >
          <Info size={15} />
        </span>
      </div>
      <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        基于内置实力评分和 Monte Carlo 模拟估算，仅供娱乐参考 · {simulations.simulations} 次模拟
      </p>
      {isSimulating && <div className="simulation-status">模拟计算中...</div>}
      {!isSimulating && simulations.simulations === 0 && <div className="simulation-status">点击随机模拟或实力预测后生成概率</div>}
      <div className="space-y-3">
        {top.map(([teamId, count]) => {
          const pct = Math.round((count / simulations.simulations) * 1000) / 10;
          return (
            <div key={teamId}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <FlagImage teamId={teamId} />
                  <span className="truncate">{teamText(teamId, language)}</span>
                </span>
                <strong>{pct}%</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-2 rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdvancedSharePanel({ onShareJson }: { onShareJson: () => void }) {
  return (
    <details className="panel advanced-panel">
      <summary>高级 / 调试</summary>
      <button className="tiny-btn advanced-action" onClick={onShareJson}>
        复制预测 JSON
      </button>
    </details>
  );
}

function GroupCard({
  group,
  fixtures,
  table,
  language,
  fairPlay,
  onScore,
  onOutcome,
  onOrder,
  onFairPlay,
}: {
  group: GroupLetter;
  fixtures: Record<string, Fixture>;
  table: ReturnType<typeof computeAllTables>[GroupLetter];
  language: Language;
  fairPlay: Record<TeamId, FairPlayRecord>;
  onScore: (id: string, score?: [number, number]) => void;
  onOutcome: (id: string, outcome: "home" | "draw" | "away") => void;
  onOrder: (group: GroupLetter, orderedIds: TeamId[]) => void;
  onFairPlay: (teamId: TeamId, key: keyof FairPlayRecord, value: number) => void;
}) {
  const [dragging, setDragging] = useState<TeamId | null>(null);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const ordered = table.map((row) => row.teamId);
  const fixturesForGroup = groupFixtures(fixtures, group);
  const completedMatches = fixturesForGroup.filter((fixture) => fixture.score).length;

  const move = (teamId: TeamId, direction: -1 | 1) => {
    const index = ordered.indexOf(teamId);
    const swap = index + direction;
    if (swap < 0 || swap >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[swap]] = [next[swap], next[index]];
    onOrder(group, next);
  };

  const dropAt = (targetId?: TeamId) => {
    if (!dragging) return;
    if (!targetId) {
      onOrder(group, [...ordered.filter((id) => id !== dragging), dragging]);
      setDragging(null);
      return;
    }
    if (dragging === targetId) return;
    const originalIndex = ordered.indexOf(dragging);
    const targetIndex = ordered.indexOf(targetId);
    const next = ordered.filter((id) => id !== dragging);
    const insertIndex = targetIndex > originalIndex ? targetIndex : Math.max(0, next.indexOf(targetId));
    next.splice(insertIndex, 0, dragging);
    onOrder(group, next);
    setDragging(null);
  };

  return (
    <motion.article layout className="group-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">小组 {group}</h2>
        <span className="drag-note rounded bg-teal-500/15 px-2 py-1 text-xs font-bold text-teal-700 dark:text-teal-200">可拖拽排名</span>
      </div>

      <div className="standings-wrap overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="group-table w-full table-fixed text-sm">
          <colgroup>
            <col className="team-col w-[39%]" />
            <col className="played-col w-[7%]" />
            <col className="detail-col w-[6%]" />
            <col className="detail-col w-[6%]" />
            <col className="detail-col w-[6%]" />
            <col className="core-col w-[7%]" />
            <col className="core-col w-[7%]" />
            <col className="core-col w-[7%]" />
            <col className="rank-col w-[15%]" />
          </colgroup>
          <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-2 py-2 text-left">队伍</th>
              <th className="played-stat">赛</th>
              <th className="detail-stat">胜</th>
              <th className="detail-stat">平</th>
              <th className="detail-stat">负</th>
              <th>净</th>
              <th>进</th>
              <th>分</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr
                key={row.teamId}
                draggable
                onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                  setDragging(row.teamId);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropAt(row.teamId)}
                className={`border-t border-slate-200 dark:border-white/10 ${dragging === row.teamId ? "dragging-row" : ""}`}
              >
                <td className="team-cell px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="drag-handle">⋮⋮</span>
                    <span className="w-5 shrink-0 text-xs font-black text-teal-600 dark:text-teal-300">{row.rank}</span>
                    <FlagImage teamId={row.teamId} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{teamText(row.teamId, language)}</span>
                  </div>
                </td>
                <td className="played-stat text-center">{row.played}</td>
                <td className="detail-stat text-center">{row.wins}</td>
                <td className="detail-stat text-center">{row.draws}</td>
                <td className="detail-stat text-center">{row.losses}</td>
                <td className="text-center">{row.goalDiff}</td>
                <td className="text-center">{row.goalsFor}</td>
                <td className="text-center font-black">{row.points}</td>
                <td className="rank-cell whitespace-nowrap pr-2 text-right">
                  <button className="rank-btn" onClick={() => move(row.teamId, -1)} aria-label="排名上移">↑</button>
                  <button className="rank-btn" onClick={() => move(row.teamId, 1)} aria-label="排名下移">↓</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fixturesForGroup.every((fixture) => fixture.score) && table.some((row) => row.needsRankingDecision) && (
        <div className="tie-alert">
          当前无法通过比赛数据区分排名，需要依据 FIFA 世界排名或官方规则决定；也可以拖拽手动指定最终排名。
        </div>
      )}

      <div className="group-extras">
        <button className="mobile-match-toggle" onClick={() => setMatchesOpen((value) => !value)}>
          <span>{matchesOpen ? "收起比赛" : "展开比赛"}</span>
          <strong>已填写 {completedMatches}/{fixturesForGroup.length} 场</strong>
        </button>

        <details className="fairplay-box">
          <summary>公平竞赛分</summary>
          <div className="fairplay-grid">
            {table.map((row) => (
              <FairPlayControls
                key={row.teamId}
                teamId={row.teamId}
                language={language}
                record={fairPlay[row.teamId]}
                onChange={onFairPlay}
              />
            ))}
          </div>
        </details>

        <div className={`mobile-collapsible-matches mt-3 space-y-2 ${matchesOpen ? "mobile-open" : ""}`}>
          {fixturesForGroup.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} language={language} onScore={onScore} onOutcome={onOutcome} />
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function FixtureRow({
  fixture,
  language,
  onScore,
  onOutcome,
}: {
  fixture: Fixture;
  language: Language;
  onScore: (id: string, score?: [number, number]) => void;
  onOutcome: (id: string, outcome: "home" | "draw" | "away") => void;
}) {
  const [homeDraft, setHomeDraft] = useState(scoreValue(fixture.score?.[0]));
  const [awayDraft, setAwayDraft] = useState(scoreValue(fixture.score?.[1]));

  useEffect(() => {
    setHomeDraft(scoreValue(fixture.score?.[0]));
    setAwayDraft(scoreValue(fixture.score?.[1]));
  }, [fixture.score]);

  const updateDraft = (side: "home" | "away", value: string) => {
    const nextHome = side === "home" ? value : homeDraft;
    const nextAway = side === "away" ? value : awayDraft;
    setHomeDraft(nextHome);
    setAwayDraft(nextAway);
    onScore(fixture.id, parseScore(nextHome, nextAway));
  };

  return (
    <div className="fixture-row">
      <div className="fixture-match">
        <TeamLabel teamId={fixture.home} language={language} align="right" />
        <div className="fixture-score">
          <ScoreInput value={homeDraft} onChange={(value) => updateDraft("home", value)} />
          <span className="text-slate-400">:</span>
          <ScoreInput value={awayDraft} onChange={(value) => updateDraft("away", value)} />
        </div>
        <TeamLabel teamId={fixture.away} language={language} />
      </div>
      <div className="fixture-actions">
        <button className="tiny-btn" onClick={() => onOutcome(fixture.id, "home")}>主胜</button>
        <button className="tiny-btn" onClick={() => onOutcome(fixture.id, "draw")}>平</button>
        <button className="tiny-btn" onClick={() => onOutcome(fixture.id, "away")}>客胜</button>
      </div>
    </div>
  );
}

function FairPlayControls({
  teamId,
  language,
  record,
  onChange,
}: {
  teamId: TeamId;
  language: Language;
  record?: FairPlayRecord;
  onChange: (teamId: TeamId, key: keyof FairPlayRecord, value: number) => void;
}) {
  const value = {
    ...defaultFairPlay(record),
  };
  return (
    <div className="fairplay-row">
      <div className="fairplay-team">
        <FlagImage teamId={teamId} />
        <span>{teamText(teamId, language)}</span>
      </div>
      <FairPlayInput label="黄" value={value.yellow} onChange={(next) => onChange(teamId, "yellow", next)} />
      <FairPlayInput label="两黄红" value={value.secondYellowRed} onChange={(next) => onChange(teamId, "secondYellowRed", next)} />
      <FairPlayInput label="直红" value={value.directRed} onChange={(next) => onChange(teamId, "directRed", next)} />
      <FairPlayInput label="黄+直红" value={value.yellowThenRed} onChange={(next) => onChange(teamId, "yellowThenRed", next)} />
      <strong className="fairplay-score">{fairPlayPoints(value)}</strong>
    </div>
  );
}

function FairPlayInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="fairplay-input">
      <span>{label}</span>
      <input type="number" min={0} max={9} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Bracket({
  bracket,
  champion,
  language,
  onPick,
  onScore,
}: {
  bracket: KnockoutMatch[];
  champion?: TeamId;
  language: Language;
  onPick: (match: KnockoutMatch, teamId: TeamId) => void;
  onScore: (match: KnockoutMatch, score?: [number, number]) => void;
}) {
  const final = bracket.find((matchItem) => matchItem.round === "F");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startLeft: 0 });
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = Math.max(0, (node.scrollWidth - node.clientWidth) / 2);
  }, []);

  const startPan = (event: ReactMouseEvent<HTMLDivElement>) => {
    const node = scrollRef.current;
    if (!node) return;
    dragRef.current = { active: true, startX: event.clientX, startLeft: node.scrollLeft };
  };

  const movePan = (event: ReactMouseEvent<HTMLDivElement>) => {
    const node = scrollRef.current;
    if (!node || !dragRef.current.active) return;
    node.scrollLeft = dragRef.current.startLeft - (event.clientX - dragRef.current.startX);
  };

  const stopPan = () => {
    dragRef.current.active = false;
  };

  return (
    <section id="bracket-panel" className="panel overflow-hidden">
      <div className="panel-title justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={18} />
          <h2>淘汰赛推演</h2>
        </div>
        <button className="tiny-btn" onClick={() => setShowScores((value) => !value)}>
          {showScores ? "简洁模式" : "比分模式"}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="bracket-scroll"
        onMouseDown={startPan}
        onMouseMove={movePan}
        onMouseUp={stopPan}
        onMouseLeave={stopPan}
      >
        <div className="bracket-tree">
          <BracketSide side="left" bracket={bracket} champion={champion} language={language} onPick={onPick} onScore={onScore} showScores={showScores} />
          <div className="final-column">
            <h3>决赛</h3>
            {final && (
              <KnockoutCard
                matchItem={final}
                champion={champion}
                language={language}
                onPick={onPick}
                onScore={onScore}
                compact={false}
                showScores={showScores}
              />
            )}
          </div>
          <BracketSide side="right" bracket={bracket} champion={champion} language={language} onPick={onPick} onScore={onScore} showScores={showScores} />
        </div>
      </div>
      <div className="bracket-mobile">
        {mobileRounds.map(([round, label]) => {
          const matches = bracket.filter((matchItem) => matchItem.round === round);
          return (
            <section key={round} className="mobile-round">
              <h3>{label}</h3>
              <div className="mobile-round-list">
                {matches.map((matchItem) => (
                  <KnockoutCard
                    key={matchItem.id}
                    matchItem={matchItem}
                    champion={champion}
                    language={language}
                    onPick={onPick}
                    onScore={onScore}
                    compact={round !== "F"}
                    showScores={showScores}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function BracketSide({
  side,
  bracket,
  champion,
  language,
  onPick,
  onScore,
  showScores,
}: {
  side: Side;
  bracket: KnockoutMatch[];
  champion?: TeamId;
  language: Language;
  onPick: (match: KnockoutMatch, teamId: TeamId) => void;
  onScore: (match: KnockoutMatch, score?: [number, number]) => void;
  showScores: boolean;
}) {
  const rounds = side === "left" ? leftRounds : rightRounds;
  return (
    <div className={`bracket-side bracket-side-${side}`}>
      {rounds.map(([round, label]) => {
        const matches = sideMatches(bracket, round, side);
        return (
          <div key={`${side}-${round}`} className={`bracket-round bracket-round-${round}`}>
            <h3>{label}</h3>
            <div className={`round-stack round-stack-${matches.length}`}>
              {matches.map((matchItem) => (
                <KnockoutCard
                  key={matchItem.id}
                  matchItem={matchItem}
                  champion={champion}
                  language={language}
                  onPick={onPick}
                  onScore={onScore}
                  compact={round !== "R32"}
                  showScores={showScores}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KnockoutCard({
  matchItem,
  champion,
  language,
  onPick,
  onScore,
  compact,
  showScores,
}: {
  matchItem: KnockoutMatch;
  champion?: TeamId;
  language: Language;
  onPick: (match: KnockoutMatch, teamId: TeamId) => void;
  onScore: (match: KnockoutMatch, score?: [number, number]) => void;
  compact: boolean;
  showScores: boolean;
}) {
  const [homeDraft, setHomeDraft] = useState(scoreValue(matchItem.score?.[0]));
  const [awayDraft, setAwayDraft] = useState(scoreValue(matchItem.score?.[1]));

  useEffect(() => {
    setHomeDraft(scoreValue(matchItem.score?.[0]));
    setAwayDraft(scoreValue(matchItem.score?.[1]));
  }, [matchItem.score]);

  const updateDraft = (side: "home" | "away", value: string) => {
    const nextHome = side === "home" ? value : homeDraft;
    const nextAway = side === "away" ? value : awayDraft;
    setHomeDraft(nextHome);
    setAwayDraft(nextAway);
    onScore(matchItem, parseScore(nextHome, nextAway));
  };
  const tied = matchItem.home && matchItem.away && homeDraft !== "" && awayDraft !== "" && homeDraft === awayDraft;

  return (
    <motion.div layout className={`knockout-card ${compact ? "knockout-card-compact" : ""} ${champion && matchItem.winner === champion ? "champion-card" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>M{matchItem.matchNo}</span>
        <span className="truncate">{matchItem.homeSource} vs {matchItem.awaySource}</span>
      </div>
      <KnockoutTeam matchItem={matchItem} side="home" language={language} onPick={onPick} />
      <KnockoutTeam matchItem={matchItem} side="away" language={language} onPick={onPick} />
      {showScores && (
        <>
          <div className="mt-2 flex items-center justify-center gap-1">
            <ScoreInput value={homeDraft} disabled={!matchItem.home || !matchItem.away} onChange={(value) => updateDraft("home", value)} />
            <span className="text-slate-400">:</span>
            <ScoreInput value={awayDraft} disabled={!matchItem.home || !matchItem.away} onChange={(value) => updateDraft("away", value)} />
          </div>
          {tied && <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">比分相同，请点选点球胜者</p>}
        </>
      )}
    </motion.div>
  );
}

function KnockoutTeam({
  matchItem,
  side,
  language,
  onPick,
}: {
  matchItem: KnockoutMatch;
  side: "home" | "away";
  language: Language;
  onPick: (match: KnockoutMatch, teamId: TeamId) => void;
}) {
  const id = matchItem[side];
  const selected = id && matchItem.winner === id;

  return (
    <button disabled={!id} onClick={() => id && onPick(matchItem, id)} className={`knockout-team ${selected ? "knockout-team-on" : ""}`}>
      {id ? (
        <>
          <FlagImage teamId={id} />
          <span className="min-w-0 flex-1 truncate text-left font-semibold">{teamText(id, language)}</span>
        </>
      ) : (
        <span className="text-slate-400">{side === "home" ? matchItem.homeSource : matchItem.awaySource}</span>
      )}
    </button>
  );
}

function TeamLabel({ teamId, language, align = "left" }: { teamId: TeamId; language: Language; align?: "left" | "right" }) {
  return (
    <span className={`team-label ${align === "right" ? "team-label-right" : ""}`}>
      {align === "right" && <span className="team-name">{teamText(teamId, language)}</span>}
      <FlagImage teamId={teamId} />
      {align === "left" && <span className="team-name">{teamText(teamId, language)}</span>}
    </span>
  );
}

function FlagImage({ teamId }: { teamId: TeamId }) {
  const team = teamById[teamId];
  return <img className="flag-img" src={getFlagUrl(teamId)} alt={`${team.enName} flag`} crossOrigin="anonymous" decoding="async" loading="eager" />;
}

function ScoreInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="score-input"
      min={0}
      max={12}
      type="number"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function IconButton({
  label,
  icon,
  onClick,
  tooltip,
  onHint,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tooltip?: string;
  onHint?: (message: string) => void;
}) {
  const hint = tooltip ?? label;
  return (
    <button
      className="icon-btn"
      onClick={() => {
        onHint?.(hint);
        onClick();
      }}
      aria-label={hint}
      title={hint}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function teamText(teamId: TeamId, language: Language) {
  const team = teamById[teamId];
  return language === "zh" ? team.name : team.enName;
}

function scoreValue(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

function parseScore(a: string, b: string): [number, number] | undefined {
  if (a === "" || b === "") return undefined;
  return [Number(a), Number(b)];
}

async function waitForExportReady(node: HTMLElement) {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await document.fonts?.ready;
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete && image.naturalWidth > 0
          ? undefined
          : new Promise<void>((resolve) => {
              const finish = () => {
                image.onload = null;
                image.onerror = null;
                resolve();
              };
              image.onload = finish;
              image.onerror = finish;
              window.setTimeout(finish, 2500);
            }),
    ),
  );
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function fairPlayPoints(record: FairPlayRecord) {
  return record.yellow * -1 + record.secondYellowRed * -3 + record.directRed * -4 + record.yellowThenRed * -5;
}

function defaultFairPlay(record?: FairPlayRecord): FairPlayRecord {
  return {
    yellow: record?.yellow ?? 0,
    secondYellowRed: record?.secondYellowRed ?? 0,
    directRed: record?.directRed ?? 0,
    yellowThenRed: record?.yellowThenRed ?? 0,
  };
}

function omitScores(current: Record<number, [number, number]>, matchNos: number[]) {
  const next = { ...current };
  matchNos.forEach((matchNo) => {
    delete next[matchNo];
  });
  return next;
}

function pruneAffectedWinners(
  current: Record<number, TeamId>,
  bracket: KnockoutMatch[],
  matchNo: number,
  winner?: TeamId,
) {
  const next = { ...current };
  const affected = downstreamMatches(bracket, matchNo);
  affected.forEach((affectedMatchNo) => {
    delete next[affectedMatchNo];
  });
  if (winner) next[matchNo] = winner;
  return next;
}

function downstreamMatches(bracket: KnockoutMatch[], changedMatchNo: number) {
  const affected = new Set<number>();
  let frontier = [changedMatchNo];
  let found = true;
  while (found) {
    found = false;
    const nextFrontier: number[] = [];
    for (const source of frontier) {
      for (const target of nextKnockoutMatches(source)) {
        if (affected.has(target)) continue;
        affected.add(target);
        nextFrontier.push(target);
        found = true;
      }
    }
    frontier = nextFrontier;
  }
  return [...affected].filter((matchNo) => bracket.some((matchItem) => matchItem.matchNo === matchNo));
}

function nextKnockoutMatches(matchNo: number) {
  const dependencies: Record<number, number[]> = {
    73: [89],
    74: [89],
    75: [90],
    76: [90],
    77: [91],
    78: [91],
    79: [92],
    80: [92],
    81: [93],
    82: [93],
    83: [94],
    84: [94],
    85: [95],
    86: [95],
    87: [96],
    88: [96],
    89: [97],
    90: [97],
    91: [98],
    92: [98],
    93: [99],
    94: [99],
    95: [100],
    96: [100],
    97: [101],
    98: [101],
    99: [102],
    100: [102],
    101: [104],
    102: [104],
  };
  return dependencies[matchNo] ?? [];
}

function sideMatches(bracket: KnockoutMatch[], round: KnockoutMatch["round"], side: Side) {
  const matches = bracket.filter((matchItem) => matchItem.round === round);
  if (round === "F") return matches;
  const midpoint = Math.ceil(matches.length / 2);
  return side === "left" ? matches.slice(0, midpoint) : matches.slice(midpoint);
}

export default App;
