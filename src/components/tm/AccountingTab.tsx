import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Receipt,
  Share2,
  Users,
  WalletCards,
} from "lucide-react";
import type { TabKey } from "./MiniShell";
import type { ExpenseItem, TravelItem } from "@/lib/app-model";
import { TRAVEL_STATUS_LABELS } from "@/lib/app-model";
import { formatMoney, participantNames, settlementSuggestions } from "@/lib/accounting";
import { CollaborationCenter } from "./CollaborationCenter";
import { AccountingCenter } from "./AccountingCenter";
import { Card, MiniShell, PrimaryButton, Tag } from "./MiniShell";

type AccountingView = "home" | "detail" | "sample" | "share";

function expense(
  title: string,
  amount: number,
  category: ExpenseItem["category"],
  paidBy: string,
  spentAt: string,
): ExpenseItem {
  const people = ["我", "阿南", "小月", "老周"];
  const share = Number((amount / people.length).toFixed(2));
  return {
    id: `sample-${title}`,
    title,
    amount,
    category,
    paidBy,
    splitMode: "equal",
    shares: people.map((name) => ({ name, amount: share })),
    note: null,
    spentAt,
    createdBy: paidBy,
    createdAt: spentAt,
  };
}

function createLedgerSampleTravel(): TravelItem {
  const now = "2026-08-01T09:00:00.000Z";
  return {
    id: "sample-ledger-xinjiang",
    title: "新疆旅行",
    departureCity: "上海",
    destination: "新疆",
    destinationPreference: null,
    destinationCandidates: [],
    dateStatus: "confirmed",
    dateText: "10月1日 - 10月6日",
    durationDays: 6,
    peopleCount: 4,
    budget: 8000,
    status: "upcoming",
    planningMode: "plan",
    aiPlanStatus: "generated",
    aiSummary: "体验样例账本，仅用于理解记账和 AA 结算层级。",
    sourceMode: "multimodal",
    sourceText: null,
    sources: [],
    itinerary: [],
    orders: [],
    members: [
      { id: "member-anan", name: "阿南" },
      { id: "member-xiaoyue", name: "小月" },
      { id: "member-laozhou", name: "老周" },
    ],
    expenses: [
      expense("乌鲁木齐租车定金", 1200, "transport", "我", "2026-10-01T12:00:00.000Z"),
      expense("喀纳斯民宿", 1680, "hotel", "小月", "2026-10-02T12:00:00.000Z"),
      expense("大盘鸡晚餐", 368, "food", "阿南", "2026-10-02T12:00:00.000Z"),
      expense("景区区间车", 720, "ticket", "老周", "2026-10-03T12:00:00.000Z"),
    ],
    settlements: [],
    collaboration: null,
    photos: [],
    createdAt: now,
    updatedAt: now,
  };
}

function locationLabel(travel: TravelItem) {
  return travel.destination ?? travel.destinationPreference ?? "目的地待确定";
}

function ledgerSummary(travel: TravelItem) {
  const participants = participantNames(travel);
  const total = travel.expenses.reduce((sum, item) => sum + item.amount, 0);
  const { suggestions } = settlementSuggestions(travel, participants);
  return {
    participants,
    total,
    perPerson: participants.length ? total / participants.length : 0,
    suggestions,
  };
}

function LedgerCard({
  travel,
  sample = false,
  onOpen,
  onShare,
}: {
  travel: TravelItem;
  sample?: boolean;
  onOpen: () => void;
  onShare?: () => void;
}) {
  const summary = ledgerSummary(travel);
  return (
    <Card className="!p-0 overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-bold text-foreground">{travel.title}</p>
              {sample && <Tag tone="accent">体验样例</Tag>}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {travel.dateText ?? "日期待确定"} · {TRAVEL_STATUS_LABELS[travel.status]}
            </p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[12px] bg-surface-sunk p-3">
            <CircleDollarSign className="size-3.5 text-accent" />
            <p className="mt-2 text-[8px] text-muted-foreground">总金额</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">
              {formatMoney(summary.total)}
            </p>
          </div>
          <div className="rounded-[12px] bg-surface-sunk p-3">
            <Users className="size-3.5 text-accent" />
            <p className="mt-2 text-[8px] text-muted-foreground">每人约</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">
              {formatMoney(summary.perPerson)}
            </p>
          </div>
          <div className="rounded-[12px] bg-surface-sunk p-3">
            <CheckCircle2 className="size-3.5 text-accent" />
            <p className="mt-2 text-[8px] text-muted-foreground">AA状态</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">
              {summary.suggestions.length ? `${summary.suggestions.length}笔待结` : "已平衡"}
            </p>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 border-t border-border">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold text-foreground"
        >
          <Receipt className="size-3.5 text-accent" />
          查看账本
        </button>
        {onShare ? (
          <button
            type="button"
            onClick={onShare}
            className="flex items-center justify-center gap-1.5 border-l border-border py-3 text-[11px] font-semibold text-foreground"
          >
            <Share2 className="size-3.5 text-accent" />
            分享到群
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 border-l border-border py-3 text-[10px] text-muted-foreground">
            样例不分享
          </div>
        )}
      </div>
    </Card>
  );
}

