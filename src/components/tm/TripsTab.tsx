import { useEffect, useState } from "react";
import {
  Archive,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Navigation,
  PackageOpen,
  Plus,
  Receipt,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  TRAVEL_STATUS_LABELS,
  type CompanionProfile,
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
      !travel.peopleCount);

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
          请先确认目的地、日期和人数
        </p>
      )}
    </div>
  );
}

function DraftView({
  travel,
  onUpdate,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
}) {
  const fields = [
    { icon: MapPin, label: "目的地", value: valueOrPending(travel.destination) },
    {
      icon: CalendarDays,
      label: "日期",
      value: travel.dateStatus === "confirmed" ? valueOrPending(travel.dateText) : "待确定",
    },
    {
      icon: Users,
      label: "人数",
      value: travel.peopleCount ? `${travel.peopleCount} 人` : "待确定",
    },
    {
      icon: Wallet,
      label: "预算",
      value: travel.budget ? `¥${travel.budget}` : "待补充",
    },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[14px] font-semibold text-foreground">补充旅行信息</p>
        <div className="mt-3 space-y-2">
          {fields.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-[14px] bg-surface-sunk px-3 py-2.5"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1 text-[12px] text-foreground/75">{label}</span>
              <span className="text-[12px] font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </Card>
      {travel.sources.length ? (
        <Card>
          <p className="text-[14px] font-semibold text-foreground">已确认资料</p>
          <div className="mt-2 space-y-2">
            {travel.sources.map((source) => (
              <div key={source.id} className="rounded-[12px] bg-surface-sunk px-3 py-2">
                <p className="truncate text-[12px] text-foreground">{source.name}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">识别结果已由你确认</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptySection
          icon={PackageOpen}
          title="没有导入资料"
          description="你可以保留空白，之后再补充攻略、订单或截图。"
        />
      )}
      <StatusAction travel={travel} onUpdate={onUpdate} />
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
        onRequireLogin={onRequireLogin}
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
                  ? `${companion.name}：我们从一次真实的新旅行开始吧。`
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
              从一句真实想法或自己选择的资料开始，不会自动填入示例行程。
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
              {item.status !== "archived" && (
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
        {travel.status === "draft" && <DraftView travel={travel} onUpdate={onUpdateTravel} />}
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
