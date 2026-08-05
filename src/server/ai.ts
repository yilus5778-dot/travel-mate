/**
 * AI 能力层:统一封装 OpenAI 兼容协议的模型调用。
 *
 * - 文本任务(意图提取、攻略整理、行程规划)→ DeepSeek
 * - 图片识别(攻略截图 → 文字)→ 智谱 GLM-4V
 * API Key 只存在于服务器环境变量,绝不下发到前端。
 */

import { z } from "zod";

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

type ProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

function textProvider(): ProviderConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("AI 服务未配置(DEEPSEEK_API_KEY 缺失)");
  return {
    name: "DeepSeek",
    baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
    apiKey,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

function visionProvider(): ProviderConfig {
  const apiKey = process.env.ZHIPU_API_KEY?.trim();
  if (!apiKey) throw new Error("图片识别服务未配置(ZHIPU_API_KEY 缺失)");
  return {
    name: "Zhipu",
    baseUrl: (process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(
      /\/$/,
      "",
    ),
    apiKey,
    model: process.env.ZHIPU_VL_MODEL || "glm-4v-flash",
  };
}

async function chatCompletion(
  provider: ProviderConfig,
  messages: ChatMessage[],
  { timeoutMs = 45_000, maxTokens = 4096 }: { timeoutMs?: number; maxTokens?: number } = {},
): Promise<string> {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`${provider.name} 接口返回 ${response.status}:${detail}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${provider.name} 没有返回内容`);
  return content;
}

/** 从模型输出里提取 JSON 对象(容忍 ```json 围栏和前后杂文本) */
function parseJsonOutput<T>(raw: string, schema: { parse: (value: unknown) => T }): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.search(/[{[]/);
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  if (start < 0 || end <= start) throw new Error("AI 返回内容不是有效的 JSON");
  return schema.parse(JSON.parse(candidate.slice(start, end + 1)));
}

const intentSchema = z.object({
  destination: z.string().trim().min(1).nullable().catch(null),
  destinationPreference: z.string().trim().min(1).nullable().catch(null),
  departureCity: z.string().trim().min(1).nullable().catch(null),
  peopleCount: z.number().int().min(1).max(30).nullable().catch(null),
  durationDays: z.number().int().min(1).max(30).nullable().catch(null),
  dateText: z.string().trim().min(1).nullable().catch(null),
  dateStatus: z.enum(["undecided", "approximate", "confirmed"]).catch("undecided"),
  looksLikeItinerary: z.boolean().catch(false),
});

export type AiIntent = z.infer<typeof intentSchema>;

const provinceResolveSchema = z.object({
  province: z.string().trim().min(1).nullable().catch(null),
});

const PROVINCE_CANONICAL_NAMES = [
  "北京市",
  "天津市",
  "河北省",
  "山西省",
  "内蒙古自治区",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "上海市",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "广西壮族自治区",
  "海南省",
  "重庆市",
  "四川省",
  "贵州省",
  "云南省",
  "西藏自治区",
  "陕西省",
  "甘肃省",
  "青海省",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "台湾省",
  "香港特别行政区",
  "澳门特别行政区",
] as const;

const PROVINCE_AI_ALIAS: Record<string, string> = {
  北京: "北京市",
  天津: "天津市",
  上海: "上海市",
  重庆: "重庆市",
  内蒙古: "内蒙古自治区",
  广西: "广西壮族自治区",
  西藏: "西藏自治区",
  宁夏: "宁夏回族自治区",
  新疆: "新疆维吾尔自治区",
  香港: "香港特别行政区",
  澳门: "澳门特别行政区",
};

function normalizeProvinceByAi(value: string | null): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  if ((PROVINCE_CANONICAL_NAMES as readonly string[]).includes(text)) return text;
  if (PROVINCE_AI_ALIAS[text]) return PROVINCE_AI_ALIAS[text];
  for (const province of PROVINCE_CANONICAL_NAMES) {
    if (text.includes(province)) return province;
    const short = province
      .replace("特别行政区", "")
      .replace("维吾尔自治区", "")
      .replace("壮族自治区", "")
      .replace("回族自治区", "")
      .replace("自治区", "")
      .replace("省", "")
      .replace("市", "");
    if (short && text.includes(short)) return province;
  }
  return null;
}

export async function aiResolveProvince(placeText: string): Promise<string | null> {
  const query = placeText.trim();
  if (!query) return null;

  const raw = await chatCompletion(textProvider(), [
    {
      role: "system",
      content: `你是中国地名归属判定器。任务:根据输入地名(城市/县区/景区/模糊描述)判断其所属省级行政区。
只输出 JSON: {"province":"..."}。
要求:
- province 必须是标准省级名称(如"浙江省""北京市""广西壮族自治区")
- 如果无法可靠判断,返回 {"province": null}
- 不要输出解释文字`,
    },
    { role: "user", content: query.slice(0, 200) },
  ]);

  const parsed = parseJsonOutput(raw, provinceResolveSchema);
  return normalizeProvinceByAi(parsed.province);
}

export async function aiExtractIntent(text: string): Promise<AiIntent> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = await chatCompletion(textProvider(), [
    {
      role: "system",
      content: `你是旅行需求分析器。从用户输入中提取旅行意图,只输出 JSON,不要输出任何解释。今天是 ${today}。
字段说明:
- destination: 明确的目的地城市/地区(如"厦门""呼伦贝尔"),没有则为 null
- destinationPreference: 模糊的偏好(如"海边""草原""古镇"),没有则为 null
- departureCity: 出发城市,没有则为 null
- peopleCount: 出行人数(数字),"和朋友"按 2 人计,没有则为 null
- durationDays: 行程天数(数字),没有则为 null
- dateText: 出行日期的原文表述(如"国庆假期""10月1日"),没有则为 null
- dateStatus: confirmed(有明确日期)/ approximate(只有大概时间)/ undecided(没提)
- looksLikeItinerary: 输入是否已是一份按天/按时间排列的现成行程单`,
    },
    { role: "user", content: text.slice(0, 4000) },
  ]);
  return parseJsonOutput(raw, intentSchema);
}

