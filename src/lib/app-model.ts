import type { AnimalKey, MatchReason } from "./travelmate-data";
import type { TabKey } from "@/components/tm/MiniShell";

export type AuthState = "guest" | "authenticated";
export type TravelStatus = "draft" | "upcoming" | "active" | "completed" | "archived";
export type TravelDateStatus = "undecided" | "approximate" | "confirmed";
export type PlanningMode = "organize" | "plan";
export type AIPlanStatus = "not_started" | "needs_questions" | "organized" | "generated";
export type SourceStatus = "selected" | "uploading" | "recognizing" | "recognized" | "failed";

export interface SourceItem {
  id: string;
  kind: "image" | "link";
  name: string;
  status: SourceStatus;
  error?: string;
}

export interface ItineraryItem {
  id: string;
  day: number | null;
  time: string | null;
  title: string;
  confirmed: boolean;
  source: "user" | "ai";
}

export interface TravelItem {
  id: string;
  title: string;
  departureCity: string | null;
  destination: string | null;
  destinationPreference: string | null;
  destinationCandidates: string[];
  dateStatus: TravelDateStatus;
  dateText: string | null;
  durationDays: number | null;
  peopleCount: number | null;
  budget: number | null;
  status: TravelStatus;
  planningMode: PlanningMode;
  aiPlanStatus: AIPlanStatus;
  aiSummary: string | null;
  sourceMode: "idea" | "material" | "multimodal";
  sourceText: string | null;
  sources: SourceItem[];
  itinerary: ItineraryItem[];
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
  "北海",
  "广州",
  "深圳",
  "南京",
  "长沙",
  "福州",
];

const DESTINATION_PREFERENCES = ["海边", "海岛", "山里", "草原", "古镇", "温泉", "滑雪"];

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

function extractDate(text: string): {
  dateText: string | null;
  dateStatus: TravelDateStatus;
} {
  const exact = text.match(
    /(?:\d{1,2}|[一二三四五六七八九十]+)月(?:\d{1,2}日)?(?:\s*[—–到至-]\s*(?:\d{1,2}月)?\d{1,2}日)?/,
  )?.[0];
  if (exact) return { dateText: exact, dateStatus: "confirmed" };

  const approximate = text.match(
    /(?:今年|明年)?(?:春天|夏天|秋天|冬天)|下周|下个月|国庆|春节|暑假|寒假/,
  )?.[0];
  return approximate
    ? { dateText: approximate, dateStatus: "approximate" }
    : { dateText: null, dateStatus: "undecided" };
}

export function extractTravelIntent(textValue: string) {
  const text = textValue.trim();
  const knownDestination = DESTINATIONS.find((name) => text.includes(name)) ?? null;
  const genericPlace = text.match(
    /(?:想|计划|打算|准备|要)?去\s*([\u4e00-\u9fffA-Za-z]{2,12}?)(?=旅行|旅游|玩|看看|走走|待|住|过|，|,|。|！|!|和|$)/,
  )?.[1];
  const explicitPreference =
    DESTINATION_PREFERENCES.find((preference) => text.includes(preference)) ?? null;
  const genericIsPreference = genericPlace
    ? DESTINATION_PREFERENCES.includes(genericPlace.trim())
    : false;
  const destination =
    knownDestination ?? (genericPlace && !genericIsPreference ? genericPlace.trim() : null);
  const destinationPreference =
    explicitPreference ?? (genericIsPreference ? genericPlace!.trim() : null);

  const friendMatch = text.match(/和([一二两三四五六七八九十\d]+)(?:个)?朋友/);
  const peopleMatch = text.match(/([一二两三四五六七八九十\d]+)\s*人/);
  const peopleCount = friendMatch
    ? (parseCount(friendMatch[1]) ?? 0) + 1
    : peopleMatch
      ? parseCount(peopleMatch[1])
      : null;
  const durationMatch = text.match(/([一二两三四五六七八九十\d]+)\s*天/);
  const durationDays = durationMatch ? parseCount(durationMatch[1]) : null;
  const date = extractDate(text);
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const looksLikeItinerary =
    lines.length >= 3 ||
    /(?:^|\n)\s*(?:D\d+|Day\s*\d+|第[一二三四五六七八九十\d]+天|\d{1,2}:\d{2})/i.test(text);

  return {
    destination,
    destinationPreference,
    peopleCount,
    durationDays,
    dateText: date.dateText,
    dateStatus: date.dateStatus,
    looksLikeItinerary,
  };
}

export function isMeaningfulIdea(value: string) {
  const text = value.trim();
  if (text.length < 3) return false;
  if (/^[\d\s\p{P}\p{S}]+$/u.test(text)) return false;
  return /[\u4e00-\u9fff]{2,}|[A-Za-z]{4,}/.test(text);
}

