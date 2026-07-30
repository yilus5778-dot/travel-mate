import { useEffect, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ImageUp,
  Link2,
  MapPin,
  Navigation,
  PackageOpen,
  Plus,
  Receipt,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  buildSuggestedItinerary,
  TRAVEL_STATUS_LABELS,
  type CompanionProfile,
  type SourceItem,
  type TravelItem,
  type TravelStatus,
} from "@/lib/app-model";
import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";
import { CreateTrip } from "./CreateTrip";

function valueOrPending(value: string | number | null) {
  return value === null || value === "" ? "待确定" : String(value);
}

function EmptySection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof PackageOpen;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface-sunk">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </Card>
  );
}

function StatusAction({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  const next: Partial<Record<TravelStatus, { label: string; status: TravelStatus }>> = {
    draft: { label: "确认信息，进入待出发", status: "upcoming" },
    upcoming: { label: "开始旅行", status: "active" },
    active: { label: "结束旅行", status: "completed" },
    completed: { label: "归档旅行", status: "archived" },
  };
  const action = next[travel.status];
  if (!action) return null;

  const draftIncomplete =
    travel.status === "draft" &&
    (!travel.destination ||
      travel.dateStatus !== "confirmed" ||
      !travel.dateText ||
      !travel.peopleCount ||
      travel.itinerary.length === 0);

  return (
    <div>
      <PrimaryButton
        disabled={draftIncomplete}
        onClick={() =>
          onUpdate({
            ...travel,
            status: action.status,
            updatedAt: new Date().toISOString(),
          })
        }
      >
        {action.label}
      </PrimaryButton>
      {draftIncomplete && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          请先确认目的地、日期和人数，并生成基础行程
        </p>
      )}
    </div>
  );
}

