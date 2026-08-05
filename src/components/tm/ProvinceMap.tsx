import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { TravelItem } from "@/lib/app-model";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ProvinceState = "visited" | "planned";

type ProvinceStat = {
  province: string;
  state: ProvinceState;
  cities: string[];
  dayCount: number;
  spotCount: number;
  travels: TravelItem[];
};

type ProvincePopup = {
  stat: ProvinceStat;
  x: number;
  y: number;
};

type LocationResolveResult = {
  province: string | null;
  stage: "l2_amap" | "l3_ai" | "not_found";
};

const remoteProvinceCache = new Map<string, string | null>();

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

const CITY_TO_PROVINCE: Record<string, string> = {
  北京: "北京市",
  上海: "上海市",
  天津: "天津市",
  重庆: "重庆市",
  杭州: "浙江省",
  宁波: "浙江省",
  苏州: "江苏省",
  南京: "江苏省",
  无锡: "江苏省",
  青岛: "山东省",
  济南: "山东省",
  西安: "陕西省",
  成都: "四川省",
  大理: "云南省",
  昆明: "云南省",
  丽江: "云南省",
  厦门: "福建省",
  福州: "福建省",
  泉州: "福建省",
  广州: "广东省",
  深圳: "广东省",
  珠海: "广东省",
  长沙: "湖南省",
  武汉: "湖北省",
  郑州: "河南省",
  合肥: "安徽省",
  南昌: "江西省",
  贵阳: "贵州省",
  海口: "海南省",
  三亚: "海南省",
  兰州: "甘肃省",
  西宁: "青海省",
  银川: "宁夏回族自治区",
  乌鲁木齐: "新疆维吾尔自治区",
  拉萨: "西藏自治区",
  呼和浩特: "内蒙古自治区",
  呼伦贝尔: "内蒙古自治区",
  海拉尔: "内蒙古自治区",
  满洲里: "内蒙古自治区",
  锡林郭勒: "内蒙古自治区",
  乌兰察布: "内蒙古自治区",
  大同: "山西省",
  太原: "山西省",
  北海: "广西壮族自治区",
  桂林: "广西壮族自治区",
  南宁: "广西壮族自治区",
  哈尔滨: "黑龙江省",
  长春: "吉林省",
  沈阳: "辽宁省",
  大连: "辽宁省",
  香港: "香港特别行政区",
  澳门: "澳门特别行政区",
  台北: "台湾省",
};

// 常见县区/景区/目的地别名，补足草稿里非地级市写法。
const PLACE_TO_PROVINCE: Record<string, string> = {
  ...CITY_TO_PROVINCE,
  乌镇: "浙江省",
  西塘: "浙江省",
  千岛湖: "浙江省",
  普陀山: "浙江省",
  安吉: "浙江省",
  婺源: "江西省",
  宏村: "安徽省",
  黄山风景区: "安徽省",
  九华山: "安徽省",
  阳朔: "广西壮族自治区",
  涠洲岛: "广西壮族自治区",
  西双版纳: "云南省",
  香格里拉: "云南省",
  泸沽湖: "云南省",
  稻城亚丁: "四川省",
  九寨沟: "四川省",
  峨眉山: "四川省",
  都江堰: "四川省",
  张家界: "湖南省",
  凤凰古城: "湖南省",
  鼓浪屿: "福建省",
  武夷山: "福建省",
  长白山: "吉林省",
  漠河: "黑龙江省",
  喀什: "新疆维吾尔自治区",
  伊犁: "新疆维吾尔自治区",
  阿勒泰: "新疆维吾尔自治区",
  喀纳斯: "新疆维吾尔自治区",
  敦煌: "甘肃省",
  茶卡盐湖: "青海省",
  三清山: "江西省",
  阿坝: "四川省",
  林芝: "西藏自治区",
  日喀则: "西藏自治区",
};

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

function isVisited(travel: TravelItem) {
  return ["completed", "archived"].includes(travel.status);
}

function normalizeProvinceName(name: string): string {
  const text = name.trim();
  if (!text) return "";
  if (PROVINCES_34.includes(text as (typeof PROVINCES_34)[number])) return text;
  if (PROVINCE_ALIAS[text]) return PROVINCE_ALIAS[text];
  if (text.endsWith("省") || text.endsWith("市") || text.endsWith("自治区") || text.endsWith("特别行政区")) {
    return text;
  }
  if (text.length <= 3 && PROVINCE_ALIAS[text]) return PROVINCE_ALIAS[text];
  return `${text}省`;
}

