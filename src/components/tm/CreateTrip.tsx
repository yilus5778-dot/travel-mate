import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileSearch,
  ImageUp,
  Link2,
  LoaderCircle,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  buildSuggestedItinerary,
  createTravelDraft,
  displayTravelDate,
  extractTravelIntent,
  getDestinationCandidates,
  getItineraryPlanningQuality,
  isMeaningfulIdea,
  organizePastedItinerary,
  type AIPlanStatus,
  type CompanionProfile,
  type ItineraryItem,
  type PlanningMode,
  type SourceItem,
  type TravelDateStatus,
  type TravelItem,
} from "@/lib/app-model";
import {
  fetchAiIntent,
  fetchAiOrganize,
  fetchAiPlan,
  fetchAiRecognition,
  fetchLinkContent,
} from "@/lib/ai-client";
import { MiniShell, Card, PrimaryButton, Tag } from "./MiniShell";

type Step = "input" | "analyzing" | "questions";

/** 图片压缩到最长边 1280px 的 JPEG data URL,控制上传体积和识别成本 */
function fileToResizedDataUrl(file: File, maxEdge = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("图片处理失败"));
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

export function CreateTrip({
  onCancel,
  onCreated,
  companion,
}: {
  onCancel: () => void;
  onCreated: (travel: TravelItem) => void;
  companion?: CompanionProfile | null;
}) {
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [inputTouched, setInputTouched] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [analysisLabel, setAnalysisLabel] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationPreference, setDestinationPreference] = useState("");
  const [destinationCandidates, setDestinationCandidates] = useState<string[]>([]);
  const [dateStatus, setDateStatus] = useState<TravelDateStatus>("undecided");
  const [dateText, setDateText] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [budget, setBudget] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef(new Map<string, File>());
  const recognizedTextsRef = useRef(new Map<string, string>());
  const sourcesRef = useRef<SourceItem[]>([]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const meaningfulText = isMeaningfulIdea(inputText);
  const recognizedSources = sources.filter((source) => source.status === "recognized");
  const recognizingSources = sources.filter((source) =>
    ["selected", "uploading", "recognizing"].includes(source.status),
  );
  const hasInput = meaningfulText || recognizedSources.length > 0;

  const createDraftFromPlan = ({
    mode,
    destinationValue = destination,
    destinationPreferenceValue = destinationPreference,
    destinationCandidatesValue = destinationCandidates,
    dateStatusValue = dateStatus,
    dateTextValue = dateText,
    durationDaysValue = durationDays ? Number(durationDays) : null,
    peopleCountValue = peopleCount ? Number(peopleCount) : null,
    itineraryValue,
    aiPlanStatusValue,
    aiSummaryValue,
  }: {
    mode: PlanningMode;
    destinationValue?: string;
    destinationPreferenceValue?: string;
    destinationCandidatesValue?: string[];
    dateStatusValue?: TravelDateStatus;
    dateTextValue?: string;
    durationDaysValue?: number | null;
    peopleCountValue?: number | null;
    itineraryValue: ItineraryItem[];
    aiPlanStatusValue?: AIPlanStatus;
    aiSummaryValue: string;
  }) => {
    const resolvedDateText =
      displayTravelDate(dateTextValue || null, durationDaysValue) ?? dateTextValue;

    onCreated(
      createTravelDraft({
        inputText,
        departureCity,
        destination: destinationValue,
        destinationPreference: destinationPreferenceValue,
        destinationCandidates: destinationCandidatesValue,
        dateStatus: dateStatusValue,
        dateText: resolvedDateText,
        durationDays: durationDaysValue,
        peopleCount: peopleCountValue,
        budget: budget ? Number(budget) : null,
        planningMode: mode,
        aiPlanStatus: aiPlanStatusValue ?? (mode === "plan" ? "generated" : "organized"),
        aiSummary: aiSummaryValue,
        sources: recognizedSources,
        itinerary: itineraryValue,
      }),
    );
  };

  const updateSource = (id: string, patch: Partial<SourceItem>) => {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    );
  };

  const removeSource = (id: string) => {
    const next = sourcesRef.current.filter((item) => item.id !== id);
    sourcesRef.current = next;
    setSources(next);
    imageFilesRef.current.delete(id);
    recognizedTextsRef.current.delete(id);
  };

  const recognizeSources = async (ids: string[]) => {
    for (const id of ids) {
      const source = sourcesRef.current.find((item) => item.id === id);
      if (!source || source.status === "failed") continue;
      updateSource(id, { status: "recognizing", error: undefined });
      try {
        if (source.kind === "image") {
          const file = imageFilesRef.current.get(id);
          if (!file) throw new Error("图片读取失败,请重新上传");
          const dataUrl = await fileToResizedDataUrl(file);
          const [text] = await fetchAiRecognition([dataUrl]);
          if (!text?.trim()) throw new Error("没有从图片里识别到旅行相关文字");
          recognizedTextsRef.current.set(id, text.trim());
        } else {
          const text = await fetchLinkContent(source.name);
          recognizedTextsRef.current.set(id, text.trim());
        }
        updateSource(id, { status: "recognized" });
      } catch (error) {
        updateSource(id, {
          status: "failed",
          error: error instanceof Error ? error.message : "识别失败,请重试",
        });
      }
    }
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
      sourcesRef.current = [...sourcesRef.current, source];
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
    setAnalysisLabel("AI 正在理解你的需求…");

    const recognizedText = Array.from(recognizedTextsRef.current.values()).join("\n\n");
    const combinedText = [inputText.trim(), recognizedText].filter(Boolean).join("\n\n");

    // 意图提取:优先 DeepSeek,失败回落本地规则
    let intent;
    let aiAvailable = true;
    try {
      intent = await fetchAiIntent(combinedText);
    } catch {
      aiAvailable = false;
      intent = { ...extractTravelIntent(inputText), departureCity: null };
    }

    setAnalysisLabel("正在区分现成行程与规划想法…");

    const mode: PlanningMode =
      intent.looksLikeItinerary || (recognizedSources.length > 0 && !meaningfulText)
        ? "organize"
        : "plan";
    const candidates = intent.destination
      ? [intent.destination]
      : getDestinationCandidates(intent.destinationPreference);

    setDestination(intent.destination ?? candidates[0] ?? "");
    setDestinationPreference(intent.destinationPreference ?? "");
    setDestinationCandidates(candidates);
    setDateStatus(intent.dateStatus);
    setDateText(intent.dateText ?? "");
    setDurationDays(intent.durationDays ? String(intent.durationDays) : "");
    setPeopleCount(intent.peopleCount ? String(intent.peopleCount) : "");
    if (intent.departureCity) setDepartureCity(intent.departureCity);

    if (mode === "organize") {
      setAnalysisLabel("正在整理可执行攻略结构…");
      let organized: ItineraryItem[] = [];
      let organizedDestination: string | null = null;
      if (aiAvailable) {
        try {
          const result = await fetchAiOrganize(combinedText);
          organized = result.items;
          organizedDestination = result.destination;
        } catch {
          organized = [];
        }
      }
      if (!organized.length) {
        organized = organizePastedItinerary(combinedText);
      }
      const resolvedDestination =
        intent.destination ?? organizedDestination ?? candidates[0] ?? "";
      createDraftFromPlan({
        mode,
        destinationValue: resolvedDestination,
        destinationPreferenceValue: intent.destinationPreference ?? "",
        destinationCandidatesValue: candidates,
        dateStatusValue: intent.dateStatus,
        dateTextValue: intent.dateText ?? "",
        durationDaysValue: intent.durationDays ?? null,
        peopleCountValue: intent.peopleCount ?? null,
        itineraryValue: organized,
        aiSummaryValue: organized.length
          ? `我识别到这是一份现成行程，已按顺序整理出 ${organized.length} 项内容。原文之外的信息不会自动补写。`
          : "这份资料里没有整理出明确的行程条目，已保留原始信息，你可以在行程页手动补充。",
      });
      return;
    }

    setStep("questions");
  };

  const generatePlan = async () => {
    const selectedDestination = destination.trim() || null;
    const days = durationDays ? Number(durationDays) : 3;

    // 有明确目的地时优先用 DeepSeek 生成,失败再回落本地模板
    if (selectedDestination) {
      setStep("analyzing");
      setAnalysisLabel(`AI 正在生成「${selectedDestination}」的 ${days} 日行程…`);
      try {
        const result = await fetchAiPlan({
          destination: selectedDestination,
          durationDays: days,
          peopleCount: peopleCount ? Number(peopleCount) : null,
          budget: budget ? Number(budget) : null,
          departureCity: departureCity.trim() || null,
          dateText: dateText.trim() || null,
          destinationPreference: destinationPreference.trim() || null,
        });
        if (result.items.length) {
          createDraftFromPlan({
            mode: "plan",
            durationDaysValue: days,
            peopleCountValue: peopleCount ? Number(peopleCount) : null,
            itineraryValue: result.items,
            aiPlanStatusValue: "generated",
            aiSummaryValue: `AI 已生成「${selectedDestination}」${days} 天行程草案,每天的时间、地点和推荐理由都可以在行程规划页继续调整。`,
          });
          return;
        }
      } catch {
        // 落入下方本地模板兜底
      }
      setStep("questions");
    }

    const quality = getItineraryPlanningQuality(selectedDestination, days);
    const generated = buildSuggestedItinerary(selectedDestination, days, companion?.key);
    createDraftFromPlan({
      mode: "plan",
      durationDaysValue: days,
      peopleCountValue: peopleCount ? Number(peopleCount) : null,
      itineraryValue: generated,
      aiPlanStatusValue: quality.ready ? "generated" : "needs_questions",
      aiSummaryValue: quality.ready
        ? `${quality.summary} 基础路线、搭子加料、推荐理由、美食、路线图和资料补充都放在行程规划页继续调整。`
        : quality.summary,
    });
  };

  const back = () => {
    if (step === "input") return onCancel();
    if (step === "analyzing") return;
    if (step === "questions") return setStep("input");
  };

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
                  <FileSearch className="size-4" /> 识别后入规划
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  const next: SourceItem[] = files.map((file, index) => {
                    const id = `image-${Date.now()}-${index}-${file.name}`;
                    const isImage = file.type.startsWith("image/");
                    if (isImage) imageFilesRef.current.set(id, file);
                    return {
                      id,
                      kind: "image" as const,
                      name: file.name,
                      status: isImage ? "selected" : "failed",
                      error: isImage ? undefined : "请选择图片格式",
                    };
                  });
                  setSources((current) => [...current, ...next]);
                  sourcesRef.current = [...sourcesRef.current, ...next];
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
                              ? "已加入资料区，可删除"
                              : source.status === "recognizing"
                                ? "正在识别内容…"
                                : "正在上传或读取…")}
                        </p>
                      </div>
                      <button
                        aria-label={`删除 ${source.name}`}
                        onClick={() => removeSource(source.id)}
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
      </div>
    </MiniShell>
  );
}