function DraftView({
  travel,
  onUpdate,
  onDelete,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  onDelete: (id: string) => void;
}) {
  const [supplement, setSupplement] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const patchTravel = (patch: Partial<TravelItem>) =>
    onUpdate({
      ...travel,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

  const missing = [
    !travel.destination ? "具体目的地" : null,
    travel.dateStatus !== "confirmed" ? "具体日期" : null,
    !travel.peopleCount ? "同行人数" : null,
    !travel.budget ? "预算" : null,
  ].filter(Boolean) as string[];

  const generatePlan = () => {
    const days = travel.durationDays ?? 3;
    patchTravel({
      itinerary: buildSuggestedItinerary(travel.destination, days),
      durationDays: days,
      aiPlanStatus: "generated",
      aiSummary: `已根据“${
        travel.destinationPreference || travel.destination || "当前旅行想法"
      }”生成 ${days} 天可编辑方案。所有新增行程均标注为 AI 建议，等待你确认。`,
    });
  };

  const addLink = () => {
    const value = link.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
      const source: SourceItem = {
        id: `draft-link-${Date.now()}`,
        kind: "link",
        name: value,
        status: "recognized",
      };
      patchTravel({ sources: [...travel.sources, source] });
      setLink("");
      setLinkError("");
    } catch {
      setLinkError("请输入完整网页链接");
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <p className="text-[14px] font-semibold text-foreground">AI 初步建议</p>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-foreground/75">
          {travel.aiSummary ?? "我会基于你已经提供的信息生成方案；还没有的信息会继续保持待确认。"}
        </p>
        <div className="mt-3 rounded-[12px] bg-surface-sunk p-3">
          <p className="text-[11px] font-medium text-foreground">
            待确认：{missing.length ? missing.join("、") : "基础信息已完整"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            推荐下一步：
            {travel.itinerary.length ? "调整每天安排并确认日期" : "先生成一版可编辑行程"}
          </p>
        </div>
        <button
          onClick={generatePlan}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand-soft py-2.5 text-[12px] font-semibold text-foreground"
        >
          <Sparkles className="size-4" />
          {travel.itinerary.length ? "让 AI 重新补全方案" : "直接生成行程"}
        </button>
      </Card>

      <Card>
        <p className="text-[14px] font-semibold text-foreground">编辑基础信息</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">出发城市</span>
              <input
                value={travel.departureCity ?? ""}
                onChange={(event) => patchTravel({ departureCity: event.target.value || null })}
                placeholder="待确认"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">目的地</span>
              <input
                value={travel.destination ?? ""}
                onChange={(event) =>
                  patchTravel({
                    destination: event.target.value || null,
                    title: event.target.value ? `${event.target.value}旅行草稿` : "未命名旅行草稿",
                  })
                }
                placeholder={travel.destinationPreference || "待确认"}
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">日期</span>
              <input
                value={travel.dateText ?? ""}
                onChange={(event) => patchTravel({ dateText: event.target.value || null })}
                placeholder="待确认"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">日期状态</span>
              <select
                value={travel.dateStatus}
                onChange={(event) =>
                  patchTravel({
                    dateStatus: event.target.value as TravelItem["dateStatus"],
                  })
                }
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              >
                <option value="undecided">待确定</option>
                <option value="approximate">大概时间</option>
                <option value="confirmed">已确认</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="text-[10px] text-muted-foreground">天数</span>
              <input
                type="number"
                min={1}
                value={travel.durationDays ?? ""}
                onChange={(event) =>
                  patchTravel({
                    durationDays: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">人数</span>
              <input
                type="number"
                min={1}
                value={travel.peopleCount ?? ""}
                onChange={(event) =>
                  patchTravel({
                    peopleCount: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="text-[10px] text-muted-foreground">预算</span>
              <input
                type="number"
                min={0}
                value={travel.budget ?? ""}
                onChange={(event) =>
                  patchTravel({
                    budget: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="待定"
                className="mt-1 w-full rounded-[11px] bg-surface-sunk px-2 py-2 text-[12px] outline-none"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-foreground">调整行程</p>
          <Tag>{travel.itinerary.length} 项</Tag>
        </div>
        {travel.itinerary.length ? (
          <div className="mt-3 space-y-2">
            {travel.itinerary.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-[12px] bg-surface-sunk p-2"
              >
                <span className="w-7 shrink-0 text-center text-[10px] font-semibold text-muted-foreground">
                  D{item.day ?? index + 1}
                </span>
                <input
                  value={item.title}
                  onChange={(event) =>
                    patchTravel({
                      itinerary: travel.itinerary.map((entry) =>
                        entry.id === item.id ? { ...entry, title: event.target.value } : entry,
                      ),
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none"
                />
                <button
                  aria-label={`删除行程 ${item.title}`}
                  onClick={() =>
                    patchTravel({
                      itinerary: travel.itinerary.filter((entry) => entry.id !== item.id),
                    })
                  }
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[12px] bg-surface-sunk p-3 text-center text-[11px] text-muted-foreground">
            还没有行程，点击上方“直接生成行程”开始。
          </p>
        )}
        <button
          onClick={() =>
            patchTravel({
              itinerary: [
                ...travel.itinerary,
                {
                  id: `manual-itinerary-${Date.now()}`,
                  day: travel.itinerary.length + 1,
                  time: null,
                  title: "待编辑的新行程",
                  confirmed: false,
                  source: "user",
                },
              ],
            })
          }
          className="mt-3 w-full rounded-[11px] bg-surface-sunk py-2 text-[11px] font-medium text-foreground"
        >
          + 添加一天
        </button>
      </Card>

      <Card>
        <p className="text-[14px] font-semibold text-foreground">继续补充内容</p>
        <textarea
          value={supplement}
          onChange={(event) => setSupplement(event.target.value)}
          rows={3}
          placeholder="继续输入想法、订单信息或粘贴完整行程"
          className="mt-3 w-full resize-none rounded-[12px] bg-surface-sunk p-3 text-[11px] outline-none"
        />
        <button
          disabled={!supplement.trim()}
          onClick={() => {
            patchTravel({
              sourceText: [travel.sourceText, supplement.trim()].filter(Boolean).join("\n"),
              aiSummary: "已收到新的文字补充。点击“让 AI 重新补全方案”即可纳入下一版建议。",
            });
            setSupplement("");
          }}
          className="mt-2 w-full rounded-[11px] bg-brand-soft py-2 text-[11px] font-medium text-foreground disabled:opacity-40"
        >
          加入旅行资料
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-[11px] bg-surface-sunk py-2 text-[11px] text-foreground"
          >
            <ImageUp className="size-3.5" /> 上传图片
          </button>
          <div className="flex gap-1">
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="网页链接"
              className="min-w-0 flex-1 rounded-[11px] bg-surface-sunk px-2 text-[10px] outline-none"
            />
            <button
              onClick={addLink}
              aria-label="添加网页链接"
              className="rounded-[10px] bg-brand-soft px-2"
            >
              <Link2 className="size-3.5" />
            </button>
          </div>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const added: SourceItem[] = Array.from(event.target.files ?? []).map((file, index) => ({
              id: `draft-image-${Date.now()}-${index}`,
              kind: "image",
              name: file.name,
              status: "recognized",
            }));
            patchTravel({ sources: [...travel.sources, ...added] });
            event.target.value = "";
          }}
        />
        {linkError && <p className="mt-1 text-[10px] text-destructive">{linkError}</p>}
        {travel.sources.length > 0 && (
          <div className="mt-3 space-y-1">
            {travel.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 rounded-[10px] bg-surface-sunk px-2 py-1.5"
              >
                {source.kind === "image" ? (
                  <ImageUp className="size-3 text-muted-foreground" />
                ) : (
                  <Link2 className="size-3 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">
                  {source.name}
                </span>
                <button
                  aria-label={`删除资料 ${source.name}`}
                  onClick={() =>
                    patchTravel({
                      sources: travel.sources.filter((entry) => entry.id !== source.id),
                    })
                  }
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <StatusAction travel={travel} onUpdate={onUpdate} />

      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full py-2 text-[11px] font-medium text-destructive"
      >
        删除这份草稿
      </button>
      {confirmDelete && (
        <Card>
          <p className="text-[13px] font-semibold text-foreground">确认删除草稿？</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            删除后，这份草稿及其中的 AI 方案不会保留。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-[11px] bg-surface-sunk py-2 text-[11px] text-foreground"
            >
              取消
            </button>
            <button
              onClick={() => onDelete(travel.id)}
              className="rounded-[11px] bg-destructive py-2 text-[11px] font-medium text-destructive-foreground"
            >
              确认删除
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function UpcomingView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      <EmptySection
        icon={Receipt}
        title={travel.orders.length ? `${travel.orders.length} 个订单` : "没有订单"}
        description={
          travel.orders.length
            ? "订单提醒会对所有搭子类型生效。"
            : "添加真实订单后，这里会显示预订与提醒。"
        }
      />
      <EmptySection
        icon={ClipboardList}
        title={travel.itinerary.length ? `${travel.itinerary.length} 项行程` : "行程尚未确认"}
        description="待出发阶段只展示清单、预订、提醒和行程确认。"
      />
      <EmptySection
        icon={Users}
        title={travel.members.length ? `${travel.members.length} 位同行人` : "没有同行人"}
        description="邀请同行人后，成员和权限会出现在这里。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function ActiveView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      <EmptySection
        icon={Navigation}
        title={travel.itinerary.length ? "查看今日行程" : "今天还没有行程"}
        description="旅行中可查看导航、临时调整和时间冲突提醒。"
      />
      <EmptySection
        icon={Wallet}
        title={travel.expenses.length ? `${travel.expenses.length} 笔费用` : "没有费用记录"}
        description="记录真实消费后再进行记账，不会自动生成金额。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function CompletedView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  return (
    <div className="space-y-3">
      <EmptySection
        icon={Receipt}
        title={travel.expenses.length ? "查看费用与 AA 结算" : "没有费用记录"}
        description="只有真实记录过的费用才会参与结算。"
      />
      <EmptySection
        icon={Camera}
        title={travel.photos.length ? `${travel.photos.length} 张旅行照片` : "没有旅行照片"}
        description="上传照片后才会生成旅行回顾，不使用演示照片代替。"
      />
      <EmptySection
        icon={CheckCircle2}
        title="旅行总结尚未生成"
        description="总结只基于这次旅行中的真实行程、费用和照片。"
      />
      <StatusAction travel={travel} onUpdate={onUpdate} />
    </div>
  );
}

function ArchivedView({
  travel,
  onCreateAgain,
}: {
  travel: TravelItem;
  onCreateAgain: () => void;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <Archive className="size-4 text-muted-foreground" />
          <p className="text-[14px] font-semibold text-foreground">只读归档</p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          归档旅行不会再发生变化。需要新的计划时，请重新创建一份草稿。
        </p>
      </Card>
      <EmptySection
        icon={PackageOpen}
        title="归档内容"
        description={`目的地：${valueOrPending(travel.destination)} · 日期：${
          travel.dateText ?? "待确定"
        }`}
      />
      <PrimaryButton onClick={onCreateAgain}>再次创建</PrimaryButton>
    </div>
  );
}

export function TripsTab({
  companion,
  travels,
  activeTravelId,
  tab,
  onTabChange,
  onSelectTravel,
  onCreateTravel,
  onUpdateTravel,
  onDeleteTravel,
  onRequireLogin,
}: {
  companion: CompanionProfile | null;
  travels: TravelItem[];
  activeTravelId: string | null;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSelectTravel: (id: string) => void;
  onCreateTravel: (travel: TravelItem) => void;
  onUpdateTravel: (travel: TravelItem) => void;
  onDeleteTravel: (id: string) => void;
  onRequireLogin: (reason: string) => void;
}) {
  const [view, setView] = useState<"home" | "trip" | "create">("home");
  const travel = travels.find((item) => item.id === activeTravelId) ?? travels[0] ?? null;
  const companionType = companion ? COMPANIONS[companion.key] : null;

  useEffect(() => {
    if (!travel && view === "trip") setView("home");
  }, [travel, view]);

  if (view === "create") {
    return (
      <CreateTrip
        onCancel={() => setView("home")}
        onCreated={(created) => {
          onCreateTravel(created);
          setView("trip");
        }}
      />
    );
  }

  if (view === "home" && !travels.length) {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="flex min-h-full flex-col px-5 pb-8 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl">
              {companionType?.emoji ?? "🧳"}
            </div>
            <Card className="flex-1 !p-3">
              <p className="text-[13px] leading-relaxed text-foreground/85">
                {companionType
                  ? `${companion?.name}：我们从一次真实的新旅行开始吧。`
                  : "先创建一次新旅行，目的地和日期都可以暂时不确定。"}
              </p>
            </Card>
          </div>
          <div className="mx-auto mt-12 max-w-[17rem] text-center">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
              🧳
            </div>
            <h2 className="mt-5 text-[21px] font-bold text-foreground">还没有旅行</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              随便说、随便传，AI 会先判断需求，再交付一份可继续修改的旅行方案。
            </p>
          </div>
          <div className="mt-auto pt-8">
            <PrimaryButton onClick={() => setView("create")}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-4" /> 创建我的第一次旅行
              </span>
            </PrimaryButton>
          </div>
        </div>
      </MiniShell>
    );
  }

  if (view === "home") {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="space-y-4 px-5 pb-8 pt-2">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl">
              {companionType?.emoji ?? "🧳"}
            </div>
            <Card className="flex-1 !p-3">
              <p className="text-[13px] leading-relaxed text-foreground/85">
                {companion
                  ? `${companion.name}：当前是「${TRAVEL_STATUS_LABELS[travel!.status]}」状态，我只会展示这个阶段需要的内容。`
                  : "当前旅行信息来自你的输入，未确定内容会保持空白。"}
              </p>
            </Card>
          </div>
          {travels.map((item) => (
            <Card key={item.id}>
              <button
                onClick={() => {
                  onSelectTravel(item.id);
                  setView("trip");
                }}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <Tag tone={item.status === "active" ? "accent" : "brand"}>
                    {TRAVEL_STATUS_LABELS[item.status]}
                  </Tag>
                  <span className="text-[11px] text-muted-foreground">
                    {item.peopleCount ? `${item.peopleCount} 人` : "人数待确定"}
                  </span>
                </div>
                <h3 className="mt-3 text-[18px] font-bold text-foreground">{item.title}</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {item.dateText ?? "日期待确定"}
                </p>
              </button>
              {item.status !== "archived" &&
                Boolean(item.destination) &&
                item.itinerary.length > 0 &&
                item.aiPlanStatus !== "not_started" && (
                  <button
                    onClick={() => onRequireLogin("邀请同行人并同步旅行变更")}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-[12px] font-medium text-foreground"
                  >
                    <Share2 className="size-4 text-accent" /> 邀请同行人
                  </button>
                )}
            </Card>
          ))}
          <PrimaryButton onClick={() => setView("create")}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" /> 创建新旅行
            </span>
          </PrimaryButton>
        </div>
      </MiniShell>
    );
  }

  if (!travel) return null;

  return (
    <MiniShell
      title={travel.title}
      tab={tab}
      onTabChange={onTabChange}
      onBack={() => setView("home")}
    >
      <div className="space-y-4 px-5 pb-8 pt-1">
        <Card>
          <div className="flex items-center justify-between">
            <Tag tone={travel.status === "active" ? "accent" : "brand"}>
              {TRAVEL_STATUS_LABELS[travel.status]}
            </Tag>
            <span className="text-[11px] text-muted-foreground">
              {travel.peopleCount ? `${travel.peopleCount} 人` : "人数待确定"}
            </span>
          </div>
          <p className="mt-3 text-[14px] font-semibold text-foreground">
            {travel.destination ?? "目的地待确定"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {travel.dateText ?? "日期待确定"}
          </p>
        </Card>
        {travel.status === "draft" && (
          <DraftView
            travel={travel}
            onUpdate={onUpdateTravel}
            onDelete={(id) => {
              onDeleteTravel(id);
              setView("home");
            }}
          />
        )}
        {travel.status === "upcoming" && <UpcomingView travel={travel} onUpdate={onUpdateTravel} />}
        {travel.status === "active" && <ActiveView travel={travel} onUpdate={onUpdateTravel} />}
        {travel.status === "completed" && (
          <CompletedView travel={travel} onUpdate={onUpdateTravel} />
        )}
        {travel.status === "archived" && (
          <ArchivedView travel={travel} onCreateAgain={() => setView("create")} />
        )}
      </div>
    </MiniShell>
  );
}