function simplifyProvinceName(name: string): string {
  return name
    .replace("特别行政区", "")
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("自治区", "")
    .replace("省", "")
    .replace("市", "");
}

function simplifyPlaceName(name: string): string {
  return name
    .replace("特别行政区", "")
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("自治区", "")
    .replace("自治州", "")
    .replace("自治县", "")
    .replace("地区", "")
    .replace("盟", "")
    .replace("风景区", "")
    .replace("景区", "")
    .replace("省", "")
    .replace("市", "")
    .replace("县", "")
    .replace("区", "")
    .replace("旗", "")
    .trim();
}

function resolveProvinceFromDestination(destination: string | null): string | null {
  if (!destination) return null;
  const name = destination.trim();
  if (!name) return null;

  if (CITY_TO_PROVINCE[name]) return CITY_TO_PROVINCE[name];
  if (PLACE_TO_PROVINCE[name]) return PLACE_TO_PROVINCE[name];

  const normalized = normalizeProvinceName(name);
  if (PROVINCES_34.includes(normalized as (typeof PROVINCES_34)[number])) return normalized;

  const simpleName = simplifyPlaceName(name);
  if (simpleName && PLACE_TO_PROVINCE[simpleName]) return PLACE_TO_PROVINCE[simpleName];

  for (const [place, province] of Object.entries(PLACE_TO_PROVINCE)) {
    const simplePlace = simplifyPlaceName(place);
    if (place.length >= 2 && name.includes(place)) return province;
    if (simplePlace.length >= 2 && simpleName.includes(simplePlace)) return province;
    if (simpleName.length >= 2 && simplePlace.includes(simpleName)) return province;
  }

  for (const province of PROVINCES_34) {
    const shortName = simplifyProvinceName(province);
    if (name.includes(province) || name.includes(shortName)) return province;
  }

  for (const [alias, province] of Object.entries(PROVINCE_ALIAS)) {
    if (name.includes(alias)) return province;
  }

  return null;
}

