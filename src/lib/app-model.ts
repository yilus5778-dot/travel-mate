import type { AnimalKey, MatchReason } from "./travelmate-data";
import type { TabKey } from "@/components/tm/MiniShell";

export type AuthState = "guest" | "authenticated";
export type TravelStatus = "draft" | "upcoming" | "active" | "completed" | "archived";
export type TravelDateStatus = "undecided" | "approximate" | "confirmed";
export type PlanningMode = "organize" | "plan";
export type AIPlanStatus = "not_started" | "needs_questions" | "organized" | "generated";
export type SourceStatus = "selected" | "uploading" | "recognizing" | "recognized" | "failed";
export type ExpenseCategory = "food" | "transport" | "hotel" | "ticket" | "shopping" | "other";
export type ExpenseSplitMode = "equal" | "custom" | "personal";
export type CollaborationRole = "owner" | "editor" | "viewer";
export type ItineraryEvidence = "confirmed" | "queried" | "suggested" | "needs_check";
export type PackingCategory = "documents" | "electronics" | "clothing" | "health" | "destination";
export type PackingSource = "essential" | "season" | "destination" | "custom";

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
  detail?: string | null;
  duration?: string | null;
  transportToNext?: string | null;
  reason?: string | null;
  evidence?: ItineraryEvidence;
  checks?: string[];
  alternatives?: string[];
  companionAccent?: {
    key: AnimalKey;
    label: string;
  } | null;
  confirmed: boolean;
  source: "user" | "ai";
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitMode: ExpenseSplitMode;
  shares: Array<{ name: string; amount: number }>;
  note: string | null;
  spentAt: string;
  createdBy: string;
  createdAt: string;
}

export interface SettlementItem {
  id: string;
  from: string;
  to: string;
  amount: number;
  settledAt: string;
}

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  reason: string;
  source: PackingSource;
  checked: boolean;
  required: boolean;
}

export interface CollaborationMember {
  id: string;
  name: string;
  role: CollaborationRole;
  joinedAt: string;
}

export interface CollaborationEvent {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
}