export function AccountingTab({
  travels,
  activeTravelId,
  tab,
  onTabChange,
  onSelectTravel,
  onUpdateTravel,
  onRequireLogin,
}: {
  travels: TravelItem[];
  activeTravelId: string | null;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSelectTravel: (id: string) => void;
  onUpdateTravel: (travel: TravelItem, options?: { sync?: boolean; action?: string }) => void;
  onRequireLogin: (reason: string, onAuthenticated?: () => void) => void;
}) {
  const [view, setView] = useState<AccountingView>("home");
  const [selectedTravelId, setSelectedTravelId] = useState<string | null>(
    activeTravelId ?? travels[0]?.id ?? null,
  );
  const [shareReturnView, setShareReturnView] = useState<"home" | "detail">("home");
  const [sampleTravel, setSampleTravel] = useState<TravelItem>(() => createLedgerSampleTravel());
  const selectedTravel = travels.find((travel) => travel.id === selectedTravelId) ?? null;

  useEffect(() => {
    if (selectedTravelId && travels.some((travel) => travel.id === selectedTravelId)) return;
    setSelectedTravelId(activeTravelId ?? travels[0]?.id ?? null);
  }, [activeTravelId, selectedTravelId, travels]);

  const groups = useMemo(() => {
    const byLocation = new Map<string, TravelItem[]>();
    travels.forEach((travel) => {
      const key = locationLabel(travel);
      byLocation.set(key, [...(byLocation.get(key) ?? []), travel]);
    });
    return [...byLocation.entries()];
  }, [travels]);

  const realTotal = travels.reduce(
    (sum, travel) => sum + travel.expenses.reduce((inner, expense) => inner + expense.amount, 0),
    0,
  );
  const unsettledCount = travels.filter(
    (travel) => ledgerSummary(travel).suggestions.length > 0,
  ).length;

  const openTravel = (id: string) => {
    setSelectedTravelId(id);
    onSelectTravel(id);
    setView("detail");
  };

  const startShare = (travel: TravelItem, returnView: "home" | "detail") => {
    setSelectedTravelId(travel.id);
    onSelectTravel(travel.id);
    setShareReturnView(returnView);
    onRequireLogin("分享旅行账本到群，让同行人查看费用、共同记账和完成 AA 结算", () =>
      setView("share"),
    );
  };

  if (view === "share" && selectedTravel) {
    return (
      <CollaborationCenter
        travel={selectedTravel}
        onReplace={(updated) => onUpdateTravel(updated, { sync: false })}
        onBack={() => setView(shareReturnView)}
      />
    );
  }

  if (view === "detail" && selectedTravel) {
    return (
      <AccountingCenter
        travel={selectedTravel}
        onUpdate={(updated) => onUpdateTravel(updated, { action: "更新了共同账本" })}
        onBack={() => setView("home")}
        onShare={(travel) => startShare(travel, "detail")}
      />
    );
  }

  if (view === "sample") {
    return (
      <AccountingCenter
        travel={sampleTravel}
        onUpdate={setSampleTravel}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <MiniShell title="记账" tab={tab} onTabChange={onTabChange}>
      <div className="space-y-5 px-5 pb-8 pt-3">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-12 -top-14 size-40 rounded-full bg-card/45" />
          <div className="relative">
            <Tag tone="accent">按旅行地归档</Tag>
            <div className="mt-5 flex size-12 items-center justify-center rounded-[16px] bg-card/75">
              <WalletCards className="size-5 text-accent" />
            </div>
            <h2 className="mt-4 text-[22px] font-bold text-foreground">旅行账本</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">
              每个目的地一份账本，能看总金额、每人大约分摊、待结算转账，也能发到群里让同行人查看。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[12px] bg-card/75 p-3">
                <p className="text-[8px] text-muted-foreground">真实账本</p>
                <p className="mt-1 text-[13px] font-bold text-foreground">{travels.length} 份</p>
              </div>
              <div className="rounded-[12px] bg-card/75 p-3">
                <p className="text-[8px] text-muted-foreground">总支出</p>
                <p className="mt-1 text-[13px] font-bold text-foreground">
                  {formatMoney(realTotal)}
                </p>
              </div>
              <div className="rounded-[12px] bg-card/75 p-3">
                <p className="text-[8px] text-muted-foreground">待 AA</p>
                <p className="mt-1 text-[13px] font-bold text-foreground">{unsettledCount} 个</p>
              </div>
            </div>
          </div>
        </Card>

        {!travels.length && (
          <Card className="text-center">
            <Receipt className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[13px] font-semibold text-foreground">还没有真实账本</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              下面的新疆旅行是体验样例，只用于看清账本层级，不会进入你的历史旅行。
            </p>
          </Card>
        )}

        {groups.map(([location, items]) => (
          <section key={location} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">{location}</h2>
              <Tag>{items.length} 个账本</Tag>
            </div>
            {items.map((travel) => (
              <LedgerCard
                key={travel.id}
                travel={travel}
                onOpen={() => openTravel(travel.id)}
                onShare={() => startShare(travel, "home")}
              />
            ))}
          </section>
        ))}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">新疆</h2>
            <Tag tone="accent">体验样例</Tag>
          </div>
          <LedgerCard travel={sampleTravel} sample onOpen={() => setView("sample")} />
        </section>

        {travels.length > 0 && (
          <PrimaryButton onClick={() => openTravel(travels[0].id)}>打开最近账本</PrimaryButton>
        )}
      </div>
    </MiniShell>
  );
}