function splitDestinationText(text: string): string[] {
  return text
    .split(/[、,，\s/|→—-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function collectTravelLocationSources(travel: TravelItem): string[] {
  const titleHints = splitDestinationText(
    travel.title
      .replace(/旅行草稿|旅行账本|旅行|行程|草稿/g, " ")
      .trim(),
  );

  const raw = [
    travel.destination,
    travel.destinationPreference,
    ...(travel.destinationCandidates ?? []),
    ...titleHints,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const expanded = raw.flatMap((item) => [item, ...splitDestinationText(item)]);
  return [
    ...new Set(
      expanded
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
        .filter((item) => !["旅行", "行程", "草稿", "目的地", "待定", "未命名"].includes(item)),
    ),
  ];
}

function resolveProvinceFromTravel(travel: TravelItem): string | null {
  const sources = collectTravelLocationSources(travel);

  for (const source of sources) {
    const direct = resolveProvinceFromDestination(source);
    if (direct) return direct;

    const parts = splitDestinationText(source);
    for (const part of parts) {
      const resolved = resolveProvinceFromDestination(part);
      if (resolved) return resolved;
    }
  }

  return null;
}

async function resolveProvinceByApi(
  text: string,
  enableSemanticFallback: boolean,
): Promise<LocationResolveResult> {
  const response = await fetch("/api/location/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, enableSemanticFallback }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `地名解析失败(${response.status})`);
  }
  return (await response.json()) as LocationResolveResult;
}

function countSpots(travel: TravelItem): number {
  return travel.itinerary.filter((item) => item.title.trim() && item.duration !== "待生成").length;
}

function countDays(travel: TravelItem): number {
  if (travel.durationDays && travel.durationDays > 0) return travel.durationDays;
  const days = new Set<number>();
  for (const item of travel.itinerary) {
    if (typeof item.day === "number" && item.day > 0) days.add(item.day);
  }
  return Math.max(1, days.size);
}

export const PROVINCE_COLORS = {
  visited: "#0ea5e9",
  planned: "#f59e0b",
  unvisited: "#f1f5f9",
} as const;

/**
 * 中国省份足迹图:34省地图着色、点击弹卡、移动端抽屉。
 */
export function ProvinceMap({
  travels,
  className = "",
}: {
  travels: TravelItem[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ dispose: () => void; resize: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState<ProvincePopup | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolvedProvinceByTravelId, setResolvedProvinceByTravelId] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const unresolvedTexts = new Set<string>();
      for (const travel of travels) {
        if (resolveProvinceFromTravel(travel)) continue;
        for (const source of collectTravelLocationSources(travel)) {
          if (!remoteProvinceCache.has(source)) unresolvedTexts.add(source);
        }
      }

      if (unresolvedTexts.size) {
        const tasks = [...unresolvedTexts].map(async (text) => {
          try {
            const result = await resolveProvinceByApi(text, true);
            remoteProvinceCache.set(text, result.province);
          } catch {
            remoteProvinceCache.set(text, null);
          }
        });
        await Promise.all(tasks);
      }

      if (cancelled) return;

      const next: Record<string, string> = {};
      for (const travel of travels) {
        for (const source of collectTravelLocationSources(travel)) {
          const province = remoteProvinceCache.get(source);
          if (province) {
            next[travel.id] = province;
            break;
          }
        }
      }

      setResolvedProvinceByTravelId((current) => {
        const currentKeys = Object.keys(current);
        const nextKeys = Object.keys(next);
        if (currentKeys.length === nextKeys.length) {
          let unchanged = true;
          for (const key of nextKeys) {
            if (current[key] !== next[key]) {
              unchanged = false;
              break;
            }
          }
          if (unchanged) return current;
        }
        return next;
      });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [travels]);

  const provinceStats = useMemo(() => {
    const map = new Map<string, ProvinceStat>();
    for (const travel of travels) {
      const province = resolveProvinceFromTravel(travel) ?? resolvedProvinceByTravelId[travel.id] ?? null;
      if (!province) continue;

      const cityLabel = travel.destination ?? travel.destinationPreference ?? province;

      const current = map.get(province);
      if (!current) {
        map.set(province, {
          province,
          state: isVisited(travel) ? "visited" : "planned",
          cities: [cityLabel],
          dayCount: countDays(travel),
          spotCount: countSpots(travel),
          travels: [travel],
        });
      } else {
        current.state = current.state === "visited" || isVisited(travel) ? "visited" : "planned";
        current.cities.push(cityLabel);
        current.dayCount += countDays(travel);
        current.spotCount += countSpots(travel);
        current.travels.push(travel);
      }
    }

    for (const stat of map.values()) {
      stat.cities = [...new Set(stat.cities)];
    }
    return map;
  }, [resolvedProvinceByTravelId, travels]);

  const simpleNameToStat = useMemo(() => {
    const map = new Map<string, ProvinceStat>();
    for (const stat of provinceStats.values()) {
      map.set(simplifyProvinceName(stat.province), stat);
    }
    return map;
  }, [provinceStats]);

  const mapData = useMemo(
    () =>
      PROVINCES_34.map((province) => {
        const stat = provinceStats.get(province);
        const value = stat ? (stat.state === "visited" ? 2 : 1) : 0;
        return {
          name: simplifyProvinceName(province),
          value,
          itemStyle: {
            areaColor:
              value === 2
                ? PROVINCE_COLORS.visited
                : value === 1
                  ? PROVINCE_COLORS.planned
                  : PROVINCE_COLORS.unvisited,
          },
        };
      }),
    [provinceStats],
  );

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setReady(false);
    setPopup(null);

    (async () => {
      try {
        const echarts = await import("echarts");
        const response = await fetch("/maps/china.json");
        if (!response.ok) throw new Error("Failed to load china map json");
        const rawChinaJson = (await response.json()) as {
          [key: string]: unknown;
          features?: Array<{
            [key: string]: unknown;
            properties?: {
              [key: string]: unknown;
              name?: string;
            };
          }>;
        };
        const chinaJson = {
          ...rawChinaJson,
          // Remove the detached South China Sea inset to free vertical space in compact cards.
          features: Array.isArray(rawChinaJson.features)
            ? rawChinaJson.features.filter(
                (feature) => !String(feature?.properties?.name ?? "").includes("南海诸岛"),
              )
            : rawChinaJson.features,
        };
        if (cancelled || !containerRef.current) return;

        const containerRatio =
          containerRef.current.clientWidth / Math.max(1, containerRef.current.clientHeight);
        const layoutSize = containerRatio >= 1.6 ? "110%" : containerRatio >= 1.25 ? "104%" : "96%";
        const layoutCenterY = containerRatio >= 1.6 ? "57%" : containerRatio >= 1.25 ? "56%" : "54%";

        (echarts as { registerMap: (name: string, map: unknown) => void }).registerMap(
          "china",
          chinaJson,
        );

        const chart = (echarts as { init: (el: HTMLElement) => any }).init(containerRef.current);
        chartRef.current = chart;

        chart.setOption({
          tooltip: { show: false },
          series: [
            {
              type: "map",
              map: "china",
              roam: false,
              layoutCenter: ["50%", layoutCenterY],
              layoutSize,
              zoom: 1,
              label: {
                show: false,
                color: "#64748b",
                fontSize: 9,
              },
              itemStyle: {
                borderColor: "#ffffff",
                borderWidth: 1,
                areaColor: PROVINCE_COLORS.unvisited,
              },
              emphasis: {
                itemStyle: {
                  areaColor: "#bae6fd",
                },
                label: {
                  show: false,
                },
              },
              data: mapData,
            },
          ],
        });

        chart.on("click", (params: any) => {
          const stat = simpleNameToStat.get(String(params.name ?? ""));
          if (!stat) return;

          if (isMobile) {
            setPopup({ stat, x: 0, y: 0 });
            setDrawerOpen(true);
            return;
          }

          const nativeEvent = params?.event?.event;
          const x = nativeEvent?.zrX ?? nativeEvent?.offsetX ?? 180;
          const y = nativeEvent?.zrY ?? nativeEvent?.offsetY ?? 160;
          setPopup({ stat, x, y });
        });

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        if (!cancelled) setReady(true);

        return () => {
          window.removeEventListener("resize", onResize);
        };
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [isMobile, mapData, simpleNameToStat]);

  const activeStat = popup?.stat ?? null;

  if (failed) {
    return (
      <div className={`flex h-[350px] items-center justify-center rounded-[24px] bg-accent-soft text-[11px] text-muted-foreground md:h-[440px] ${className}`}>
        <MapPin className="mr-1.5 size-4" /> 足迹地图加载失败，请稍后重试
      </div>
    );
  }

  return (
    <div className={`relative h-[350px] overflow-hidden rounded-[24px] md:h-[440px] ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent-soft text-[11px] text-muted-foreground">
          <MapPin className="mr-1.5 size-4" /> 地图加载中…
        </div>
      )}

      {!isMobile && activeStat && (
        <div
          className="absolute z-20 w-[240px] rounded-[14px] border border-border bg-card p-3 shadow-[0_16px_36px_-20px_oklch(0.45_0.08_80/0.7)]"
          style={{
            left: `${Math.max(12, Math.min(activeStat ? popup!.x - 120 : 12, 520))}px`,
            top: `${Math.max(12, Math.min(activeStat ? popup!.y - 110 : 12, 300))}px`,
          }}
        >
          <p className="text-[13px] font-semibold text-foreground">{activeStat.province}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {activeStat.cities.length} 城市 · {activeStat.dayCount} 天 · {activeStat.spotCount} 景点
          </p>
          <div className="mt-2 space-y-1.5">
            {activeStat.travels.slice(0, 3).map((travel) => (
              <div key={travel.id} className="rounded-[10px] bg-surface-sunk px-2.5 py-1.5">
                <p className="truncate text-[10px] font-medium text-foreground">{travel.title}</p>
                <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                  {travel.destination ?? "目的地待定"} · {travel.dateText ?? "日期待定"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[70vh]">
          {activeStat && (
            <>
              <DrawerHeader>
                <DrawerTitle>{activeStat.province}</DrawerTitle>
                <DrawerDescription>
                  {activeStat.cities.length} 城市 · {activeStat.dayCount} 天 · {activeStat.spotCount} 景点
                </DrawerDescription>
              </DrawerHeader>
              <div className="space-y-2 overflow-y-auto px-4 pb-5">
                {activeStat.travels.map((travel) => (
                  <div key={travel.id} className="rounded-[12px] bg-surface-sunk p-3">
                    <p className="truncate text-[12px] font-semibold text-foreground">{travel.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {travel.destination ?? "目的地待定"} · {travel.dateText ?? "日期待定"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
