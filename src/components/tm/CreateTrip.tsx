import { useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  FileSearch,
  ImageUp,
  Link2,
  LoaderCircle,
  MapPin,
  Route,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  buildSuggestedItinerary,
  createTravelDraft,
  displayTravelDate,
  extractTravelIntent,
  getDestinationCandidates,
  isMeaningfulIdea,
  organizePastedItinerary,
  type ItineraryEvidence,
  type ItineraryItem,
  type PlanningMode,
  type SourceItem,
  type TravelDateStatus,
  type TravelItem,
} from "@/lib/app-model";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";

type Step = "input" | "analyzing" | "questions" | "preview";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function valueOrFallback(value: string | number | null, fallback = "可稍后补") {
  return value === null || value === "" ? fallback : String(value);
}

function evidenceMeta(
  evidence: ItineraryEvidence | undefined,
  source: "user" | "ai",
  confirmed?: boolean,
): { label: string; tone: "muted" | "brand" | "accent" } {
  const finalEvidence = confirmed
    ? "confirmed"
    : (evidence ?? (source === "user" ? "confirmed" : "suggested"));
  if (finalEvidence === "confirmed") return { label: "已确认", tone: "brand" };
  if (finalEvidence === "queried") return { label: "已查询", tone: "accent" };
  if (finalEvidence === "needs_check") return { label: "需确认", tone: "muted" };
  return { label: "AI 建议", tone: "accent" };
}

function stopVisualMeta(title: string, destination: string | null) {
  const text = `${destination ?? ""}${title}`;
  if (/云冈|石窟|华严|善化|九龙|古城|寺|塔|博物馆|城墙/.test(text)) {
    return { emoji: "🏛️", label: "古建与历史", tone: "from-[#eadcc8] via-[#f8f0df] to-[#caa77a]" };
  }
  if (/洱海|银滩|海|岛|鼓浪屿|码头|沙滩|小麦岛|栈桥|五四/.test(text)) {
    return { emoji: "🌊", label: "海边风景", tone: "from-[#d8edf0] via-[#f8f4e7] to-[#a7cbd1]" };
  }
  if (/恒山|悬空|崂山|山|公园|生态|廊道/.test(text)) {
    return { emoji: "⛰️", label: "自然路线", tone: "from-[#dfead2] via-[#f7f1df] to-[#abc58f]" };
  }
  if (/街|市场|八市|鼓楼|中山路|台东|侨港|人民路|老街|晚餐/.test(text)) {
    return { emoji: "🍜", label: "街区与美食", tone: "from-[#f2dfc8] via-[#fff4df] to-[#d9b58a]" };
  }
  return { emoji: "🧭", label: "行程图片", tone: "from-[#eee7d9] via-[#faf4e9] to-[#d9c9ad]" };
}

function StopImageCard({ title, destination }: { title: string; destination: string | null }) {
  const visual = stopVisualMeta(title, destination);
  return (
    <div
      role="img"
      aria-label={`${title} 图片`}
      className={`relative mb-2 h-20 overflow-hidden rounded-[13px] bg-gradient-to-br ${visual.tone}`}
    >
      <div className="absolute -right-7 -top-9 size-24 rounded-full bg-card/45" />
      <div className="absolute -bottom-9 left-8 h-16 w-36 -rotate-6 rounded-full border-[8px] border-card/35" />
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-card/70 px-2 py-1 text-[8px] font-medium text-muted-foreground">
        <Camera className="size-3" />
        图片
      </div>
      <div className="absolute bottom-2.5 left-2.5 right-2.5">
        <p className="text-[16px] leading-none">{visual.emoji}</p>
        <p className="mt-1 truncate text-[10px] font-semibold text-foreground">{visual.label}</p>
      </div>
    </div>
  );
}

