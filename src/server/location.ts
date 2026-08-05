import { aiResolveProvince } from "./ai";

const PROVINCES_34 = [
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

const PROVINCE_ALIAS: Record<string, string> = {
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

type AmapGeocodeResponse = {
  status: string;
  info?: string;
  geocodes?: Array<{
    formatted_address?: string;
    addressComponent?: {
      province?: string;
    };
  }>;
};

function simplifyProvinceName(name: string): string {
  return name
    .replace("特别行政区", "")
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("自治区", "")
    .replace("省", "")
    .replace("市", "")
    .trim();
}

function normalizeProvinceName(name: string | null | undefined): string | null {
  const text = (name ?? "").trim();
  if (!text) return null;
  if ((PROVINCES_34 as readonly string[]).includes(text)) return text;
  if (PROVINCE_ALIAS[text]) return PROVINCE_ALIAS[text];

  for (const province of PROVINCES_34) {
    if (text.includes(province)) return province;
    const shortName = simplifyProvinceName(province);
    if (shortName && text.includes(shortName)) return province;
  }

  for (const [alias, province] of Object.entries(PROVINCE_ALIAS)) {
    if (text.includes(alias)) return province;
  }

  return null;
}

async function resolveProvinceByAmap(placeText: string): Promise<string | null> {
  const key = process.env.AMAP_WEB_SERVICE_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", key);
  url.searchParams.set("address", placeText);
  url.searchParams.set("output", "json");

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;

  const payload = (await response.json()) as AmapGeocodeResponse;
  if (payload.status !== "1") return null;

  const geocode = payload.geocodes?.[0];
  const province = normalizeProvinceName(geocode?.addressComponent?.province);
  if (province) return province;

  return normalizeProvinceName(geocode?.formatted_address);
}

export async function resolveProvinceByStrategy(input: {
  placeText: string;
  enableSemanticFallback?: boolean;
}): Promise<{ province: string | null; stage: "l2_amap" | "l3_ai" | "not_found" }> {
  const placeText = input.placeText.trim();
  if (!placeText) return { province: null, stage: "not_found" };

  const byAmap = await resolveProvinceByAmap(placeText);
  if (byAmap) return { province: byAmap, stage: "l2_amap" };

  if (!input.enableSemanticFallback) return { province: null, stage: "not_found" };

  try {
    const byAi = await aiResolveProvince(placeText);
    if (byAi) return { province: byAi, stage: "l3_ai" };
  } catch {
    // AI fallback is optional; ignore errors and return not_found.
  }

  return { province: null, stage: "not_found" };
}