export interface CollaborationMeta {
  sharedTripId: string;
  inviteCode: string;
  role: CollaborationRole;
  inviteRole: Exclude<CollaborationRole, "owner">;
  revision: number;
  members: CollaborationMember[];
  events: CollaborationEvent[];
  syncedAt: string;
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
  packingChecklist: PackingItem[];
  orders: Array<{ id: string; title: string }>;
  members: Array<{ id: string; name: string }>;
  expenses: ExpenseItem[];
  settlements: SettlementItem[];
  collaboration: CollaborationMeta | null;
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
  "大同",
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

export function displayTravelDate(dateText: string | null, durationDays?: number | null) {
  if (!dateText) return null;
  if (dateText.includes("国庆")) {
    const days = durationDays && durationDays > 0 ? Math.min(durationDays, 10) : null;
    return days && days > 1 ? `10月1日—10月${days}日` : "10月1日";
  }
  return dateText;
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

interface ItineraryTemplateStop {
  time: string;
  title: string;
  detail: string;
  duration?: string;
  transportToNext?: string;
  reason?: string;
  evidence?: ItineraryEvidence;
  checks?: string[];
  alternatives?: string[];
}

const ITINERARY_TEMPLATES: Record<string, ItineraryTemplateStop[][]> = {
  大同: [
    [
      {
        time: "10:30",
        title: "大同古城鼓楼住宿区",
        detail: "先放行李，住宿尽量选古城内或鼓楼周边；下午步行串联古城景点，少走回头路。",
        duration: "60–90 分钟",
        transportToNext: "步行 10–15 分钟",
        reason: "到达日先把行李和住宿稳定下来，再进入古城步行线，降低折返和赶路感。",
        alternatives: ["如果到得晚，直接跳到鼓楼东西街晚餐。"],
      },
      {
        time: "14:00",
        title: "华严寺",
        detail:
          "三个点都在古城范围内，适合半天步行；华严寺预留 1.5 小时，善化寺和九龙壁按体力取舍。",
        duration: "90–120 分钟",
        transportToNext: "步行 8–12 分钟",
        reason: "华严寺是古城内最值得保留的主点，下午逛完后顺路接晚餐区。",
        checks: ["寺庙开放时间和节假日闭馆情况需出发前查询。"],
        alternatives: ["如果只想轻松逛，善化寺和九龙壁二选一。"],
      },
      {
        time: "18:30",
        title: "鼓楼东西街",
        detail: "晚餐可安排刀削面、烧麦、浑源凉粉；饭后看城墙和鼓楼夜景，第一天不再安排远途。",
        duration: "90 分钟",
        reason: "晚餐和夜景都在古城内解决，适合到达日收尾。",
      },
    ],
    [
      {
        time: "08:30",
        title: "云冈石窟",
        detail: "从市区出发，预留 3–4 小时；重点看第 5、6、20 窟。门票和开放时间出发前再确认。",
        duration: "3–4 小时",
        transportToNext: "打车 / 包车 35–50 分钟",
        reason: "云冈石窟信息密度高，放在上午体力最好时；下午安排室内缓冲，节奏更稳。",
        checks: ["门票预约、讲解场次和开放时间需联网确认。"],
      },
      {
        time: "13:30",
        title: "大同博物馆",
        detail: "云冈回来后安排室内点，降低疲劳；如果预约不上，就改成古城咖啡休息和补逛。",
        duration: "90–120 分钟",
        transportToNext: "打车 15–25 分钟",
        reason: "上午远途后不继续塞户外点，转成室内内容，避免第二天体力透支。",
        checks: ["博物馆预约规则和闭馆日需联网确认。"],
        alternatives: ["预约不上时改为大同美术馆或古城休息。"],
      },
      {
        time: "18:00",
        title: "古城墙夜游",
        detail: "晚上节奏放轻，适合拍照和散步；第二天已经有远途，避免继续塞满景点。",
        duration: "60–90 分钟",
        reason: "夜间只保留轻量散步点，让第二天悬空寺 / 恒山更可执行。",
      },
    ],
    [
      {
        time: "08:00",
        title: "悬空寺",
        detail: "距离市区较远，建议包车或一日游；旺季尽量提前预约，现场排队时间要留余量。",
        duration: "90–150 分钟",
        transportToNext: "景区车 / 包车 15–25 分钟",
        reason: "悬空寺排队和限流不确定性高，放在最早时段更稳。",
        checks: ["悬空寺登临名额、天气和限流政策需出发前确认。"],
      },
      {
        time: "11:30",
        title: "恒山",
        detail: "体力够就继续恒山，不想爬山就改成浑源午餐和轻松返城；不要两边都硬赶。",
        duration: "2.5–4 小时",
        transportToNext: "包车返城约 1.5 小时",
        reason: "悬空寺和恒山同方向，适合放在同一天；但恒山作为弹性项，不强迫完成。",
        checks: ["索道、天气和末班交通需联网确认。"],
        alternatives: ["体力不足时改成浑源午餐后返城。"],
      },
      {
        time: "16:30",
        title: "回大同取行李返程",
        detail: "从浑源回市区时间不短，返程车票或航班建议留出至少 2 小时机动。",
        duration: "90–120 分钟",
        reason: "最后一站只做返程缓冲，避免远途当天压线赶车。",
      },
    ],
  ],
  厦门: [
    [
      {
        time: "10:30",
        title: "中山路住宿区",
        detail: "先寄存或办理入住；住在中山路、沙坡尾或厦大周边，晚上吃饭和散步都方便。",
      },
      {
        time: "14:00",
        title: "沙坡尾艺术西区",
        detail: "两个点步行可串联，适合第一天下午慢逛；导航先到沙坡尾艺术西区。",
      },
      {
        time: "18:30",
        title: "中山路步行街",
        detail: "晚餐后沿鹭江道看鼓浪屿夜景；第一天不登岛，避免交通太赶。",
      },
    ],
    [
      {
        time: "08:30",
        title: "厦鼓码头",
        detail: "船票建议提前买；岛上主要靠步行，穿舒服的鞋，上午登岛体验更稳。",
      },
      {
        time: "10:00",
        title: "鼓浪屿龙头路",
        detail: "按这个顺序走比较顺；想轻松就只保留最美转角和龙头路，菽庄花园作为加选。",
      },
      {
        time: "17:30",
        title: "返程厦门岛内，白城沙滩看日落",
        detail: "如果当天风大或太累，直接返程去中山路吃饭；日落点作为弹性安排。",
      },
    ],
    [
      {
        time: "09:00",
        title: "南普陀寺",
        detail: "厦大入校政策以当天为准；不确定时把南普陀作为稳定主点，周边轻松走。",
      },
      {
        time: "12:00",
        title: "八市",
        detail: "午餐别排太满，八市适合边逛边吃；贵重海鲜先问清价格再点。",
      },
      {
        time: "15:30",
        title: "取行李返程",
        detail: "去机场或车站至少预留 90 分钟；如果时间多，再补一个咖啡店或伴手礼点。",
      },
    ],
  ],
  青岛: [
    [
      {
        time: "10:30",
        title: "栈桥住宿区",
        detail: "想逛老城住栈桥附近，想看海岸线住五四广场附近；先放行李再开始走。",
      },
      {
        time: "14:00",
        title: "栈桥",
        detail: "老城经典步行线，信号山可以俯看红瓦绿树；下坡后就近吃晚饭。",
      },
      {
        time: "19:00",
        title: "五四广场",
        detail: "晚上看海风舒服但会冷，带外套；两个点沿海步行或短途打车都可以。",
      },
    ],
    [
      {
        time: "08:00",
        title: "崂山",
        detail: "崂山需要完整半天到一天；想看海山选仰口，想经典道观线选太清，别两条都硬塞。",
      },
      {
        time: "15:30",
        title: "小麦岛公园",
        detail: "崂山返程后安排轻量海边点，适合日落；如果太累可直接取消。",
      },
      {
        time: "18:30",
        title: "台东步行街晚餐",
        detail: "选择多、收尾方便；海鲜和小吃都能解决，不用再跨城找餐厅。",
      },
    ],
    [
      {
        time: "09:00",
        title: "八大关",
        detail: "上午散步拍照更舒服；八大关和二浴连在一起，适合返程前半天。",
      },
      {
        time: "12:30",
        title: "青岛啤酒博物馆",
        detail: "想室内体验选啤酒博物馆，想轻松拍照选大学路；根据返程时间取舍。",
      },
      {
        time: "16:00",
        title: "取行李返程",
        detail: "青岛站靠近老城，青岛北站距离较远；返程前确认车站，预留交通时间。",
      },
    ],
  ],
  北海: [
    [
      {
        time: "10:30",
        title: "银滩住宿区",
        detail: "想看海住银滩，想吃饭方便住侨港；先放行李，下午轻松适应海边节奏。",
      },
      {
        time: "15:30",
        title: "北海银滩",
        detail: "下午到傍晚最适合散步拍照；防晒和拖鞋提前准备，别把贵重物品留沙滩。",
      },
      {
        time: "18:30",
        title: "侨港风情街晚餐",
        detail: "晚餐集中解决海鲜、糖水和越南小吃；点海鲜前确认计价方式。",
      },
    ],
    [
      {
        time: "08:30",
        title: "北海国际客运港",
        detail: "船票受天气影响，提前确认开航；上岛后先安排交通和行李。",
      },
      {
        time: "11:00",
        title: "鳄鱼山景区",
        detail: "鳄鱼山是岛上核心点，预留 2 小时；下午去滴水丹屏看海边景观。",
      },
      {
        time: "17:30",
        title: "石螺口海滩",
        detail: "看日落选石螺口，吃饭方便选南湾街；当天不要再跨太多点。",
      },
    ],
    [
      {
        time: "09:30",
        title: "北海老街",
        detail: "返程前安排老街最稳；适合买伴手礼和慢慢吃早午餐。",
      },
      {
        time: "12:30",
        title: "冠头岭国家森林公园",
        detail: "时间紧选外沙岛，想看海景选冠头岭；根据返程交通决定。",
      },
      {
        time: "16:00",
        title: "取行李返程",
        detail: "北海机场离市区有距离，返程前至少预留 90 分钟交通时间。",
      },
    ],
  ],
  大理: [
    [
      {
        time: "10:30",
        title: "大理古城住宿区",
        detail: "想逛街住古城，想看洱海住才村；先放行李，第一天别安排环海大移动。",
      },
      {
        time: "14:00",
        title: "大理古城人民路",
        detail: "步行慢逛即可，适合适应海拔和节奏；想拍照可顺路去五华楼。",
      },
      {
        time: "18:30",
        title: "洱海门",
        detail: "晚餐后轻松散步，不建议第一晚骑车太远；保留体力给第二天环海。",
      },
    ],
    [
      {
        time: "09:00",
        title: "喜洲古镇",
        detail: "上午去更舒服，可安排喜洲粑粑和稻田拍照；导航到喜洲古镇游客中心。",
      },
      {
        time: "13:30",
        title: "海舌公园",
        detail: "按开放和天气选择；海边风大，骑行或包车都要留出返程时间。",
      },
      {
        time: "17:30",
        title: "洱海生态廊道日落",
        detail: "把日落作为当天重点，不再加太多景点；骑行注意还车点。",
      },
    ],
    [
      {
        time: "09:00",
        title: "崇圣寺三塔",
        detail: "返程前选一个稳定核心景点，预留 1.5–2 小时；门票信息当天确认。",
      },
      {
        time: "12:30",
        title: "大理古城",
        detail: "把午餐和买东西合并，避免返程前多点折返。",
      },
      {
        time: "15:30",
        title: "取行李返程",
        detail: "大理站到古城有距离，返程至少预留 60–90 分钟路程。",
      },
    ],
  ],
};

const GENERIC_DAY_PLANS: ItineraryTemplateStop[][] = [
  [
    {
      time: "10:30",
      title: "抵达与办理入住",
      detail: "先确认车站/机场到住宿的路线；住宿位置待定时，优先选交通和吃饭都方便的中心区。",
    },
    {
      time: "14:00",
      title: "住宿周边轻量探索",
      detail: "把第一天下午控制在住宿附近 2–3 公里内，先适应城市，不安排远距离折返。",
    },
    {
      time: "18:30",
      title: "第一顿正餐与夜间散步",
      detail: "选择离住宿近的餐区；餐后只安排一个夜景或散步点，避免到达日太累。",
    },
  ],
  [
    {
      time: "09:00",
      title: "当天核心景点",
      detail: "填入一个最想去的核心景点后再导航；上午留给最重要的点，降低排队和交通不确定性。",
    },
    {
      time: "13:30",
      title: "核心景点附近午餐与补充点",
      detail: "午餐尽量选在上一站附近，下午只加一个顺路点；不要跨城来回跑。",
    },
    {
      time: "18:30",
      title: "晚餐与夜间轻松安排",
      detail: "晚上只保留餐区、夜市或江边散步这类低强度安排；根据体力随时删除。",
    },
  ],
  [
    {
      time: "09:30",
      title: "返程前补充体验",
      detail: "选择一个离住宿或返程交通近的景点；不安排需要长时间排队的项目。",
    },
    {
      time: "12:30",
      title: "午餐与伴手礼",
      detail: "把吃饭、买东西和取行李串在一起，减少返程前折返。",
    },
    {
      time: "15:30",
      title: "取行李返程",
      detail: "根据车站/机场位置预留 60–120 分钟交通时间；具体返程时间待确认。",
    },
  ],
];

const SUGGESTED_TIMES = ["09:00", "13:30", "18:00"];
const SUGGESTED_DURATIONS = ["60–90 分钟", "2–3 小时", "60–90 分钟"];
const SUGGESTED_REASONS = [
  "把当天最重要或最需要确定交通的节点放前面，减少后续不确定性。",
  "中段安排核心体验或顺路补充点，避免路线来回跳。",
  "晚上留给低强度安排或返程缓冲，让计划更可执行。",
];
const SUGGESTED_TRANSPORTS = [
  "前往下一站 · 优先步行或短途打车，接入地图后刷新真实时间",
  "前往下一站 · 按低折返顺序排列，接入地图后校验路线",
];

const COMPANION_ADDON_TIMES: Record<AnimalKey, string> = {
  cat: "20:30",
  dolphin: "20:20",
  panda: "15:30",
  bird: "16:20",
  dog: "12:20",
  elephant: "08:20",
  fox: "16:40",
};

const COMPANION_ANIMAL_LABELS: Record<AnimalKey, string> = {
  cat: "猫",
  dolphin: "海豚",
  panda: "熊猫",
  bird: "小鸟",
  dog: "小狗",
  elephant: "大象",
  fox: "狐狸",
};

function companionAddonDays(durationDays: number) {
  const days = Math.min(Math.max(durationDays, 1), 7);
  const addonCount = Math.min(days, 3);
  return Array.from({ length: addonCount }, (_, index) => index + 1);
}

function buildCompanionAddon(
  companionKey: AnimalKey,
  destination: string | null,
  day: number,
): ItineraryItem {
  const place = destination ?? "当天路线";
  const base = {
    id: `companion-addon-${Date.now()}-${companionKey}-${day}`,
    day,
    time: COMPANION_ADDON_TIMES[companionKey],
    evidence: "suggested" as const,
    checks: [],
    alternatives: [],
    confirmed: false,
    source: "ai" as const,
    companionAccent: {
      key: companionKey,
      label: `${COMPANION_ANIMAL_LABELS[companionKey]}搭子加料`,
    },
  };

  if (companionKey === "cat") {
    return {
      ...base,
      title: `${place}安静角落`,
      detail: "在当天主线附近找一个可坐下的咖啡、书店或海边长椅，留一小段不社交的恢复时间。",
      duration: "30–45 分钟",
      transportToNext: null,
      reason:
        "在当天主线附近找一个可坐下的咖啡、书店或海边长椅；猫搭子尊重独处空间，这个加料只占很小一段时间，不改变主路线。",
    };
  }
  if (companionKey === "dolphin") {
    return {
      ...base,
      title: "同行高光交换",
      detail: "在晚餐后或当天最后一站，选一个方便停留的地方，让每个人说一个今日高光并拍一张合照。",
      duration: "20–30 分钟",
      transportToNext: null,
      reason:
        "放在晚餐后或最后一站，让每个人说一个今日高光并拍一张合照；海豚搭子更重视同行氛围，用轻量互动提升参与感。",
    };
  }
  if (companionKey === "panda") {
    return {
      ...base,
      title: "松弛补给站",
      detail: "在下午主行程之间安排坐下喝水、甜品或回酒店短休，不新增远距离移动。",
      duration: "30–45 分钟",
      transportToNext: null,
      reason:
        "放在下午主行程之间，坐下喝水、吃甜品或回酒店短休；熊猫搭子会给体力留余地，让计划不因为过满而崩掉。",
    };
  }
  if (companionKey === "bird") {
    return {
      ...base,
      title: "顺路灵感岔路",
      detail: "只在当前街区或景点周边临时探索一条小巷、观景点或市集，不跨区追新点。",
      duration: "20–40 分钟",
      transportToNext: null,
      reason:
        "只在当前街区或景点周边探索一条小巷、观景点或市集；小鸟搭子保留一点自由探索，但把范围限制在顺路半径内。",
    };
  }
  if (companionKey === "dog") {
    return {
      ...base,
      title: "同行集合补给",
      detail: "午餐前后设一个固定集合点，确认每个人体力、饮水和下一站是否都 OK。",
      duration: "15–25 分钟",
      transportToNext: null,
      reason:
        "午餐前后设一个固定集合点，确认每个人体力、饮水和下一站是否 OK；小狗搭子关注团队感受，让同行人不容易掉队。",
    };
  }
  if (companionKey === "elephant") {
    return {
      ...base,
      title: "出发前确认站",
      detail: "当天出门前确认门票、交通、天气和第一站导航，只做确认，不额外增加景点。",
      duration: "10–15 分钟",
      transportToNext: null,
      reason:
        "当天出门前确认门票、交通、天气和第一站导航；大象搭子偏稳健，把不确定性提前收口，但不改变原本行程主线。",
    };
  }
  return {
    ...base,
    title: "Plan B 弹性口袋",
    detail: "给当天保留一个可随时替换的低成本选项：附近咖啡、轻松街区或提前回酒店。",
    duration: "20–40 分钟",
    transportToNext: null,
    reason:
      "给当天保留一个可随时替换的低成本选项：附近咖啡、轻松街区或提前回酒店；狐狸搭子负责应变，让排队、天气或疲劳时有退路。",
  };
}

function sortItineraryForDisplay(items: ItineraryItem[]) {
  return items.slice().sort((a, b) => {
    const dayDiff = (a.day ?? 1) - (b.day ?? 1);
    if (dayDiff !== 0) return dayDiff;
    const timeA = a.time ?? "99:99";
    const timeB = b.time ?? "99:99";
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.id.localeCompare(b.id);
  });
}

export function applyCompanionItineraryAccents(
  itinerary: ItineraryItem[],
  destination: string | null,
  durationDays: number | null,
  companionKey: AnimalKey | null | undefined,
) {
  if (!companionKey) return itinerary;

  const dayCount = Math.max(durationDays ?? 0, ...itinerary.map((item) => item.day ?? 1), 1);
  const existingAddonDays = new Set(
    itinerary
      .filter((item) => item.companionAccent?.key === companionKey)
      .map((item) => item.day ?? 1),
  );
  const addons = companionAddonDays(dayCount)
    .filter((day) => !existingAddonDays.has(day))
    .map((day) => buildCompanionAddon(companionKey, destination, day));

  return sortItineraryForDisplay([...itinerary, ...addons]);
}

export function buildSuggestedItinerary(
  destination: string | null,
  durationDays: number | null,
  companionKey?: AnimalKey | null,
): ItineraryItem[] {
  const days = Math.min(Math.max(durationDays ?? 3, 1), 7);
  const template = destination ? ITINERARY_TEMPLATES[destination] : undefined;

  const itinerary = Array.from({ length: days }, (_, dayIndex) => {
    const fallback =
      GENERIC_DAY_PLANS[dayIndex] ??
      ([
        {
          time: "09:30",
          title: `${destination ?? "目的地"}第 ${dayIndex + 1} 天核心安排`,
          detail: "这一天的具体地点待补充；先保留一个上午核心点、一个下午顺路点和一个晚间轻松点。",
        },
        {
          time: "13:30",
          title: "顺路午餐与补充体验",
          detail: "午餐尽量放在上午点附近；下午只添加顺路地点，避免路线来回跳。",
        },
        {
          time: "18:30",
          title: "晚间休整",
          detail: "根据体力安排夜景、餐区或回酒店休息；不强行塞满。",
        },
      ] satisfies ItineraryTemplateStop[]);
    const dayPlan = template?.[dayIndex] ?? fallback;

    return dayPlan.map((stop, itemIndex) => ({
      id: `ai-itinerary-${Date.now()}-${dayIndex}-${itemIndex}`,
      day: dayIndex + 1,
      time: stop.time || SUGGESTED_TIMES[itemIndex] || null,
      title: stop.title,
      detail: stop.detail,
      duration: stop.duration ?? SUGGESTED_DURATIONS[itemIndex] ?? null,
      transportToNext:
        itemIndex < dayPlan.length - 1
          ? (stop.transportToNext ?? SUGGESTED_TRANSPORTS[itemIndex] ?? null)
          : null,
      reason: stop.reason ?? SUGGESTED_REASONS[itemIndex] ?? null,
      evidence: stop.evidence ?? "suggested",
      checks: stop.checks ?? [],
      alternatives: stop.alternatives ?? [],
      companionAccent: null,
      confirmed: false,
      source: "ai" as const,
    }));
  }).flat();

  return applyCompanionItineraryAccents(itinerary, destination, days, companionKey);
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
    detail: null,
    duration: null,
    transportToNext: null,
    reason: "来自你粘贴或输入的原文，未额外补写。",
    evidence: "confirmed",
    checks: [],
    alternatives: [],
    companionAccent: null,
    confirmed: false,
    source: "user",
  }));
}