export function CreateTrip({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (travel: TravelItem) => void;
}) {
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [inputTouched, setInputTouched] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [analysisLabel, setAnalysisLabel] = useState("");
  const [planningMode, setPlanningMode] = useState<PlanningMode>("plan");
  const [departureCity, setDepartureCity] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationPreference, setDestinationPreference] = useState("");
  const [destinationCandidates, setDestinationCandidates] = useState<string[]>([]);
  const [dateStatus, setDateStatus] = useState<TravelDateStatus>("undecided");
  const [dateText, setDateText] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [budget, setBudget] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const meaningfulText = isMeaningfulIdea(inputText);
  const recognizedSources = sources.filter((source) => source.status === "recognized");
  const recognizingSources = sources.filter((source) =>
    ["selected", "uploading", "recognizing"].includes(source.status),
  );
  const hasInput = meaningfulText || recognizedSources.length > 0;
  const dateLabel = displayTravelDate(dateText || null, durationDays ? Number(durationDays) : null);

  const recognizeSources = async (ids: string[]) => {
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "uploading" }
          : source,
      ),
    );
    await wait(350);
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "recognizing" }
          : source,
      ),
    );
    await wait(650);
    setSources((current) =>
      current.map((source) =>
        ids.includes(source.id) && source.status !== "failed"
          ? { ...source, status: "recognized" }
          : source,
      ),
    );
  };

  const addLink = () => {
    const value = link.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
      const source: SourceItem = {
        id: `link-${Date.now()}`,
        kind: "link",
        name: value,
        status: "selected",
      };
      setSources((current) => [...current, source]);
      setLink("");
      setLinkError("");
      void recognizeSources([source.id]);
    } catch {
      setLinkError("请输入完整的 http 或 https 网页链接");
    }
  };

  const analyzeInput = async () => {
    setInputTouched(true);
    if (!hasInput || recognizingSources.length) return;

    setStep("analyzing");
    setAnalysisLabel("正在判断你的需求…");
    await wait(500);
    setAnalysisLabel("正在区分现成行程与规划想法…");
    await wait(650);
    setAnalysisLabel("正在整理可执行攻略结构…");
    await wait(450);

    const intent = extractTravelIntent(inputText);
    const mode: PlanningMode =
      intent.looksLikeItinerary || (recognizedSources.length > 0 && !meaningfulText)
        ? "organize"
        : "plan";
    const candidates = intent.destination
      ? [intent.destination]
      : getDestinationCandidates(intent.destinationPreference);

    setPlanningMode(mode);
    setDestination(intent.destination ?? candidates[0] ?? "");
    setDestinationPreference(intent.destinationPreference ?? "");
    setDestinationCandidates(candidates);
    setDateStatus(intent.dateStatus);
    setDateText(intent.dateText ?? "");
    setDurationDays(intent.durationDays ? String(intent.durationDays) : "");
    setPeopleCount(intent.peopleCount ? String(intent.peopleCount) : "");

    if (mode === "organize") {
      const organized = organizePastedItinerary(inputText);
      setItinerary(organized);
      setAiSummary(
        organized.length
          ? `我识别到这是一份现成行程，已按顺序整理出 ${organized.length} 项内容。原文之外的信息不会自动补写。`
          : "我识别到你正在导入现成资料。当前原型已完成上传/链接读取状态，但不会只凭图片文件名或网页 URL 编造行程；识别出明确文字后才会进入攻略。",
      );
      setStep("preview");
      return;
    }

    setStep("questions");
  };

  const generatePlan = () => {
    const selectedDestination = destination.trim() || null;
    const days = durationDays ? Number(durationDays) : 3;
    const generated = buildSuggestedItinerary(selectedDestination, days);
    setItinerary(generated);
    setAiSummary(
      `根据“${destinationPreference || selectedDestination || "目的地待定"}”、${
        dateLabel || "时间待定"
      }和 ${days} 天，我先生成一版可编辑攻略：明确输入会标为已确认，路线和节奏标为 AI 建议，开放/预约/天气等动态信息才标需确认。`,
    );
    setStep("preview");
  };

  const updatePreviewItem = (id: string, patch: Partial<ItineraryItem>) => {
    setItinerary((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const createDraft = () => {
    const travel = createTravelDraft({
      inputText,
      departureCity,
      destination,
      destinationPreference,
      destinationCandidates,
      dateStatus,
      dateText: dateLabel ?? dateText,
      durationDays: durationDays ? Number(durationDays) : null,
      peopleCount: peopleCount ? Number(peopleCount) : null,
      budget: budget ? Number(budget) : null,
      planningMode,
      aiPlanStatus: planningMode === "plan" ? "generated" : "organized",
      aiSummary,
      sources: recognizedSources,
      itinerary,
    });
    onCreated(travel);
  };

  const back = () => {
    if (step === "input") return onCancel();
    if (step === "analyzing") return;
    if (step === "questions") return setStep("input");
    if (step === "preview") return setStep(planningMode === "plan" ? "questions" : "input");
  };

  const infoCards: Array<{
    Icon: typeof MapPin;
    label: string;
    value: string | null;
    status: string;
    tone: "muted" | "brand" | "accent";
  }> = [
    {
      Icon: MapPin,
      label: "目的地",
      value: destination || destinationPreference || null,
      status: destinationPreference && destination ? "AI 建议" : destination ? "已确认" : "需补充",
      tone: destinationPreference && destination ? "accent" : destination ? "brand" : "muted",
    },
    {
      Icon: CalendarDays,
      label: "日期",
      value: dateLabel || null,
      status: dateStatus === "confirmed" ? "已确认" : dateLabel ? "需确认" : "可稍后补",
      tone: dateStatus === "confirmed" ? "brand" : dateLabel ? "muted" : "muted",
    },
    {
      Icon: Clock3,
      label: "时长",
      value: durationDays ? `${durationDays} 天` : null,
      status: durationDays ? "已确认" : "可稍后补",
      tone: durationDays ? "brand" : "muted",
    },
    {
      Icon: Users,
      label: "人数",
      value: peopleCount ? `${peopleCount} 人` : null,
      status: peopleCount ? "已确认" : "可稍后补",
      tone: peopleCount ? "brand" : "muted",
    },
  ];

  return (
    <MiniShell title="创建新旅行" onBack={back} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        {step === "input" && (
          <>
            <div>
              <Tag tone="accent">统一多模态输入</Tag>
              <h2 className="mt-3 text-[20px] font-bold text-foreground">把你知道的都发给我</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                想法、完整行程、图片、订单、攻略和网页链接都可以混在一起；明确内容会作为已确认信息，AI
                不会凭空补写成事实。
              </p>
            </div>

            <Card>
              <textarea
                value={inputText}
                onBlur={() => setInputTouched(true)}
                onChange={(event) => setInputText(event.target.value)}
                rows={6}
                placeholder={"例如：国庆想去海边玩三天\n也可以直接粘贴 D1、D2 的完整行程"}
                className="w-full resize-none rounded-[14px] bg-surface-sunk p-3 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              {inputTouched && inputText.trim() && !meaningfulText && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  这段内容还不足以理解旅行需求，可以补充想去哪里、玩多久或已有安排。
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-brand-soft py-2.5 text-[12px] font-medium text-foreground"
                >
                  <ImageUp className="size-4" /> 上传多张图片
                </button>
                <div className="flex items-center justify-center gap-1.5 rounded-[12px] bg-surface-sunk py-2.5 text-[11px] text-muted-foreground">
                  <FileSearch className="size-4" /> 结果逐项确认
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const next: SourceItem[] = Array.from(event.target.files ?? []).map(
                    (file, index) => ({
                      id: `image-${Date.now()}-${index}-${file.name}`,
                      kind: "image",
                      name: file.name,
                      status: file.type.startsWith("image/") ? "selected" : "failed",
                      error: file.type.startsWith("image/") ? undefined : "请选择图片格式",
                    }),
                  );
                  setSources((current) => [...current, ...next]);
                  void recognizeSources(
                    next.filter((source) => source.status !== "failed").map((source) => source.id),
                  );
                  event.target.value = "";
                }}
              />

              <div className="mt-3 flex gap-2">
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="粘贴网页链接"
                  className="min-w-0 flex-1 rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                />
                <button
                  onClick={addLink}
                  className="flex shrink-0 items-center gap-1 rounded-[12px] bg-brand-soft px-3 text-[12px] font-medium"
                >
                  <Link2 className="size-3.5" /> 添加
                </button>
              </div>
              {linkError && <p className="mt-1 text-[10px] text-destructive">{linkError}</p>}

              {sources.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-2 rounded-[12px] bg-surface-sunk px-3 py-2"
                    >
                      {source.status === "recognized" ? (
                        <Check className="size-4 shrink-0 text-accent" />
                      ) : source.status === "failed" ? (
                        <AlertCircle className="size-4 shrink-0 text-destructive" />
                      ) : (
                        <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-foreground">{source.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {source.error ??
                            (source.status === "recognized"
                              ? "已加入资料区，保存前可删除"
                              : source.status === "recognizing"
                                ? "正在识别内容…"
                                : "正在上传或读取…")}
                        </p>
                      </div>
                      <button
                        aria-label={`删除 ${source.name}`}
                        onClick={() =>
                          setSources((current) => current.filter((item) => item.id !== source.id))
                        }
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <PrimaryButton
              disabled={!hasInput || recognizingSources.length > 0}
              onClick={analyzeInput}
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> 让 AI 理解并规划
              </span>
            </PrimaryButton>
            {!hasInput && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                输入一段有效文字，或先上传图片、添加链接
              </p>
            )}
            {recognizingSources.length > 0 && (
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                正在自动识别图片和链接，请稍候
              </p>
            )}
          </>
        )}

        {step === "analyzing" && (
          <div className="flex min-h-[30rem] flex-col items-center justify-center px-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
              <Sparkles className="size-8 animate-pulse text-foreground/75" />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-foreground">{analysisLabel}</p>
            <p className="mt-2 max-w-[17rem] text-[11px] leading-relaxed text-muted-foreground">
              现成行程会被结构化；模糊想法会生成可编辑攻略，并区分已确认、AI 建议和需确认。
            </p>
          </div>
        )}

        {step === "questions" && (
          <>
            {destinationCandidates.length > 0 && (
              <Card>
                <p className="text-[13px] font-semibold text-foreground">AI 推荐候选地</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  候选仅用于生成建议，不代表你已确认。
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {destinationCandidates.map((candidate) => (
                    <button
                      key={candidate}
                      onClick={() => setDestination(candidate)}
                      className={`rounded-[12px] py-2.5 text-[12px] font-medium ${
                        destination === candidate
                          ? "bg-brand-soft text-foreground"
                          : "bg-surface-sunk text-muted-foreground"
                      }`}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p className="text-[13px] font-semibold text-foreground">可选补充 3 个关键问题</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                不填也可以继续，缺失信息不会挡住规划。
              </p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[11px] text-muted-foreground">从哪里出发？</span>
                  <input
                    value={departureCity}
                    onChange={(event) => setDepartureCity(event.target.value)}
                    placeholder="可稍后补"
                    className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-muted-foreground">几个人？</span>
                    <input
                      type="number"
                      min={1}
                      value={peopleCount}
                      onChange={(event) => setPeopleCount(event.target.value)}
                      placeholder="可稍后补"
                      className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-muted-foreground">总预算？</span>
                    <input
                      type="number"
                      min={0}
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="可稍后补"
                      className="mt-1 w-full rounded-[12px] bg-surface-sunk px-3 py-2.5 text-[12px] outline-none"
                    />
                  </label>
                </div>
              </div>
            </Card>

            <PrimaryButton onClick={generatePlan}>
              <span className="inline-flex items-center gap-1.5">
                <Route className="size-4" /> 直接生成{durationDays || 3}日行程
              </span>
            </PrimaryButton>
            <p className="-mt-2 text-center text-[10px] text-muted-foreground">
              未填写项会作为少量需补充信息，不会阻止生成可编辑攻略
            </p>
          </>
        )}

        {step === "preview" && (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <Tag tone={planningMode === "plan" ? "accent" : "brand"}>
                  {planningMode === "plan" ? "AI 可执行攻略" : "AI 结构化结果"}
                </Tag>
                <Sparkles className="size-4 text-accent" />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-foreground/80">{aiSummary}</p>
            </Card>

            <Card>
              <p className="text-[13px] font-semibold text-foreground">信息状态</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                只有动态变化或缺失的信息才需要用户再确认。
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {infoCards.map(({ Icon, label, value, status, tone }) => {
                  const FieldIcon = Icon;
                  return (
                    <div key={label} className="rounded-[12px] bg-surface-sunk p-3">
                      <div className="flex items-start justify-between gap-2">
                        <FieldIcon className="size-3.5 text-muted-foreground" />
                        <Tag tone={tone}>{status}</Tag>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">{label}</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-foreground">
                        {valueOrFallback(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">可编辑攻略</p>
                <Tag>{itinerary.length} 项</Tag>
              </div>
              {itinerary.length ? (
                <div className="mt-3 space-y-2">
                  {itinerary.map((item, index) => {
                    const meta = evidenceMeta(item.evidence, item.source, item.confirmed);
                    return (
                      <div key={item.id} className="rounded-[14px] bg-surface-sunk p-3">
                        <StopImageCard title={item.title} destination={destination || null} />
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                            D{item.day ?? index + 1}
                          </span>
                          <input
                            type="time"
                            value={item.time ?? ""}
                            onChange={(event) =>
                              updatePreviewItem(item.id, { time: event.target.value || null })
                            }
                            className="w-[68px] bg-transparent text-[10px] font-medium text-muted-foreground outline-none"
                          />
                          <Tag tone={meta.tone}>{meta.label}</Tag>
                          <input
                            value={item.duration ?? ""}
                            onChange={(event) =>
                              updatePreviewItem(item.id, { duration: event.target.value || null })
                            }
                            placeholder="停留"
                            className="min-w-0 flex-1 rounded-full bg-card/60 px-2 py-1 text-[10px] text-muted-foreground outline-none"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <input
                            value={item.title}
                            onChange={(event) =>
                              updatePreviewItem(item.id, { title: event.target.value })
                            }
                            className="mt-2 w-full bg-transparent text-[13px] font-semibold text-foreground outline-none"
                          />
                          <textarea
                            value={item.detail ?? ""}
                            onChange={(event) =>
                              updatePreviewItem(item.id, { detail: event.target.value || null })
                            }
                            rows={2}
                            placeholder="补充路线、交通、取舍或预约提醒"
                            className="mt-1 w-full resize-none bg-transparent text-[10px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                          />
                          {item.reason && (
                            <p className="mt-1 rounded-[10px] bg-card/50 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
                              推荐理由：{item.reason}
                            </p>
                          )}
                          {Boolean(item.checks?.length) && (
                            <div className="mt-1 rounded-[10px] border border-border/70 bg-card/40 px-2 py-1.5">
                              {item.checks!.map((check) => (
                                <p
                                  key={check}
                                  className="text-[10px] leading-relaxed text-muted-foreground"
                                >
                                  需确认：{check}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.transportToNext && (
                            <input
                              value={item.transportToNext}
                              onChange={(event) =>
                                updatePreviewItem(item.id, {
                                  transportToNext: event.target.value || null,
                                })
                              }
                              className="mt-1 w-full bg-transparent text-[10px] text-muted-foreground outline-none"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-[12px] bg-surface-sunk p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    暂未提取到可确认的行程项，保存后可继续补充文字或让 AI 生成。
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <p className="text-[13px] font-semibold text-foreground">推荐下一步</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                先保存为草稿，在草稿页继续编辑基础信息、上传内容和调整每天安排；基本方案完成后再邀请同行人。
              </p>
            </Card>

            <PrimaryButton onClick={createDraft}>保存这版旅行草稿</PrimaryButton>
          </>
        )}
      </div>
    </MiniShell>
  );
}
