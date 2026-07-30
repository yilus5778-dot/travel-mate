import type { AnimalKey, MatchReason } from "./travelmate-data";
import type { TabKey } from "@/components/tm/MiniShell";

export type AuthState = "guest" | "authenticated";
export type TravelStatus = "draft" | "upcoming" | "active" | "completed" | "archived";
export type SourceStatus = "selected" | "uploading" | "recognizing" | "recognized" | "failed";

export interface SourceItem {
  id: string;
  kind: "file" | "link";
  name: string;
  status: SourceStatus;
  error?: string;
}

export interface TravelItem {
  id: string;
  title: string;
  destination: string | null;
  dateStatus: "undecided" | "confirmed";
  dateText: string | null;
  peopleCount: number | null;
  budget: number | null;
  status: TravelStatus;
  sourceMode: "idea" | "material";
  sourceText: string | null;
  sources: SourceItem[];
  itinerary: Array<{ id: string; time: string | null; title: string; confirmed: boolean }>;
  orders: Array<{ id: string; title: string }>;
  members: Array<{ id: string; name: string }>;
  expenses: Array<{ id: string; title: string; amount: number }>;
  photos: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanionProfile {
  key: AnimalKey;
  name: string;
  memoryEnabled: boolean;
  reasons: MatchReason[];
}

export interface MemoryItem {
  id: string;
  type: string;
  value: string;
  source: string;
}

export interface TravelmateState {
  version: 2;
  onboardingComplete: boolean;
  tab: TabKey;
  auth: AuthState;
  companion: CompanionProfile | null;
  memories: MemoryItem[];
  travels: TravelItem[];
  activeTravelId: string | null;
}

export const EMPTY_STATE: TravelmateState = {
  version: 2,
  onboardingComplete: false,
  tab: "trips",
  auth: "guest",
  companion: null,
  memories: [],
  travels: [],
  activeTravelId: null,
};

export const TRAVEL_STATUS_LABELS: Record<TravelStatus, string> = {
  draft: "草稿",
  upcoming: "待出发",
  active: "旅行中",
  completed: "已结束",
  archived: "已归档",
};

const DESTINATIONS = [
  "大理",
  "北京",
  "上海",
  "成都",
  "厦门",
  "杭州",
  "西安",
  "三亚",
  "重庆",
  "苏州",
  "昆明",
  "青岛",
];

const CHINESE_NUMBERS: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseCount(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  return CHINESE_NUMBERS[value] ?? null;
}

export function extractTravelFacts(textValue: string) {
  const text = textValue.trim();
  const knownDestination = DESTINATIONS.find((name) => text.includes(name)) ?? null;
  const genericDestination = text.match(
    /(?:想|计划|打算|准备|要)?去\s*([\u4e00-\u9fffA-Za-z]{2,12}?)(?=旅行|旅游|玩|看看|走走|待|住|过|，|,|。|！|!|和|$)/,
  )?.[1];
  const destination = knownDestination ?? genericDestination?.trim() ?? null;
  const friendMatch = text.match(/和([一二两三四五六七八九十\d]+)(?:个)?朋友/);
  const peopleMatch = text.match(/([一二两三四五六七八九十\d]+)\s*人/);
  const peopleCount = friendMatch
    ? (parseCount(friendMatch[1]) ?? 0) + 1
    : peopleMatch
      ? parseCount(peopleMatch[1])
      : null;
  const dateText =
    text.match(
      /(?:\d{1,2}|[一二三四五六七八九十]+)月(?:\d{1,2}日)?(?:\s*[—–到至-]\s*(?:\d{1,2}月)?\d{1,2}日)?/,
    )?.[0] ??
    text.match(/(?:今年|明年)?(?:春天|夏天|秋天|冬天)|下周|下个月|国庆|春节|暑假|寒假/)?.[0] ??
    null;

  return { destination, peopleCount, dateText };
}

export function isMeaningfulIdea(value: string) {
  const text = value.trim();
  if (text.length < 3) return false;
  if (/^[\d\s\p{P}\p{S}]+$/u.test(text)) return false;
  return /[\u4e00-\u9fff]{2,}|[A-Za-z]{4,}/.test(text);
}

export function createTravelDraft({
  idea,
  destinationOverride,
  dateStatus,
  dateText,
  peopleCount,
  budget,
  sourceMode,
  sources,
}: {
  idea?: string;
  destinationOverride?: string;
  dateStatus: "undecided" | "confirmed";
  dateText?: string;
  peopleCount?: number | null;
  budget?: number | null;
  sourceMode: "idea" | "material";
  sources?: SourceItem[];
}): TravelItem {
  const text = idea?.trim() ?? "";
  const extracted = extractTravelFacts(text);
  const destination =
    destinationOverride === undefined ? extracted.destination : destinationOverride.trim() || null;
  const finalPeopleCount = peopleCount === undefined ? extracted.peopleCount : peopleCount;
  const now = new Date().toISOString();

  return {
    id: `trip-${Date.now()}`,
    title: destination ? `${destination}旅行草稿` : "未命名旅行草稿",
    destination,
    dateStatus,
    dateText: dateStatus === "confirmed" ? dateText?.trim() || null : null,
    peopleCount: finalPeopleCount,
    budget: budget ?? null,
    status: "draft",
    sourceMode,
    sourceText: text || null,
    sources: sources ?? [],
    itinerary: [],
    orders: [],
    members: [],
    expenses: [],
    photos: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function memoriesFromReasons(reasons: MatchReason[]): MemoryItem[] {
  return reasons.map((reason) => ({
    id: `memory-${reason.dimension}`,
    type: reason.dimensionLabel,
    value: reason.answer,
    source: `来自偏好测试：${reason.question}`,
  }));
}