export function getDestinationCandidates(preference: string | null) {
  if (!preference) return [];
  if (preference === "海边" || preference === "海岛") return ["厦门", "青岛", "北海"];
  if (preference === "古镇") return ["苏州", "大理", "杭州"];
  if (preference === "山里") return ["大理", "成都", "昆明"];
  if (preference === "温泉") return ["福州", "昆明", "成都"];
  if (preference === "滑雪") return ["北京", "青岛", "西安"];
  return [];
}

const ITINERARY_TEMPLATES: Record<string, string[]> = {
  厦门: ["抵达与环岛路慢游", "鼓浪屿核心体验", "沙坡尾散步与返程"],
  青岛: ["抵达与老城散步", "海岸线与崂山方向体验", "八大关慢游与返程"],
  北海: ["抵达与银滩日落", "涠洲岛方向一日体验", "老街散步与返程"],
};

export function buildSuggestedItinerary(
  destination: string | null,
  durationDays: number | null,
): ItineraryItem[] {
  const days = Math.min(Math.max(durationDays ?? 3, 1), 7);
  const template = destination ? ITINERARY_TEMPLATES[destination] : undefined;
  const generic = ["抵达、安顿与轻量探索", "核心体验与弹性安排", "自由活动与返程"];

  return Array.from({ length: days }, (_, index) => ({
    id: `ai-itinerary-${Date.now()}-${index}`,
    day: index + 1,
    time: null,
    title: template?.[index] ?? generic[index] ?? `第 ${index + 1} 天 · 待继续细化`,
    confirmed: false,
    source: "ai" as const,
  }));
}

export function organizePastedItinerary(textValue: string): ItineraryItem[] {
  const lines = textValue
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2)
    .slice(0, 12);

  return lines.map((line, index) => ({
    id: `user-itinerary-${Date.now()}-${index}`,
    day: index + 1,
    time: line.match(/\b\d{1,2}:\d{2}\b/)?.[0] ?? null,
    title: line.replace(/^(?:D\d+|Day\s*\d+|第[一二三四五六七八九十\d]+天)[:：\s-]*/i, ""),
    confirmed: false,
    source: "user",
  }));
}

export function createTravelDraft({
  inputText,
  departureCity,
  destination,
  destinationPreference,
  destinationCandidates,
  dateStatus,
  dateText,
  durationDays,
  peopleCount,
  budget,
  planningMode,
  aiPlanStatus,
  aiSummary,
  sources,
  itinerary,
}: {
  inputText: string;
  departureCity?: string | null;
  destination?: string | null;
  destinationPreference?: string | null;
  destinationCandidates?: string[];
  dateStatus: TravelDateStatus;
  dateText?: string | null;
  durationDays?: number | null;
  peopleCount?: number | null;
  budget?: number | null;
  planningMode: PlanningMode;
  aiPlanStatus: AIPlanStatus;
  aiSummary?: string | null;
  sources?: SourceItem[];
  itinerary?: ItineraryItem[];
}): TravelItem {
  const now = new Date().toISOString();
  const finalDestination = destination?.trim() || null;

  return {
    id: `trip-${Date.now()}`,
    title: finalDestination ? `${finalDestination}旅行草稿` : "未命名旅行草稿",
    departureCity: departureCity?.trim() || null,
    destination: finalDestination,
    destinationPreference: destinationPreference?.trim() || null,
    destinationCandidates: destinationCandidates ?? [],
    dateStatus,
    dateText: dateText?.trim() || null,
    durationDays: durationDays ?? null,
    peopleCount: peopleCount ?? null,
    budget: budget ?? null,
    status: "draft",
    planningMode,
    aiPlanStatus,
    aiSummary: aiSummary ?? null,
    sourceMode: "multimodal",
    sourceText: inputText.trim() || null,
    sources: sources ?? [],
    itinerary: itinerary ?? [],
    orders: [],
    members: [],
    expenses: [],
    photos: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeTravelItem(travel: TravelItem): TravelItem {
  const legacy = travel as TravelItem & {
    departureCity?: string | null;
    destinationPreference?: string | null;
    destinationCandidates?: string[];
    durationDays?: number | null;
    planningMode?: PlanningMode;
    aiPlanStatus?: AIPlanStatus;
    aiSummary?: string | null;
  };

  return {
    ...travel,
    departureCity: legacy.departureCity ?? null,
    destinationPreference: legacy.destinationPreference ?? null,
    destinationCandidates: legacy.destinationCandidates ?? [],
    durationDays: legacy.durationDays ?? null,
    planningMode: legacy.planningMode ?? (travel.sourceMode === "material" ? "organize" : "plan"),
    aiPlanStatus: legacy.aiPlanStatus ?? (travel.itinerary?.length ? "organized" : "not_started"),
    aiSummary: legacy.aiSummary ?? null,
    itinerary: (travel.itinerary ?? []).map((item, index) => ({
      ...item,
      day: item.day ?? index + 1,
      source: item.source ?? "user",
    })),
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
