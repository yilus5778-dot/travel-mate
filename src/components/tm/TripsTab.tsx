import { useEffect, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Copy,
  ExternalLink,
  ImageUp,
  Link2,
  MapPin,
  Navigation,
  PackageOpen,
  Plus,
  Receipt,
  Route,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { COMPANIONS } from "@/lib/travelmate-data";
import {
  buildPackingChecklist,
  buildSuggestedItinerary,
  displayTravelDate,
  TRAVEL_STATUS_LABELS,
  type CompanionProfile,
  type ExpenseCategory,
  type ItineraryEvidence,
  type ItineraryItem,
  type PackingCategory,
  type PackingItem,
  type SourceItem,
  type TravelItem,
  type TravelStatus,
} from "@/lib/app-model";
import type { AnimalKey } from "@/lib/travelmate-data";
import { MiniShell, Card, PrimaryButton, Tag, type TabKey } from "./MiniShell";
import { CreateTrip } from "./CreateTrip";
import { AccountingCenter } from "./AccountingCenter";
import { CollaborationCenter } from "./CollaborationCenter";

function valueOrPending(value: string | number | null) {
  return value === null || value === "" ? "待确定" : String(value);
}

function evidenceMeta(
  evidence: ItineraryEvidence | undefined,
  source: "user" | "ai",
  confirmed?: boolean,
): { label: string; tone: "muted" | "brand" | "accent"; description: string } {
  const finalEvidence = confirmed
    ? "confirmed"
    : (evidence ?? (source === "user" ? "confirmed" : "suggested"));
  if (finalEvidence === "confirmed") {
    return { label: "已确认", tone: "brand", description: "来自用户输入或手动添加" };
  }
  if (finalEvidence === "queried") {
    return { label: "已查询", tone: "accent", description: "来自资料或联网检索" };
  }
  if (finalEvidence === "needs_check") {
    return { label: "需确认", tone: "muted", description: "会受开放、预约或天气影响" };
  }
  return { label: "AI 建议", tone: "accent", description: "由 AI 基于路线和节奏规划" };
}

const COMPANION_ACCENT_CLASSES: Record<
  AnimalKey,
  {
    card: string;
    dot: string;
    tag: string;
    description: string;
  }
> = {
  cat: {
    card: "border border-[#d8c7f2] bg-[#f5f0ff]",
    dot: "border-card bg-[#8d6ec8]",
    tag: "bg-[#e6d8ff] text-[#5d4a86]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  dolphin: {
    card: "border border-[#b9ddeb] bg-[#ecf8fc]",
    dot: "border-card bg-[#49a9c7]",
    tag: "bg-[#d7f0f8] text-[#28677a]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  panda: {
    card: "border border-[#c8dec0] bg-[#f0f7ec]",
    dot: "border-card bg-[#7fb06c]",
    tag: "bg-[#dcf0d2] text-[#4d7141]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  bird: {
    card: "border border-[#ead58d] bg-[#fff8df]",
    dot: "border-card bg-[#d5a925]",
    tag: "bg-[#ffedac] text-[#7a5c11]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  dog: {
    card: "border border-[#ebc28f] bg-[#fff1df]",
    dot: "border-card bg-[#d2904d]",
    tag: "bg-[#ffe0b7] text-[#79512a]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  elephant: {
    card: "border border-[#c8d1d8] bg-[#f0f3f6]",
    dot: "border-card bg-[#81909b]",
    tag: "bg-[#dce4ea] text-[#51606c]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
  fox: {
    card: "border border-[#efb899] bg-[#fff0e8]",
    dot: "border-card bg-[#e48454]",
    tag: "bg-[#ffd9c5] text-[#8a4d2e]",
    description: "由搭子人格加入的小安排，不改变基础路线。",
  },
};

function CompanionAccentPill({ item }: { item: ItineraryItem }) {
  if (!item.companionAccent) return null;
  const companion = COMPANIONS[item.companionAccent.key];
  const classes = COMPANION_ACCENT_CLASSES[item.companionAccent.key];
  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${classes.tag}`}>
      {companion.emoji} {item.companionAccent.label}
    </span>
  );
}

function dayIntensityLabel(itemCount: number) {
  if (itemCount <= 2) return "轻松";
  if (itemCount === 3) return "舒适";
  return "偏满";
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

function StopImageCard({
  title,
  destination,
  compact = false,
}: {
  title: string;
  destination: string | null;
  compact?: boolean;
}) {
  const visual = stopVisualMeta(title, destination);
  return (
    <div
      role="img"
      aria-label={`${title} 图片`}
      className={`relative overflow-hidden rounded-[14px] bg-gradient-to-br ${visual.tone} ${
        compact ? "mb-2 h-20" : "mb-3 h-24"
      }`}
    >
      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-card/45" />
      <div className="absolute -bottom-10 left-8 h-20 w-44 -rotate-6 rounded-full border-[10px] border-card/35" />
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card/70 px-2 py-1 text-[9px] font-medium text-muted-foreground">
        <Camera className="size-3" />
        图片
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-[18px] leading-none">{visual.emoji}</p>
        <p className="mt-1 truncate text-[11px] font-semibold text-foreground">{visual.label}</p>
      </div>
    </div>
  );
}

interface DailyFoodRecommendation {
  area: string;
  dishes: string[];
  timing: string;
  reason: string;
}

const DAILY_FOOD_RECOMMENDATIONS: Record<string, DailyFoodRecommendation[]> = {
  大同: [
    {
      area: "鼓楼东西街 / 古城内",
      dishes: ["刀削面", "烧麦", "浑源凉粉"],
      timing: "晚餐",
      reason: "第一天活动集中在古城内，晚餐放在鼓楼东西街最顺路。",
    },
    {
      area: "古城或博物馆周边",
      dishes: ["羊杂", "过油肉", "黄米凉糕"],
      timing: "午餐或晚餐",
      reason: "云冈返城后不再远找餐厅，选回城路线附近更稳。",
    },
    {
      area: "浑源县城 / 返城路上",
      dishes: ["浑源凉粉", "莜面", "山西面食"],
      timing: "午餐",
      reason: "悬空寺和恒山都在浑源方向，午餐放在浑源更少折返。",
    },
  ],
  厦门: [
    {
      area: "中山路 / 八市周边",
      dishes: ["沙茶面", "花生汤", "海蛎煎"],
      timing: "晚餐",
      reason: "到达日住中山路或沙坡尾附近，晚餐放在中山路最省体力。",
    },
    {
      area: "鼓浪屿龙头路",
      dishes: ["鱼丸汤", "馅饼", "烧仙草"],
      timing: "午餐",
      reason: "登岛后主要步行，午餐放在龙头路方便补给。",
    },
    {
      area: "八市",
      dishes: ["沙茶面", "海鲜小吃", "花生汤"],
      timing: "午餐",
      reason: "返程前把午餐和伴手礼合并，减少最后一天折返。",
    },
  ],
  青岛: [
    {
      area: "老城 / 栈桥附近",
      dishes: ["海鲜水饺", "锅贴", "啤酒小吃"],
      timing: "晚餐",
      reason: "老城步行线结束后就近吃饭，不再跨区。",
    },
    {
      area: "台东步行街",
      dishes: ["海鲜烧烤", "啤酒", "小吃"],
      timing: "晚餐",
      reason: "崂山返程后需要选择多、收尾方便的餐区。",
    },
    {
      area: "大学路 / 老城咖啡街区",
      dishes: ["咖啡甜点", "轻食", "海鲜面"],
      timing: "午餐",
      reason: "返程日前半天不宜吃太远，轻餐区更适合控节奏。",
    },
  ],
  北海: [
    {
      area: "侨港风情街",
      dishes: ["海鲜", "糖水", "越南小吃"],
      timing: "晚餐",
      reason: "银滩结束后去侨港吃饭顺路，选择也集中。",
    },
    {
      area: "涠洲岛南湾街",
      dishes: ["海鲜粉", "香蕉猪", "糖水"],
      timing: "晚餐",
      reason: "岛上行程结束后在南湾街吃饭，避免夜间多移动。",
    },
    {
      area: "北海老街",
      dishes: ["虾饼", "糖水", "海鲜粉"],
      timing: "早午餐",
      reason: "老街适合返程前慢吃慢逛，把吃饭和伴手礼合并。",
    },
  ],
  大理: [
    {
      area: "大理古城人民路",
      dishes: ["乳扇", "饵丝", "菌子火锅"],
      timing: "晚餐",
      reason: "第一天不做远距离移动，古城内晚餐和夜逛最顺。",
    },
    {
      area: "喜洲古镇",
      dishes: ["喜洲粑粑", "凉鸡米线", "鲜花饼"],
      timing: "午餐",
      reason: "第二天路线到喜洲，午餐放在古镇比回古城更省时间。",
    },
    {
      area: "大理古城",
      dishes: ["饵块", "酸辣鱼", "咖啡甜点"],
      timing: "午餐",
      reason: "返程前把午餐、伴手礼和取行李放在同一区域。",
    },
  ],
};

function getDailyFoodRecommendation(
  destination: string | null,
  day: number,
): DailyFoodRecommendation {
  const recommendations = destination ? DAILY_FOOD_RECOMMENDATIONS[destination] : undefined;
  return (
    recommendations?.[day - 1] ??
    recommendations?.at(-1) ?? {
      area: "当天路线附近",
      dishes: ["当地特色菜", "轻食补给", "方便打包的小吃"],
      timing: day === 1 ? "晚餐" : "午餐",
      reason: "美食建议跟随当天路线放置，避免为了吃饭额外折返。",
    }
  );
}

function DailyFoodCard({ destination, day }: { destination: string | null; day: number }) {
  const food = getDailyFoodRecommendation(destination, day);
  return (
    <div className="mt-2 rounded-[13px] bg-card/85 px-3 py-2 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft">
          <Utensils className="size-3.5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="shrink-0 text-[11px] font-semibold text-foreground">今日美食</p>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-accent">
              {food.timing}
            </span>
            <p className="truncate text-[10px] font-medium text-muted-foreground">{food.area}</p>
          </div>
          <p className="mt-1 truncate text-[9px] text-muted-foreground">
            {food.dishes.join(" / ")}
          </p>
          <p className="mt-1 truncate text-[9px] text-muted-foreground">推荐理由：{food.reason}</p>
        </div>
      </div>
    </div>
  );
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

const EXPENSE_CATEGORIES: Array<{
  value: ExpenseCategory;
  label: string;
  emoji: string;
}> = [
  { value: "food", label: "餐饮", emoji: "🍜" },
  { value: "transport", label: "交通", emoji: "🚕" },
  { value: "hotel", label: "住宿", emoji: "🏨" },
  { value: "ticket", label: "门票", emoji: "🎫" },
  { value: "shopping", label: "购物", emoji: "🛍️" },
  { value: "other", label: "其他", emoji: "🧾" },
];

function formatMoney(value: number) {
  return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
}

const PACKING_CATEGORY_META: Record<
  PackingCategory,
  {
    label: string;
    emoji: string;
    description: string;
  }
> = {
  documents: {
    label: "证件订单",
    emoji: "🪪",
    description: "实名核验、入住和交通会用到。",
  },
  electronics: {
    label: "电子设备",
    emoji: "🔋",
    description: "导航、拍照和群协作的基础保障。",
  },
  clothing: {
    label: "衣物厚度",
    emoji: "🧥",
    description: "按日期、季节和昼夜温差推荐。",
  },
  health: {
    label: "药品护理",
    emoji: "🩹",
    description: "长途、步行和饮食变化的兜底项。",
  },
  destination: {
    label: "因地制宜",
    emoji: "🧭",
    description: "根据目的地特征补充海边、山路或城市步行物品。",
  },
};

const PACKING_SOURCE_LABELS: Record<PackingItem["source"], string> = {
  essential: "必带",
  season: "季节",
  destination: "攻略",
  custom: "自定",
};

function getPackingItems(travel: TravelItem) {
  return travel.packingChecklist.length ? travel.packingChecklist : buildPackingChecklist(travel);
}

function packingProgress(items: PackingItem[]) {
  const checked = items.filter((item) => item.checked).length;
  return { checked, total: items.length };
}

function clothingSummary(items: PackingItem[]) {
  const names = items
    .filter((item) => item.category === "clothing" || item.id === "dest-wind-jacket")
    .map((item) => item.name)
    .slice(0, 2);
  return names.length ? names.join(" + ") : "按季节补充";
}

function PackingChecklistCenter({
  travel,
  onUpdate,
  onBack,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  onBack: () => void;
}) {
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<PackingCategory>("destination");
  const items = getPackingItems(travel);
  const progress = packingProgress(items);
  const destination = travel.destination ?? travel.destinationPreference ?? "目的地";

  const replaceItems = (nextItems: PackingItem[]) =>
    onUpdate({
      ...travel,
      packingChecklist: nextItems,
      updatedAt: new Date().toISOString(),
    });

  const toggleItem = (id: string) => {
    replaceItems(
      items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  const addCustomItem = () => {
    const name = customName.trim();
    if (!name) return;
    replaceItems([
      ...items,
      {
        id: `packing-custom-${Date.now()}`,
        name,
        category: customCategory,
        reason: "你手动添加的物品。",
        source: "custom",
        checked: false,
        required: false,
      },
    ]);
    setCustomName("");
  };

  return (
    <MiniShell title="旅行清单" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-10 -top-14 size-40 rounded-full bg-card/45" />
          <div className="relative">
            <Tag tone="accent">出发前工具</Tag>
            <h2 className="mt-3 text-[22px] font-bold text-foreground">{destination}旅行清单</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              先按常见攻略规则、目的地特征和季节生成；天气、景区限制和航空规则仍建议出发前再确认。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[13px] bg-card/75 p-3">
                <p className="text-[9px] text-muted-foreground">准备进度</p>
                <p className="mt-1 text-[18px] font-bold text-foreground">
                  {progress.checked}/{progress.total}
                </p>
              </div>
              <div className="rounded-[13px] bg-card/75 p-3">
                <p className="text-[9px] text-muted-foreground">衣物厚度</p>
                <p className="mt-1 text-[12px] font-bold leading-snug text-foreground">
                  {clothingSummary(items)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="!p-3">
          <div className="flex gap-2">
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="补充一个物品"
              className="min-w-0 flex-1 rounded-[12px] bg-surface-sunk px-3 py-2 text-[12px] outline-none"
            />
            <select
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value as PackingCategory)}
              className="rounded-[12px] bg-surface-sunk px-2 text-[11px] outline-none"
              aria-label="物品分类"
            >
              {Object.entries(PACKING_CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCustomItem}
              className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground"
              aria-label="添加物品"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </Card>

        {(Object.keys(PACKING_CATEGORY_META) as PackingCategory[]).map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          if (!categoryItems.length) return null;
          const meta = PACKING_CATEGORY_META[category];
          return (
            <Card key={category} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft text-[18px]">
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{meta.description}</p>
                    </div>
                    <Tag>
                      {categoryItems.filter((item) => item.checked).length}/{categoryItems.length}
                    </Tag>
                  </div>
                  <div className="mt-3 space-y-2">
                    {categoryItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className="flex w-full items-start gap-2 rounded-[12px] bg-surface-sunk px-3 py-2 text-left"
                      >
                        <span
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            item.checked
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-card"
                          }`}
                        >
                          {item.checked && <CheckCircle2 className="size-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[12px] font-semibold ${
                              item.checked
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                            {item.reason}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-card/80 px-2 py-0.5 text-[8px] font-semibold text-muted-foreground">
                          {PACKING_SOURCE_LABELS[item.source]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </MiniShell>
  );
}

function ExpenseLedger({
  travel,
  onUpdate,
  settlementMode = false,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  settlementMode?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState("我");
  const [formError, setFormError] = useState("");
  const total = travel.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const peopleCount = Math.max(travel.peopleCount ?? travel.members.length + 1, 1);
  const average = total / peopleCount;
  const payerOptions = ["我", ...travel.members.map((member) => member.name)].filter(
    (name, index, values) => values.indexOf(name) === index,
  );

  const addExpense = () => {
    const numericAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("请填写消费名称和大于 0 的金额");
      return;
    }
    onUpdate({
      ...travel,
      expenses: [
        {
          id: `expense-${Date.now()}`,
          title: title.trim(),
          amount: numericAmount,
          category,
          paidBy,
          splitMode: "equal",
          shares: payerOptions.map((name) => ({
            name,
            amount: numericAmount / Math.max(payerOptions.length, 1),
          })),
          note: null,
          spentAt: new Date().toISOString(),
          createdBy: "我",
          createdAt: new Date().toISOString(),
        },
        ...travel.expenses,
      ],
      updatedAt: new Date().toISOString(),
    });
    setTitle("");
    setAmount("");
    setCategory("food");
    setPaidBy("我");
    setFormError("");
    setShowForm(false);
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-4 text-accent" />
            <p className="text-[14px] font-semibold text-foreground">
              {settlementMode ? "费用与 AA 结算" : "旅行记账"}
            </p>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            只统计你真实记录的消费，不自动生成金额。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-semibold text-foreground"
        >
          {showForm ? "收起" : settlementMode ? "补记一笔" : "+ 记一笔"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[13px] bg-surface-sunk p-2.5">
          <p className="text-[9px] text-muted-foreground">总支出</p>
          <p className="mt-1 text-[14px] font-bold text-foreground">{formatMoney(total)}</p>
        </div>
        <div className="rounded-[13px] bg-surface-sunk p-2.5">
          <p className="text-[9px] text-muted-foreground">参与人数</p>
          <p className="mt-1 text-[14px] font-bold text-foreground">{peopleCount} 人</p>
        </div>
        <div className="rounded-[13px] bg-accent-soft p-2.5">
          <p className="text-[9px] text-muted-foreground">暂定人均</p>
          <p className="mt-1 text-[14px] font-bold text-accent">{formatMoney(average)}</p>
        </div>
      </div>

      {travel.budget && (
        <div className="mt-3 rounded-[12px] bg-brand-soft p-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">旅行预算</span>
            <span className="font-medium text-foreground">
              已用 {formatMoney(total)} / {formatMoney(travel.budget)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card/70">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min((total / travel.budget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-3 rounded-[16px] border border-border p-3">
          <div className="grid grid-cols-[1fr_92px] gap-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：午餐"
              className="min-w-0 rounded-[11px] bg-surface-sunk px-3 py-2.5 text-[11px] outline-none"
            />
            <div className="flex items-center rounded-[11px] bg-surface-sunk px-2">
              <span className="text-[11px] text-muted-foreground">¥</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[11px] outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setCategory(item.value)}
                className={`rounded-[10px] py-2 text-[10px] ${
                  category === item.value
                    ? "bg-brand-soft font-semibold text-foreground"
                    : "bg-surface-sunk text-muted-foreground"
                }`}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-[9px] text-muted-foreground">谁先支付</span>
            <select
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              className="mt-1 w-full rounded-[11px] bg-surface-sunk px-3 py-2 text-[11px] outline-none"
            >
              {payerOptions.map((payer) => (
                <option key={payer}>{payer}</option>
              ))}
            </select>
          </label>
          {formError && <p className="text-[10px] text-destructive">{formError}</p>}
          <button
            type="button"
            onClick={addExpense}
            className="w-full rounded-[11px] bg-primary py-2.5 text-[11px] font-semibold text-primary-foreground"
          >
            保存这笔消费
          </button>
        </div>
      )}

      {travel.expenses.length ? (
        <div className="mt-4 space-y-2">
          {travel.expenses.map((expense) => {
            const categoryMeta =
              EXPENSE_CATEGORIES.find((item) => item.value === expense.category) ??
              EXPENSE_CATEGORIES.at(-1)!;
            return (
              <div
                key={expense.id}
                className="flex items-center gap-3 rounded-[13px] bg-surface-sunk p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-card text-base">
                  {categoryMeta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {expense.title}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {categoryMeta.label} · {expense.paidBy}支付
                  </p>
                </div>
                <p className="text-[12px] font-bold text-foreground">
                  {formatMoney(expense.amount)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...travel,
                      expenses: travel.expenses.filter((item) => item.id !== expense.id),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  aria-label={`删除消费 ${expense.title}`}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[13px] bg-surface-sunk p-4 text-center">
          <p className="text-[11px] font-medium text-foreground">还没有费用记录</p>
          <p className="mt-1 text-[9px] text-muted-foreground">
            记录第一笔真实消费后，系统才会计算总额和人均。
          </p>
        </div>
      )}

      {settlementMode && total > 0 && (
        <div className="mt-4 rounded-[13px] border border-accent/25 bg-accent-soft p-3">
          <p className="text-[11px] font-semibold text-foreground">AA 结算建议</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            当前按 {peopleCount} 人平均分摊，每人暂定 {formatMoney(average)}
            。添加真实同行人和付款人后，可继续计算应收应付。
          </p>
        </div>
      )}
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
    draft: { label: "进入待出发", status: "upcoming" },
    upcoming: { label: "开始旅行", status: "active" },
    active: { label: "结束旅行", status: "completed" },
    completed: { label: "归档旅行", status: "archived" },
  };
  const action = next[travel.status];
  if (!action) return null;

  return (
    <div>
      <PrimaryButton
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
    </div>
  );
}

function openMapSearch(title: string, destination: string | null) {
  const url = new URL("https://uri.amap.com/search");
  url.searchParams.set("keyword", [destination, title].filter(Boolean).join(" "));
  if (destination) url.searchParams.set("city", destination);
  url.searchParams.set("view", "map");
  url.searchParams.set("src", "travelmate");
  url.searchParams.set("callnative", "1");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function DayPlanEditor({
  travel,
  onPatch,
}: {
  travel: TravelItem;
  onPatch: (patch: Partial<TravelItem>) => void;
}) {
  const itineraryDays = travel.itinerary
    .map((item) => item.day ?? 1)
    .filter((day) => Number.isFinite(day));
  const dayCount = Math.min(
    Math.max(travel.durationDays ?? 0, itineraryDays.length ? Math.max(...itineraryDays) : 0, 1),
    7,
  );
  const [selectedDay, setSelectedDay] = useState(1);
  const dayItems = travel.itinerary.filter((item) => (item.day ?? 1) === selectedDay);

  useEffect(() => {
    if (selectedDay > dayCount) setSelectedDay(dayCount);
  }, [dayCount, selectedDay]);

  const baseDayItems = dayItems.filter((item) => !item.companionAccent);

  const updateItem = (id: string, patch: Partial<ItineraryItem>) => {
    onPatch({
      itinerary: travel.itinerary.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (id: string) => {
    onPatch({ itinerary: travel.itinerary.filter((item) => item.id !== id) });
  };

  const addItem = () => {
    const lastTime = dayItems.at(-1)?.time;
    onPatch({
      itinerary: [
        ...travel.itinerary,
        {
          id: `manual-itinerary-${Date.now()}`,
          day: selectedDay,
          time: lastTime ?? "16:00",
          title: "待编辑的新行程",
          detail: null,
          duration: null,
          transportToNext: null,
          reason: null,
          evidence: "needs_check",
          checks: [],
          alternatives: [],
          companionAccent: null,
          confirmed: false,
          source: "user",
        },
      ],
    });
  };

  const addDay = () => {
    if (dayCount >= 7) return;
    const nextDay = dayCount + 1;
    onPatch({
      durationDays: nextDay,
      itinerary: [
        ...travel.itinerary,
        {
          id: `manual-itinerary-${Date.now()}`,
          day: nextDay,
          time: "09:00",
          title: "待编辑的新行程",
          detail: null,
          duration: null,
          transportToNext: null,
          reason: null,
          evidence: "needs_check",
          checks: [],
          alternatives: [],
          companionAccent: null,
          confirmed: false,
          source: "user",
        },
      ],
    });
    setSelectedDay(nextDay);
  };

  const firstStop = baseDayItems[0] ?? dayItems[0] ?? null;
  const routeItems = baseDayItems.slice(0, 4);
  const companionAddonCount = dayItems.filter((item) => item.companionAccent).length;
  const checkItems = dayItems.flatMap((item) =>
    (item.checks ?? []).map((check) => ({ id: `${item.id}-${check}`, title: item.title, check })),
  );
  const routePositions = [
    { left: "10%", top: "26%" },
    { left: "40%", top: "58%" },
    { left: "70%", top: "24%" },
    { left: "82%", top: "66%" },
  ];

  return (
    <Card className="overflow-hidden !p-0">
      <div className="bg-brand-soft px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag tone="accent">专业攻略</Tag>
              <span className="text-[10px] text-muted-foreground">按天规划 · 可编辑</span>
            </div>
            <h3 className="mt-2 text-[18px] font-bold text-foreground">
              D{selectedDay} ·{" "}
              {travel.destination ?? travel.destinationPreference ?? "目的地待确定"}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {displayTravelDate(travel.dateText, travel.durationDays) ?? "日期待确定"} · 第{" "}
              {selectedDay} 天
            </p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[13px] bg-card/75">
            <Route className="size-4 text-accent" />
          </div>
        </div>
      </div>

      <div className="border-b border-border px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[52px] rounded-[13px] px-3 py-2 text-center transition-colors ${
                selectedDay === day
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-sunk text-muted-foreground"
              }`}
            >
              <span className="block text-[13px] font-bold">D{day}</span>
              <span className="mt-0.5 block text-[9px]">第 {day} 天</span>
            </button>
          ))}
          {dayCount < 7 && (
            <button
              type="button"
              onClick={addDay}
              aria-label="增加一天"
              className="flex min-w-[48px] items-center justify-center rounded-[14px] border border-dashed border-border text-muted-foreground"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-[12px] bg-brand-soft px-3 py-2 text-[10px] text-muted-foreground">
          <Route className="size-3.5 shrink-0 text-accent" />
          <span className="shrink-0 font-semibold text-foreground">低折返</span>
          <span>·</span>
          <span>{dayIntensityLabel(baseDayItems.length)}</span>
          <span>·</span>
          <span>{baseDayItems.length} 主线</span>
          {companionAddonCount > 0 && (
            <>
              <span>·</span>
              <span className="font-semibold text-accent">{companionAddonCount} 个搭子加料</span>
            </>
          )}
        </div>

        <DailyFoodCard destination={travel.destination} day={selectedDay} />

        {dayItems.length ? (
          <div className="mt-3">
            {dayItems.map((item, index) => {
              const meta = evidenceMeta(item.evidence, item.source, item.confirmed);
              const accentClasses = item.companionAccent
                ? COMPANION_ACCENT_CLASSES[item.companionAccent.key]
                : null;
              const nextItem = dayItems[index + 1];
              return (
                <div key={item.id}>
                  <div className="grid grid-cols-[54px_18px_minmax(0,1fr)] gap-2">
                    <input
                      type="time"
                      value={item.time ?? ""}
                      onChange={(event) =>
                        updateItem(item.id, { time: event.target.value || null })
                      }
                      aria-label={`${item.title}的时间`}
                      className="mt-3 w-full bg-transparent text-[10px] font-medium text-muted-foreground outline-none"
                    />
                    <div className="relative flex justify-center">
                      <span
                        className={`relative z-10 mt-4 size-2.5 rounded-full border-2 shadow-sm ${
                          accentClasses ? accentClasses.dot : "border-card bg-accent"
                        }`}
                      />
                      {index < dayItems.length - 1 && (
                        <span className="absolute bottom-[-18px] top-5 w-px bg-border" />
                      )}
                    </div>
                    <div
                      className={`rounded-[16px] p-3 ${
                        accentClasses ? accentClasses.card : "bg-surface-sunk"
                      }`}
                    >
                      <StopImageCard title={item.title} destination={travel.destination} />
                      <div className="flex items-start gap-2">
                        {item.companionAccent ? (
                          <span className="mt-[-1px] shrink-0 text-[16px]">
                            {COMPANIONS[item.companionAccent.key].emoji}
                          </span>
                        ) : (
                          <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                        )}
                        <input
                          value={item.title}
                          onChange={(event) => updateItem(item.id, { title: event.target.value })}
                          className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`删除 ${item.title}`}
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.companionAccent ? (
                          <CompanionAccentPill item={item} />
                        ) : (
                          <Tag tone={meta.tone}>{meta.label}</Tag>
                        )}
                        <label className="flex max-w-[98px] items-center rounded-full bg-card/70 px-2 py-1 text-[10px] text-muted-foreground">
                          <input
                            value={item.duration ?? ""}
                            onChange={(event) =>
                              updateItem(item.id, { duration: event.target.value || null })
                            }
                            placeholder="停留时长"
                            className="min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
                          />
                        </label>
                      </div>
                      {item.reason && (
                        <div className="mt-2 rounded-[10px] bg-card/55 px-2.5 py-2">
                          <p className="text-[9px] font-semibold text-foreground">推荐理由</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                            {item.reason}
                          </p>
                        </div>
                      )}
                      {Boolean(item.alternatives?.length) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.alternatives!.map((alternative) => (
                            <span
                              key={alternative}
                              className="rounded-full bg-card/70 px-2 py-1 text-[9px] text-muted-foreground"
                            >
                              备选：{alternative}
                            </span>
                          ))}
                        </div>
                      )}
                      {Boolean(item.checks?.length) && (
                        <div className="mt-2 rounded-[10px] border border-border/70 bg-card/40 px-2.5 py-2">
                          <p className="text-[9px] font-semibold text-foreground">需确认</p>
                          <div className="mt-1 space-y-1">
                            {item.checks!.map((check) => (
                              <p
                                key={check}
                                className="text-[10px] leading-relaxed text-muted-foreground"
                              >
                                · {check}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-muted-foreground">
                          {accentClasses ? accentClasses.description : meta.description}
                        </span>
                        <button
                          type="button"
                          onClick={() => openMapSearch(item.title, travel.destination)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground"
                        >
                          <Navigation className="size-3 text-accent" /> 导航
                        </button>
                      </div>
                    </div>
                  </div>
                  {index < dayItems.length - 1 && (
                    <div className="ml-[74px] flex min-h-8 items-center gap-1.5 py-1 text-[9px] text-muted-foreground">
                      <CarFront className="size-3" />
                      <span>
                        {item.companionAccent || nextItem?.companionAccent
                          ? "搭子加料不改变主路线 · 可按体力插入"
                          : (item.transportToNext ?? "前往下一站 · 接入地图后实时计算")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] bg-surface-sunk p-4 text-center">
            <p className="text-[11px] text-muted-foreground">这一天还没有安排。</p>
          </div>
        )}

        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] border border-dashed border-border py-2.5 text-[11px] font-medium text-foreground"
        >
          <Plus className="size-3.5" /> 添加当天行程
        </button>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">当日路线</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                地点位置由地图实时搜索确认，不使用编造坐标。
              </p>
            </div>
            <Route className="size-4 text-accent" />
          </div>
          <div className="relative h-40 overflow-hidden rounded-[18px] bg-accent-soft">
            <div className="absolute -left-10 top-6 h-16 w-52 rotate-12 rounded-full border-[10px] border-card/75" />
            <div className="absolute -right-14 bottom-2 h-20 w-56 -rotate-12 rounded-full border-[10px] border-brand-soft" />
            {routeItems.length > 1 && (
              <>
                <div className="absolute left-[15%] top-[39%] h-1 w-[30%] rotate-[24deg] rounded-full bg-accent/35" />
                <div className="absolute left-[44%] top-[43%] h-1 w-[30%] -rotate-[28deg] rounded-full bg-accent/35" />
                {routeItems.length > 3 && (
                  <div className="absolute left-[70%] top-[46%] h-1 w-[18%] rotate-[55deg] rounded-full bg-accent/35" />
                )}
              </>
            )}
            {routeItems.map((item, index) => (
              <div
                key={item.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={routePositions[index]}
              >
                <div className="mx-auto flex size-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground shadow-sm">
                  {index + 1}
                </div>
                <p className="mt-1 max-w-[88px] truncate rounded-full bg-card/90 px-2 py-1 text-[8px] font-medium text-foreground shadow-sm">
                  {item.title}
                </p>
              </div>
            ))}
            {!routeItems.length && (
              <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                添加地点后自动形成路线
              </div>
            )}
          </div>
          <p className="mt-2 truncate text-[10px] text-muted-foreground">
            {routeItems.length
              ? routeItems.map((item) => item.title).join(" → ")
              : "当天路线待补充"}
          </p>
          <button
            type="button"
            disabled={!firstStop}
            onClick={() => firstStop && openMapSearch(firstStop.title, travel.destination)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[13px] bg-accent py-3 text-[12px] font-semibold text-accent-foreground disabled:opacity-40"
          >
            <Navigation className="size-4" /> 从第一站开始导航
            <ExternalLink className="size-3.5" />
          </button>
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            将打开高德地图搜索第一站，后续地点可在时间线中继续导航。
          </p>
          {checkItems.length > 0 && (
            <div className="mt-3 rounded-[13px] bg-surface-sunk p-3">
              <p className="text-[11px] font-semibold text-foreground">当天少量需确认项</p>
              <div className="mt-2 space-y-1.5">
                {checkItems.slice(0, 3).map((item) => (
                  <p key={item.id} className="text-[10px] leading-relaxed text-muted-foreground">
                    {item.title}：{item.check}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TripHeroCard({
  travel,
  onUpdate,
  onOpenChecklist,
  onOpenAccounting,
  onOpenGroupShare,
  companion,
}: {
  travel: TravelItem;
  onUpdate: (travel: TravelItem) => void;
  onOpenChecklist: () => void;
  onOpenAccounting: () => void;
  onOpenGroupShare: () => void;
  companion: CompanionProfile | null;
}) {
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isDraft = travel.status === "draft";
  const dateLabel = displayTravelDate(travel.dateText, travel.durationDays);
  const canShare = Boolean(travel.destination) && travel.itinerary.length > 0;
  const totalExpense = travel.expenses.reduce((sum, item) => sum + item.amount, 0);
  const packingItems = getPackingItems(travel);
  const packing = packingProgress(packingItems);

  const patchTravel = (patch: Partial<TravelItem>) =>
    onUpdate({
      ...travel,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

  const generatePlan = () => {
    const days = travel.durationDays ?? 3;
    patchTravel({
      itinerary: buildSuggestedItinerary(travel.destination, days, companion?.key),
      durationDays: days,
      aiPlanStatus: "generated",
      aiSummary: `已根据“${
        travel.destinationPreference || travel.destination || "当前旅行想法"
      }”生成 ${days} 天可编辑攻略。基础路线保持不变；${
        companion ? `已按你的${COMPANIONS[companion.key].animal}搭子加入少量彩色加料。` : ""
      }明确输入、AI 建议和动态风险会分开标注，避免满屏待确认。`,
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
      patchTravel({
        sources: [...travel.sources, source],
        aiSummary:
          "网页链接已加入资料识别。当前原型不会只凭 URL 编造行程；正式接入网页正文读取后，会把明确内容放入攻略，把动态风险标为需确认。",
      });
      setLink("");
      setLinkError("");
    } catch {
      setLinkError("请输入完整网页链接");
    }
  };

  return (
    <Card className="relative overflow-hidden !p-0">
      <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-soft" />
      <div className="absolute right-8 top-10 flex size-16 items-center justify-center rounded-full bg-card/70">
        <Navigation className="size-6 text-accent" />
      </div>
      <div className="relative p-5">
        <div className="min-w-0">
          <Tag tone={travel.status === "active" ? "accent" : "brand"}>
            {TRAVEL_STATUS_LABELS[travel.status]}
          </Tag>
          <p className="mt-4 text-[11px] font-medium text-muted-foreground">
            {travel.destination ?? travel.destinationPreference ?? "目的地待确定"}
          </p>
          <h2 className="mt-1 max-w-[13.5rem] text-[24px] font-bold leading-snug text-foreground">
            {travel.title}
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <label className="rounded-[13px] bg-surface-sunk p-2.5">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              value={dateLabel ?? ""}
              onChange={(event) =>
                patchTravel({
                  dateText: event.target.value || null,
                  dateStatus: event.target.value.trim() ? "confirmed" : "undecided",
                })
              }
              placeholder="日期待定"
              className="mt-1 w-full bg-transparent text-[10px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="rounded-[13px] bg-surface-sunk p-2.5">
            <Users className="size-3.5 text-muted-foreground" />
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={travel.peopleCount ?? ""}
                onChange={(event) =>
                  patchTravel({
                    peopleCount: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="人数"
                className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="text-[10px] font-medium text-foreground">人</span>
            </div>
          </label>
          <label className="rounded-[13px] bg-surface-sunk p-2.5">
            <ClipboardList className="size-3.5 text-muted-foreground" />
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={travel.durationDays ?? ""}
                onChange={(event) =>
                  patchTravel({
                    durationDays: event.target.value ? Number(event.target.value) : null,
                  })
                }
                placeholder="天数"
                className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="text-[10px] font-medium text-foreground">
                天 · {travel.itinerary.length ? `${travel.itinerary.length}项` : "待生成"}
              </span>
            </div>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenChecklist}
            className="relative rounded-[13px] bg-surface-sunk p-3 text-left"
          >
            <ClipboardList className="size-4 text-accent" />
            <p className="mt-2 text-[9px] text-muted-foreground">旅行清单</p>
            <p className="mt-0.5 text-[12px] font-bold text-foreground">
              {packing.checked
                ? `${packing.checked}/${packing.total} 已准备`
                : `${packing.total} 项建议`}
            </p>
            <p className="mt-1 truncate text-[9px] text-muted-foreground">
              {clothingSummary(packingItems)}
            </p>
          </button>
          <button
            type="button"
            onClick={onOpenAccounting}
            className="relative rounded-[13px] bg-brand-soft p-3 text-left"
          >
            <CircleDollarSign className="size-4 text-accent" />
            <p className="mt-2 text-[9px] text-muted-foreground">记账</p>
            <p className="mt-0.5 text-[12px] font-bold text-foreground">
              {travel.expenses.length
                ? `${travel.expenses.length} 笔 · ${formatMoney(totalExpense)}`
                : "开始共同账本"}
            </p>
            <span className="absolute right-2 top-2 rounded-full bg-card/80 px-2 py-0.5 text-[8px] font-semibold text-accent">
              重要
            </span>
          </button>
        </div>

        {canShare && (
          <div className="mt-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={onOpenGroupShare}
              className="flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-primary py-2.5 text-[10px] font-semibold text-primary-foreground"
            >
              <Share2 className="size-3.5" /> 分享行程到群
            </button>
          </div>
        )}

        {isDraft && (
          <div className="mt-3 rounded-[15px] bg-card/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-foreground">图片 / 网页链接</p>
              <span className="text-[9px] text-muted-foreground">
                {travel.sources.length ? `${travel.sources.length} 份资料` : "可选"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center justify-center gap-1 rounded-[11px] bg-surface-sunk py-2 text-[10px] font-medium text-foreground"
              >
                <ImageUp className="size-3.5" /> 上传图片
              </button>
              <div className="flex gap-1">
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="粘贴网页链接"
                  className="min-w-0 flex-1 rounded-[11px] bg-surface-sunk px-2 text-[10px] outline-none"
                />
                <button
                  type="button"
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
                const added: SourceItem[] = Array.from(event.target.files ?? []).map(
                  (file, index) => ({
                    id: `draft-image-${Date.now()}-${index}`,
                    kind: "image",
                    name: file.name,
                    status: "recognized",
                  }),
                );
                patchTravel({
                  sources: [...travel.sources, ...added],
                  aiSummary:
                    "图片已加入资料识别。当前原型不会从图片文件名编造行程；正式接入 OCR 后，会把明确内容放入攻略，把动态风险标为需确认。",
                });
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
                      type="button"
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
          </div>
        )}
      </div>
    </Card>
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patchTravel = (patch: Partial<TravelItem>) =>
    onUpdate({
      ...travel,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

  return (
    <div className="space-y-3">
      {travel.itinerary.length ? (
        <DayPlanEditor travel={travel} onPatch={patchTravel} />
      ) : (
        <Card className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft">
            <Route className="size-5 text-accent" />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-foreground">还没有按天行程</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            可以先在顶部添加图片或网页链接，也可以直接点击“生成按天行程”得到时间线和路线导航。
          </p>
        </Card>
      )}

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
      {travel.itinerary.length > 0 && (
        <DayPlanEditor
          travel={travel}
          onPatch={(patch) =>
            onUpdate({
              ...travel,
              ...patch,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
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
        icon={Users}
        title={travel.members.length ? `${travel.members.length} 位同行人` : "没有同行人"}
        description="邀请同行人后，成员和权限会出现在这里。"
      />
      <EmptySection
        icon={CircleDollarSign}
        title={
          travel.expenses.length ? `共同账本已有 ${travel.expenses.length} 笔` : "共同账本尚未开始"
        }
        description="“记账”入口可随时记录预订支出、分类消费和 AA 分摊。"
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
      {travel.itinerary.length > 0 && (
        <DayPlanEditor
          travel={travel}
          onPatch={(patch) =>
            onUpdate({
              ...travel,
              ...patch,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
      <EmptySection
        icon={Navigation}
        title={travel.itinerary.length ? "查看今日行程" : "今天还没有行程"}
        description="旅行中可查看导航、临时调整和时间冲突提醒。"
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
          displayTravelDate(travel.dateText, travel.durationDays) ?? "待确定"
        }`}
      />
      <PrimaryButton onClick={onCreateAgain}>再次创建</PrimaryButton>
    </div>
  );
}

function CompanionGreeting({ companion }: { companion: CompanionProfile | null }) {
  const companionType = companion ? COMPANIONS[companion.key] : null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl">
        {companionType?.emoji ?? "🧳"}
      </div>
      <Card className="flex-1 !p-3">
        <p className="text-[13px] leading-relaxed text-foreground/85">
          {companion
            ? `${companion.name}：把想法、图片或链接给我，我们一起把下一次旅行想好。`
            : "把想法、图片或链接给我，我会先理解需求，再帮你完成旅行计划。"}
        </p>
      </Card>
    </div>
  );
}

function NewTripCard({ prominent, onClick }: { prominent: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[24px] bg-primary text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.99] ${
        prominent ? "min-h-[210px] p-5" : "min-h-[118px] p-4"
      }`}
    >
      <div
        className={`absolute rounded-full bg-card/35 ${
          prominent ? "-right-10 -top-12 size-40" : "-right-8 -top-10 size-28"
        }`}
      />
      <div
        className={`absolute rounded-full border border-card/45 ${
          prominent ? "bottom-5 right-8 size-16" : "-bottom-5 right-16 size-14"
        }`}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex size-10 items-center justify-center rounded-[14px] bg-card/75">
          <Plus className="size-5 text-foreground" />
        </div>
        <div className={prominent ? "mt-6" : "mt-3"}>
          <p className="text-[11px] font-medium text-foreground/65">AI 旅行规划</p>
          <h2 className={`${prominent ? "mt-1 text-[23px]" : "mt-0.5 text-[18px]"} font-bold`}>
            新建旅行
          </h2>
          <p
            className={`mt-1 max-w-[16rem] leading-relaxed text-foreground/70 ${
              prominent ? "text-[12px]" : "text-[11px]"
            }`}
          >
            随便说、随便传，先得到一份能继续修改的旅行方案。
          </p>
        </div>
        {prominent && (
          <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-card/75 px-3 py-1.5 text-[11px] font-semibold text-foreground">
            开始规划 <Sparkles className="size-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}

function createExperienceSample(): TravelItem {
  const itinerary: ItineraryItem[] = (
    [
      ["sample-d1-1", 1, "09:00", "抵达厦门与办理入住"],
      ["sample-d1-2", 1, "13:30", "环岛路海岸慢游"],
      ["sample-d1-3", 1, "18:00", "曾厝垵晚餐与散步"],
      ["sample-d2-1", 2, "08:30", "鼓浪屿轮渡与登岛"],
      ["sample-d2-2", 2, "11:00", "鼓浪屿核心街区"],
      ["sample-d2-3", 2, "17:30", "海边日落与返程"],
      ["sample-d3-1", 3, "09:30", "沙坡尾艺术街区"],
      ["sample-d3-2", 3, "12:00", "八市在地午餐体验"],
      ["sample-d3-3", 3, "15:30", "伴手礼与返程"],
    ] as Array<[string, number, string, string]>
  ).map(([id, day, time, title]) => ({
    id: String(id),
    day: Number(day),
    time: String(time),
    title: String(title),
    confirmed: true,
    source: "ai",
  }));

  return {
    id: "experience-sample-xiamen",
    title: "厦门三日轻旅行",
    departureCity: "广州",
    destination: "厦门",
    destinationPreference: "海边",
    destinationCandidates: ["厦门", "青岛", "北海"],
    dateStatus: "confirmed",
    dateText: "10月1日—10月3日",
    durationDays: 3,
    peopleCount: 2,
    budget: 5000,
    status: "upcoming",
    planningMode: "plan",
    aiPlanStatus: "generated",
    aiSummary: "这是独立的体验样例：每天保留三个核心节点，兼顾海边慢游、在地体验和返程节奏。",
    sourceMode: "idea",
    sourceText: "体验样例，不属于任何真实用户",
    sources: [],
    itinerary,
    orders: [
      { id: "sample-order-flight", title: "往返交通 · 已确认" },
      { id: "sample-order-hotel", title: "两晚住宿 · 已确认" },
    ],
    members: [
      { id: "sample-member-1", name: "体验成员 A" },
      { id: "sample-member-2", name: "体验成员 B" },
    ],
    expenses: [],
    settlements: [],
    packingChecklist: [],
    collaboration: null,
    photos: [],
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

function ExperienceSampleView({
  travel,
  onPatch,
  onBack,
  onStartPlanning,
}: {
  travel: TravelItem;
  onPatch: (patch: Partial<TravelItem>) => void;
  onBack: () => void;
  onStartPlanning: () => void;
}) {
  return (
    <MiniShell title="体验样例" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-10 -top-12 size-36 rounded-full bg-card/45" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Tag tone="accent">完整体验样例</Tag>
              <span className="text-[10px] font-medium text-muted-foreground">不写入用户数据</span>
            </div>
            <p className="mt-4 text-[11px] font-medium text-muted-foreground">广州 → 厦门</p>
            <h2 className="mt-1 text-[23px] font-bold text-foreground">{travel.title}</h2>
            <p className="mt-2 max-w-[17rem] text-[11px] leading-relaxed text-foreground/70">
              {travel.aiSummary}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [CalendarDays, travel.dateText],
                [Users, `${travel.peopleCount} 人`],
                [Wallet, `预算 ¥${travel.budget}`],
              ].map(([Icon, label]) => {
                const FieldIcon = Icon as typeof CalendarDays;
                return (
                  <div key={String(label)} className="rounded-[13px] bg-card/75 p-2.5">
                    <FieldIcon className="size-3.5 text-muted-foreground" />
                    <p className="mt-1 text-[9px] font-medium text-foreground">{String(label)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <DayPlanEditor travel={travel} onPatch={onPatch} />

        <div className="grid grid-cols-2 gap-3">
          <Card className="!p-3">
            <Receipt className="size-4 text-accent" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">订单已确认</p>
            <p className="mt-1 text-[10px] text-muted-foreground">交通、住宿共 2 项</p>
          </Card>
          <Card className="!p-3">
            <ClipboardList className="size-4 text-accent" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">行前清单</p>
            <p className="mt-1 text-[10px] text-muted-foreground">5 项已完成，1 项待办</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-accent" />
            <p className="text-[13px] font-semibold text-foreground">这个样例为什么可执行</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["每天 3 个核心节点", "路线顺序明确", "时间可编辑", "订单与清单已关联"].map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </div>
        </Card>

        <PrimaryButton onClick={onStartPlanning}>按这种方式规划我的旅行</PrimaryButton>
        <p className="-mt-2 text-center text-[9px] text-muted-foreground">
          只会打开真实创建流程，不会复制样例中的目的地、日期、同行人或预算。
        </p>
      </div>
    </MiniShell>
  );
}

function buildGroupShareText(travel: TravelItem, includeDailyPlan: boolean) {
  const dateLabel = displayTravelDate(travel.dateText, travel.durationDays);
  const lines = [
    `【travelmate 行程】${travel.title}`,
    `目的地：${travel.destination ?? "待确定"}`,
    `日期：${dateLabel ?? "待确定"}`,
    `人数：${travel.peopleCount ? `${travel.peopleCount} 人` : "待确定"}`,
  ];

  if (includeDailyPlan) {
    const dayCount = Math.max(
      travel.durationDays ?? 0,
      ...travel.itinerary.map((item) => item.day ?? 1),
      1,
    );
    for (let day = 1; day <= dayCount; day += 1) {
      const dayItems = travel.itinerary.filter((item) => (item.day ?? 1) === day);
      if (!dayItems.length) continue;
      lines.push("", `D${day}`);
      const food = getDailyFoodRecommendation(travel.destination, day);
      lines.push(`美食：${food.area} · ${food.dishes.join(" / ")}（${food.timing}）`);
      lines.push(`  推荐理由：${food.reason}`);
      dayItems.forEach((item) => {
        const meta = evidenceMeta(item.evidence, item.source, item.confirmed);
        const companionAccent = item.companionAccent ? COMPANIONS[item.companionAccent.key] : null;
        const duration = item.duration ? ` · ${item.duration}` : "";
        lines.push(
          `${item.time ?? "时间未定"} · ${item.title}${duration} · ${
            companionAccent ? `${companionAccent.emoji} ${item.companionAccent!.label}` : meta.label
          }`,
        );
        if (item.reason) lines.push(`  推荐理由：${item.reason}`);
        if (item.transportToNext) lines.push(`  下一站：${item.transportToNext}`);
        (item.checks ?? []).forEach((check) => lines.push(`  需确认：${check}`));
      });
    }
  }

  lines.push("", "由 travelmate 整理 · 未包含费用、个人记忆和订单金额");
  return lines.join("\n");
}

function ShareTripView({ travel, onBack }: { travel: TravelItem; onBack: () => void }) {
  const [includeDailyPlan, setIncludeDailyPlan] = useState(true);
  const [shareStatus, setShareStatus] = useState("");
  const dateLabel = displayTravelDate(travel.dateText, travel.durationDays);
  const shareText = buildGroupShareText(travel, includeDailyPlan);

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus("行程内容已复制，可以直接粘贴到微信群。");
    } catch {
      setShareStatus("当前浏览器无法自动复制，请长按下方内容手动复制。");
    }
  };

  const shareToGroup = async () => {
    if (!navigator.share) {
      await copyShareText();
      return;
    }
    try {
      await navigator.share({
        title: travel.title,
        text: shareText,
      });
      setShareStatus("分享面板已完成操作。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("已取消分享，行程内容没有发送。");
        return;
      }
      await copyShareText();
    }
  };

  return (
    <MiniShell title="分享行程到群" onBack={onBack} showTabBar={false}>
      <div className="space-y-4 px-5 pb-8 pt-2">
        <Card className="relative overflow-hidden bg-brand-soft">
          <div className="absolute -right-12 -top-16 size-44 rounded-full bg-card/45" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Tag tone="accent">群分享卡片</Tag>
              <span className="text-[9px] text-muted-foreground">已登录</span>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              {travel.destination ?? "目的地待确定"}
            </p>
            <h2 className="mt-1 text-[22px] font-bold text-foreground">{travel.title}</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[12px] bg-card/75 p-2.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <p className="mt-1 text-[9px] font-medium text-foreground">
                  {dateLabel ?? "日期待定"}
                </p>
              </div>
              <div className="rounded-[12px] bg-card/75 p-2.5">
                <Clock3 className="size-3.5 text-muted-foreground" />
                <p className="mt-1 text-[9px] font-medium text-foreground">
                  {travel.durationDays ? `${travel.durationDays} 天` : "天数待定"}
                </p>
              </div>
              <div className="rounded-[12px] bg-card/75 p-2.5">
                <Users className="size-3.5 text-muted-foreground" />
                <p className="mt-1 text-[9px] font-medium text-foreground">
                  {travel.peopleCount ? `${travel.peopleCount} 人` : "人数待定"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[13px] font-semibold text-foreground">选择群里能看到的内容</p>
          <label className="mt-3 flex items-start gap-3 rounded-[13px] bg-surface-sunk p-3">
            <input
              type="checkbox"
              checked={includeDailyPlan}
              onChange={(event) => setIncludeDailyPlan(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-[11px] font-medium text-foreground">包含每天的安排</span>
              <span className="mt-1 block text-[9px] leading-relaxed text-muted-foreground">
                会标注已确认、AI 建议和少量需确认项。
              </span>
            </span>
          </label>
          <div className="mt-3 rounded-[13px] border border-accent/20 bg-accent-soft p-3">
            <p className="text-[10px] font-medium text-foreground">默认不分享</p>
            <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
              费用记录、个人记忆、订单金额和未加入群的成员信息。
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">群分享内容预览</p>
            <Tag>{shareText.length} 字</Tag>
          </div>
          <textarea
            readOnly
            value={shareText}
            rows={10}
            className="mt-3 w-full resize-none rounded-[13px] bg-surface-sunk p-3 text-[10px] leading-relaxed text-foreground outline-none"
          />
        </Card>

        <PrimaryButton onClick={() => void shareToGroup()}>
          <span className="inline-flex items-center gap-1.5">
            <Send className="size-4" /> 打开分享面板
          </span>
        </PrimaryButton>
        <button
          type="button"
          onClick={() => void copyShareText()}
          className="flex w-full items-center justify-center gap-1.5 rounded-[13px] bg-card py-3 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)]"
        >
          <Copy className="size-4 text-accent" /> 复制后粘贴到微信群
        </button>
        {shareStatus && (
          <p className="rounded-[12px] bg-accent-soft px-3 py-2 text-center text-[10px] text-foreground">
            {shareStatus}
          </p>
        )}
        <p className="text-center text-[9px] leading-relaxed text-muted-foreground">
          移动端打开分享面板后，选择微信并发送到目标群聊。
        </p>
      </div>
    </MiniShell>
  );
}

function RecentTrips({
  travels,
  compact = false,
  onOpen,
  onOpenSample,
}: {
  travels: TravelItem[];
  compact?: boolean;
  onOpen: (id: string) => void;
  onOpenSample: () => void;
}) {
  const recent = travels
    .filter((item) => ["completed", "archived"].includes(item.status))
    .slice(0, 2);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-foreground">近期旅行</h2>
        <Tag>体验样例可查看</Tag>
      </div>
      <div className="space-y-2">
        {recent.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpen(item.id)}
            className="flex w-full items-center gap-3 rounded-[18px] bg-card p-3 text-left shadow-[var(--shadow-card)]"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-sunk">
              <MapPin className="size-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {displayTravelDate(item.dateText, item.durationDays) ?? "日期待确定"} ·{" "}
                {TRAVEL_STATUS_LABELS[item.status]}
              </p>
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenSample}
          className={`flex w-full items-center gap-3 rounded-[18px] border border-dashed border-border bg-card/70 text-left transition-transform active:scale-[0.99] ${
            compact ? "p-3" : "p-4"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-[14px] bg-accent-soft ${
              compact ? "size-10" : "size-12"
            }`}
          >
            <MapPin className="size-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-foreground">厦门三日轻旅行</p>
              <span className="shrink-0 text-[9px] font-medium text-accent">示例</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              厦门 · 3 天 · 点击查看完整标杆案例
            </p>
          </div>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </section>
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
  startInTrip = false,
}: {
  companion: CompanionProfile | null;
  travels: TravelItem[];
  activeTravelId: string | null;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSelectTravel: (id: string) => void;
  onCreateTravel: (travel: TravelItem) => void;
  onUpdateTravel: (travel: TravelItem, options?: { sync?: boolean; action?: string }) => void;
  onDeleteTravel: (id: string) => void;
  onRequireLogin: (reason: string, onAuthenticated?: () => void) => void;
  startInTrip?: boolean;
}) {
  const [view, setView] = useState<
    "home" | "trip" | "create" | "sample" | "share" | "groupShare" | "accounting" | "checklist"
  >(startInTrip ? "trip" : "home");
  const [sampleTravel, setSampleTravel] = useState<TravelItem>(createExperienceSample);
  const [shareTravelId, setShareTravelId] = useState<string | null>(null);
  const [shareReturnView, setShareReturnView] = useState<"home" | "trip">("home");
  const travel = travels.find((item) => item.id === activeTravelId) ?? travels[0] ?? null;
  const shareTravel = travels.find((item) => item.id === shareTravelId) ?? null;
  const plannedTravel =
    travels.find((item) => ["active", "upcoming", "draft"].includes(item.status)) ?? travel;

  const startShare = (item: TravelItem, returnView: "home" | "trip") => {
    setShareTravelId(item.id);
    setShareReturnView(returnView);
    onRequireLogin("创建协作旅行，让同行人在不同设备共同编辑行程和账本", () => setView("share"));
  };

  const startGroupShare = (item: TravelItem, returnView: "home" | "trip") => {
    setShareTravelId(item.id);
    setShareReturnView(returnView);
    setView("groupShare");
  };

  useEffect(() => {
    if (!travel && view === "trip") setView("home");
  }, [travel, view]);

  if (view === "sample") {
    return (
      <ExperienceSampleView
        travel={sampleTravel}
        onBack={() => setView("home")}
        onStartPlanning={() => setView("create")}
        onPatch={(patch) =>
          setSampleTravel((current) => ({
            ...current,
            ...patch,
            updatedAt: new Date().toISOString(),
          }))
        }
      />
    );
  }

  if (view === "share" && shareTravel) {
    return (
      <CollaborationCenter
        travel={shareTravel}
        onReplace={(updated) => onUpdateTravel(updated, { sync: false })}
        onBack={() => setView(shareReturnView)}
      />
    );
  }

  if (view === "groupShare" && shareTravel) {
    return <ShareTripView travel={shareTravel} onBack={() => setView(shareReturnView)} />;
  }

  if (view === "accounting" && travel) {
    return (
      <AccountingCenter
        travel={travel}
        onUpdate={(updated) => onUpdateTravel(updated, { action: "更新了共同账本" })}
        onBack={() => setView("trip")}
      />
    );
  }

  if (view === "checklist" && travel) {
    return (
      <PackingChecklistCenter
        travel={travel}
        onUpdate={(updated) => onUpdateTravel(updated, { action: "更新了旅行清单" })}
        onBack={() => setView("trip")}
      />
    );
  }

  if (view === "create") {
    return (
      <CreateTrip
        companion={companion}
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
        <div className="space-y-5 px-5 pb-8 pt-3">
          <CompanionGreeting companion={companion} />
          <NewTripCard prominent onClick={() => setView("create")} />
          <RecentTrips
            travels={travels}
            onOpen={(id) => {
              onSelectTravel(id);
              setView("trip");
            }}
            onOpenSample={() => setView("sample")}
          />
        </div>
      </MiniShell>
    );
  }

  if (view === "home") {
    return (
      <MiniShell title="旅程" tab={tab} onTabChange={onTabChange}>
        <div className="space-y-5 px-5 pb-8 pt-3">
          <CompanionGreeting companion={companion} />

          {plannedTravel && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-foreground">计划出行</h2>
                <Tag tone={plannedTravel.status === "active" ? "accent" : "brand"}>
                  {TRAVEL_STATUS_LABELS[plannedTravel.status]}
                </Tag>
              </div>
              <Card className="relative min-h-[228px] overflow-hidden !p-0">
                <div className="absolute -right-14 -top-16 size-44 rounded-full bg-brand-soft" />
                <div className="absolute right-7 top-14 flex size-16 items-center justify-center rounded-full bg-card/70">
                  <Navigation className="size-6 text-accent" />
                </div>
                {Boolean(plannedTravel.destination) &&
                  plannedTravel.itinerary.length > 0 &&
                  plannedTravel.aiPlanStatus !== "not_started" && (
                    <button
                      type="button"
                      onClick={() => startGroupShare(plannedTravel, "home")}
                      className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-accent-foreground shadow-sm"
                    >
                      <Share2 className="size-3" /> 分享到群
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectTravel(plannedTravel.id);
                    setView("trip");
                  }}
                  className="relative flex min-h-[228px] w-full flex-col p-5 text-left"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {plannedTravel.destination ??
                      plannedTravel.destinationPreference ??
                      "目的地待确定"}
                  </p>
                  <h3 className="mt-1 max-w-[13rem] text-[22px] font-bold leading-snug text-foreground">
                    {plannedTravel.title}
                  </h3>
                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {displayTravelDate(plannedTravel.dateText, plannedTravel.durationDays) ??
                          "日期待确定"}
                      </p>
                    </div>
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <Users className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {plannedTravel.peopleCount ? `${plannedTravel.peopleCount} 人` : "人数待定"}
                      </p>
                    </div>
                    <div className="rounded-[13px] bg-surface-sunk p-2.5">
                      <ClipboardList className="size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-[10px] font-medium text-foreground">
                        {plannedTravel.itinerary.length
                          ? `${plannedTravel.itinerary.length} 项安排`
                          : "待生成行程"}
                      </p>
                    </div>
                  </div>
                </button>
                {plannedTravel.status !== "archived" &&
                  Boolean(plannedTravel.destination) &&
                  plannedTravel.itinerary.length > 0 &&
                  plannedTravel.aiPlanStatus !== "not_started" && (
                    <button
                      onClick={() => startShare(plannedTravel, "home")}
                      className="relative flex w-full items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-3 text-[11px] font-medium text-foreground"
                    >
                      <Share2 className="size-3.5 text-accent" />
                      {plannedTravel.collaboration
                        ? `协作旅行 · ${plannedTravel.collaboration.members.length} 人`
                        : "邀请同行人共同编辑"}
                    </button>
                  )}
              </Card>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">开始下一段旅行</h2>
              <span className="text-[10px] text-muted-foreground">随时创建</span>
            </div>
            <NewTripCard prominent={false} onClick={() => setView("create")} />
          </section>

          <RecentTrips
            compact
            travels={travels}
            onOpen={(id) => {
              onSelectTravel(id);
              setView("trip");
            }}
            onOpenSample={() => setView("sample")}
          />

          {travels
            .filter(
              (item) =>
                item.id !== plannedTravel?.id && !["completed", "archived"].includes(item.status),
            )
            .map((item) => (
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
                    {displayTravelDate(item.dateText, item.durationDays) ?? "日期待确定"}
                  </p>
                </button>
                {item.status !== "archived" &&
                  Boolean(item.destination) &&
                  item.itinerary.length > 0 &&
                  item.aiPlanStatus !== "not_started" && (
                    <button
                      onClick={() => startShare(item, "home")}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-[12px] font-medium text-foreground"
                    >
                      <Share2 className="size-4 text-accent" />
                      {item.collaboration
                        ? `协作旅行 · ${item.collaboration.members.length} 人`
                        : "邀请同行人共同编辑"}
                    </button>
                  )}
              </Card>
            ))}
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
        <TripHeroCard
          travel={travel}
          onUpdate={onUpdateTravel}
          onOpenChecklist={() => setView("checklist")}
          onOpenAccounting={() => setView("accounting")}
          onOpenGroupShare={() => startGroupShare(travel, "trip")}
          companion={companion}
        />
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