const itineraryItemSchema = z.object({
  day: z.number().int().min(1).max(30).nullable().catch(null),
  time: z.string().trim().nullable().catch(null),
  title: z.string().trim().min(1),
  detail: z.string().trim().nullable().catch(null),
  duration: z.string().trim().nullable().catch(null),
  transportToNext: z.string().trim().nullable().catch(null),
  reason: z.string().trim().nullable().catch(null),
});

const organizeSchema = z.object({
  destination: z.string().trim().min(1).nullable().catch(null),
  items: z.array(itineraryItemSchema).max(80),
});

export type AiItineraryItem = z.infer<typeof itineraryItemSchema>;

export async function aiOrganizeItinerary(text: string) {
  const raw = await chatCompletion(textProvider(), [
    {
      role: "system",
      content: `你是旅行攻略整理器。把用户粘贴的攻略/行程文字整理成结构化的行程项,只输出 JSON。
规则:
- 严格忠于原文,原文没有的信息不要编造
- 保留原文的日期/天数结构(day 从 1 开始;无法判断则为 null)
- time 用"09:00"这种 24 小时制;原文是"上午/下午"等模糊表述则保留原文
- title 是地点或活动名称,detail 是原文中的补充说明
- destination: 攻略的目的地,看不出则为 null
输出格式: {"destination": "...", "items": [{"day": 1, "time": "09:00", "title": "...", "detail": "...", "duration": null, "transportToNext": null, "reason": null}]}`,
    },
    { role: "user", content: text.slice(0, 8000) },
  ]);
  return parseJsonOutput(raw, organizeSchema);
}

export async function aiPlanItinerary(input: {
  destination: string;
  durationDays: number;
  peopleCount?: number | null;
  budget?: number | null;
  departureCity?: string | null;
  dateText?: string | null;
  destinationPreference?: string | null;
}) {
  const raw = await chatCompletion(
    textProvider(),
    [
      {
        role: "system",
        content: `你是旅行规划师。为用户生成 ${input.durationDays} 天「${input.destination}」的每日行程,只输出 JSON。
要求:
- 每天 3-5 个行程项,节奏合理、顺路不折返
- 覆盖当地真正有代表性的景点和美食,不确定的不要编造
- title 是地点或活动;reason 用一句话说明为什么推荐;detail 给出实用提示(门票/预约/交通等,知道才写)
- time 用"09:00"格式;duration 如"2小时";transportToNext 如"打车约20分钟"
输出格式: {"destination": "${input.destination}", "items": [{"day": 1, "time": "09:00", "title": "...", "detail": "...", "duration": "...", "transportToNext": null, "reason": "..."}]}`,
      },
      {
        role: "user",
        content: [
          input.departureCity ? `出发城市:${input.departureCity}` : null,
          input.dateText ? `出行时间:${input.dateText}` : null,
          input.peopleCount ? `人数:${input.peopleCount} 人` : null,
          input.budget ? `预算:约 ${input.budget} 元` : null,
          input.destinationPreference ? `偏好:${input.destinationPreference}` : null,
        ]
          .filter(Boolean)
          .join("\n") || "无补充信息",
      },
    ],
    { maxTokens: 6000 },
  );
  return parseJsonOutput(raw, organizeSchema);
}

const recognitionSchema = z.object({
  // 模型偶尔把提取结果包成对象而不是字符串,统一转成文本
  text: z
    .any()
    .transform((value) =>
      typeof value === "string" ? value.trim() : JSON.stringify(value, null, 2),
    ),
});

export async function aiRecognizeImages(imageDataUrls: string[]): Promise<string[]> {
  const provider = visionProvider();
  const results: string[] = [];
  for (const dataUrl of imageDataUrls.slice(0, 4)) {
    const raw = await chatCompletion(provider, [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "这是一张旅行攻略/行程相关的图片。请完整提取图片中的所有文字内容(保留按天/按时间的结构),只输出 JSON:{\"text\": \"提取的文字\"}。如果图片与旅行无关或没有文字,text 输出空字符串。",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    // GLM-4V-Flash 的 max_tokens 上限为 1024
    { maxTokens: 1024 },
    );
    // 模型可能直接输出纯文本(没有 JSON 包装),此时原文就是提取结果
    try {
      const parsed = parseJsonOutput(raw, recognitionSchema);
      results.push(parsed.text);
    } catch {
      results.push(raw.replace(/```(?:json)?|```/g, "").trim());
    }
  }
  return results;
}

/** 抓取网页链接的正文文本(去标签,截断),供攻略整理使用 */
export async function fetchLinkText(url: string): Promise<string> {
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("只支持 http/https 链接");
  }
  const response = await fetch(target, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; travelmate-bot/1.0)" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`链接访问失败(${response.status})`);
  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&quot;/g, "'")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .join("\n");
  if (text.length < 50) throw new Error("网页里没有读取到足够的文字内容");
  return text.slice(0, 8000);
}