function inferTravelMonth(dateText: string | null) {
  if (!dateText) return null;
  if (dateText.includes("国庆")) return 10;
  const match = dateText.match(/(\d{1,2})\s*月/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

function inferPackingSeason(dateText: string | null) {
  const month = inferTravelMonth(dateText);
  if (!month) return "未知季节";
  if ([12, 1, 2].includes(month)) return "冬季";
  if ([3, 4, 5].includes(month)) return "春季";
  if ([6, 7, 8].includes(month)) return "夏季";
  return "秋季";
}

function packingItem(
  id: string,
  name: string,
  category: PackingCategory,
  reason: string,
  source: PackingSource,
  required = true,
): PackingItem {
  return { id, name, category, reason, source, checked: false, required };
}

export function buildPackingChecklist(travel: Pick<TravelItem, "destination" | "dateText">) {
  const destination = travel.destination ?? "";
  const destinationText = destination || "目的地";
  const season = inferPackingSeason(travel.dateText);
  const isCoastal = /海|岛|厦门|青岛|北海|三亚|秦皇岛|鼓浪屿|银滩|涠洲/.test(destinationText);
  const isMountain = /山|大理|昆明|恒山|崂山|悬空|高原/.test(destinationText);
  const isCityWalk = /北京|上海|成都|重庆|杭州|苏州|西安|南京|长沙|大同|古城|街/.test(
    destinationText,
  );
  const items: PackingItem[] = [
    packingItem(
      "doc-id-card",
      "身份证",
      "documents",
      "住宿、交通和多数景区实名核验都需要。",
      "essential",
    ),
    packingItem(
      "doc-ticket-screenshots",
      "车票 / 酒店 / 门票截图",
      "documents",
      "网络不稳定时也能快速出示订单和预约信息。",
      "essential",
    ),
    packingItem(
      "doc-student-card",
      "学生证或优惠证件",
      "documents",
      "部分景点可用优惠票；没有可直接取消。",
      "essential",
      false,
    ),
    packingItem(
      "elec-power-bank",
      "充电宝",
      "electronics",
      "全天导航、拍照和群协作会明显耗电。",
      "essential",
    ),
    packingItem(
      "elec-cables",
      "充电器和数据线",
      "electronics",
      "手机、耳机和相机等设备统一补电。",
      "essential",
    ),
    packingItem(
      "elec-earphones",
      "耳机",
      "electronics",
      "长途交通和排队等待时更方便。",
      "essential",
      false,
    ),
    packingItem(
      "health-medicine",
      "常用药",
      "health",
      "感冒、肠胃和过敏药按个人情况带。",
      "essential",
    ),
    packingItem(
      "health-bandage",
      "创可贴 / 酒精棉片",
      "health",
      "长时间步行、磨脚或小擦伤时用得上。",
      "essential",
      false,
    ),
  ];

  if (season === "夏季") {
    items.push(
      packingItem(
        "cloth-summer-quick-dry",
        "轻薄透气衣物",
        "clothing",
        "夏季出行更适合速干、透气材质。",
        "season",
      ),
      packingItem(
        "cloth-sun-shirt",
        "防晒衣 / 遮阳帽",
        "clothing",
        "户外暴晒时间长时更舒服。",
        "season",
      ),
    );
  } else if (season === "冬季") {
    items.push(
      packingItem(
        "cloth-winter-coat",
        "厚外套 / 羽绒服",
        "clothing",
        "冬季早晚和户外等候时保暖优先。",
        "season",
      ),
      packingItem(
        "cloth-winter-warmers",
        "围巾 / 手套 / 暖宝宝",
        "clothing",
        "低温或风大时用于补充保暖。",
        "season",
        false,
      ),
    );
  } else if (season === "春季" || season === "秋季") {
    items.push(
      packingItem(
        "cloth-light-jacket",
        "薄外套或防风外套",
        "clothing",
        `${season}温差较大，早晚和海边风大时需要。`,
        "season",
      ),
      packingItem(
        "cloth-long-sleeve",
        "长袖和轻便长裤",
        "clothing",
        "兼顾白天活动和夜间降温。",
        "season",
      ),
    );
  } else {
    items.push(
      packingItem(
        "cloth-layering",
        "可叠穿衣物",
        "clothing",
        "日期未完全确定时，用叠穿适配温差。",
        "season",
      ),
      packingItem(
        "cloth-comfy-shoes",
        "舒适步行鞋",
        "clothing",
        "旅行中步行时间通常比日常更长。",
        "essential",
      ),
    );
  }

  if (isCoastal) {
    items.push(
      packingItem(
        "dest-sunscreen",
        "防晒霜",
        "destination",
        `${destinationText}有海边或户外路线，防晒很重要。`,
        "destination",
      ),
      packingItem(
        "dest-wind-jacket",
        "防风外套",
        "destination",
        "海边昼夜温差和风感会放大体感温度。",
        "destination",
      ),
      packingItem(
        "dest-waterproof-bag",
        "防水袋 / 密封袋",
        "destination",
        "海边、沙滩和雨天都能保护证件与电子设备。",
        "destination",
        false,
      ),
    );
  }
  if (isMountain) {
    items.push(
      packingItem(
        "dest-nonslip-shoes",
        "防滑舒适鞋",
        "destination",
        `${destinationText}可能有山路、石板路或长坡。`,
        "destination",
      ),
      packingItem(
        "dest-small-backpack",
        "轻便双肩包",
        "destination",
        "装水、外套和药品，走远路更省力。",
        "destination",
      ),
    );
  }
  if (isCityWalk || (!isCoastal && !isMountain)) {
    items.push(
      packingItem(
        "dest-walking-shoes",
        "舒适步行鞋",
        "destination",
        "城市步行、古城街区和换乘都更依赖脚感。",
        "destination",
      ),
      packingItem(
        "dest-tissues",
        "纸巾 / 湿巾",
        "destination",
        "餐饮、市集和公共交通中都很常用。",
        "destination",
      ),
    );
  }

  return items.filter(
    (item, index, list) => list.findIndex((entry) => entry.name === item.name) === index,
  );
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
    packingChecklist: [],
    orders: [],
    members: [],
    expenses: [],
    settlements: [],
    collaboration: null,
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
    settlements?: SettlementItem[];
    collaboration?: CollaborationMeta | null;
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
    packingChecklist: legacy.packingChecklist ?? [],
    itinerary: (travel.itinerary ?? []).map((item, index) => ({
      ...item,
      day: item.day ?? index + 1,
      detail: item.detail ?? null,
      duration: item.duration ?? null,
      transportToNext: item.transportToNext ?? null,
      reason: item.reason ?? null,
      evidence:
        item.evidence ?? (item.source === "user" || item.confirmed ? "confirmed" : "suggested"),
      checks: item.checks ?? [],
      alternatives: item.alternatives ?? [],
      companionAccent: item.companionAccent ?? null,
      source: item.source ?? "user",
    })),
    expenses: (travel.expenses ?? []).map((expense) => ({
      ...expense,
      category: expense.category ?? "other",
      paidBy: expense.paidBy ?? "我",
      splitMode: expense.splitMode ?? "equal",
      shares: expense.shares ?? [
        { name: expense.paidBy ?? "我", amount: Number(expense.amount ?? 0) },
      ],
      note: expense.note ?? null,
      spentAt: expense.spentAt ?? expense.createdAt ?? travel.updatedAt,
      createdBy: expense.createdBy ?? expense.paidBy ?? "我",
      createdAt: expense.createdAt ?? travel.updatedAt,
    })),
    settlements: legacy.settlements ?? [],
    collaboration: legacy.collaboration ?? null,
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
