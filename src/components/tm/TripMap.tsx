import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { isAmapConfigured, loadAmap, type AMapMapInstance } from "@/lib/amap-loader";
import { cleanPoiKeyword } from "@/lib/poi-photos";

export type TripMapDay = { day: number; stops: string[] };

/** 每天的路线使用不同颜色,循环取用。 */
const DAY_COLORS = ["#ff6a3d", "#3d8bff", "#22a06b", "#8d6ec8", "#d5a925", "#49a9c7", "#d2904d"];

type LocatedStop = { title: string; day: number; seq: number; lng: number; lat: number };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerContent(stop: LocatedStop, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)">
      <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${color};color:#fff;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">
        D${stop.day}-${stop.seq}
      </div>
      <div style="max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(255,255,255,.92);border-radius:999px;padding:1px 8px;margin-top:2px;font-size:10px;font-weight:500;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.15)">
        ${escapeHtml(stop.title)}
      </div>
    </div>`;
}

function MapPlaceholder({
  reason,
  className,
}: {
  reason: "unconfigured" | "error";
  className: string;
}) {
  return (
    <div
      className={`flex h-[350px] flex-col items-center justify-center gap-2 rounded-[18px] bg-accent-soft px-6 md:h-[440px] ${className}`}
    >
      <MapPin className="size-6 text-accent" />
      <p className="text-[12px] font-semibold text-foreground">
        {reason === "unconfigured" ? "地图服务未配置" : "地图加载失败"}
      </p>
      <p className="max-w-[260px] text-center text-[10px] leading-relaxed text-muted-foreground">
        {reason === "unconfigured"
          ? "在 .env 中配置 VITE_AMAP_JS_KEY 与 VITE_AMAP_JS_SECURITY_CODE 后,这里会显示真实路线地图。"
          : "请检查高德 Key、安全密钥与网络后重试。"}
      </p>
    </div>
  );
}

/**
 * 真实高德地图:按天检索行程地点(AMap.PlaceSearch),绘制编号标记与每日彩色路线。
 * 未配置 Key 或加载失败时渲染占位卡片,不会抛错。
 */
export function TripMap({
  destination,
  days,
  className = "",
}: {
  destination: string;
  days: TripMapDay[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [locatedCount, setLocatedCount] = useState<number | null>(null);
  const configured = isAmapConfigured();
  const trimmedDestination = destination.trim();
  const daysKey = JSON.stringify(days);

  useEffect(() => {
    if (!configured || !trimmedDestination) return;
    let cancelled = false;
    let map: AMapMapInstance | null = null;
    setFailed(false);
    setLocatedCount(null);

    const parsedDays = JSON.parse(daysKey) as TripMapDay[];
    const stops = parsedDays.flatMap((dayPlan) =>
      dayPlan.stops
        .map((title) => ({ keyword: cleanPoiKeyword(title), title, day: dayPlan.day }))
        .filter((stop) => stop.keyword)
        .map((stop, index) => ({ ...stop, seq: index + 1 })),
    );
    if (!stops.length) {
      setLocatedCount(0);
      return;
    }

    (async () => {
      try {
        const AMap = await loadAmap();
        if (cancelled || !containerRef.current) return;
        map = new AMap.Map(containerRef.current, {
          zoom: 11,
          viewMode: "2D",
          mapStyle: "amap://styles/whitesmoke",
        });
        const placeSearch = new AMap.PlaceSearch({ city: trimmedDestination, citylimit: true });

        const geocode = (stop: (typeof stops)[number]) =>
          new Promise<LocatedStop | null>((resolve) => {
            try {
              placeSearch.search(stop.keyword, (status, result) => {
                const location =
                  status === "complete" ? result?.poiList?.pois?.[0]?.location : null;
                resolve(location ? { ...stop, lng: location.lng, lat: location.lat } : null);
              });
            } catch {
              resolve(null);
            }
          });

        // 检索不到坐标的地点直接跳过,不使用编造坐标。
        const located = (await Promise.all(stops.map(geocode))).filter(
          (stop): stop is LocatedStop => Boolean(stop),
        );
        if (cancelled) return;
        setLocatedCount(located.length);

        const overlays: unknown[] = [];
        for (const stop of located) {
          const color = DAY_COLORS[(stop.day - 1) % DAY_COLORS.length];
          const marker = new AMap.Marker({
            position: [stop.lng, stop.lat],
            content: markerContent(stop, color),
            offset: new AMap.Pixel(-13, 0),
            title: stop.title,
          });
          map.add(marker);
          overlays.push(marker);
        }
        for (const dayPlan of parsedDays) {
          const dayStops = located.filter((stop) => stop.day === dayPlan.day);
          if (dayStops.length < 2) continue;
          const polyline = new AMap.Polyline({
            path: dayStops.map((stop) => [stop.lng, stop.lat]),
            strokeColor: DAY_COLORS[(dayPlan.day - 1) % DAY_COLORS.length],
            strokeWeight: 4,
            strokeOpacity: 0.85,
            lineJoin: "round",
          });
          map.add(polyline);
          overlays.push(polyline);
        }
        if (overlays.length) map.setFitView(overlays);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    // React StrictMode 会双挂载:卸载时必须销毁地图实例。
    return () => {
      cancelled = true;
      map?.destroy();
      map = null;
    };
  }, [configured, trimmedDestination, daysKey]);

  if (!configured) return <MapPlaceholder reason="unconfigured" className={className} />;
  if (failed) return <MapPlaceholder reason="error" className={className} />;
  if (!trimmedDestination) {
    return (
      <div
        className={`flex h-[350px] items-center justify-center rounded-[18px] bg-accent-soft text-[11px] text-muted-foreground md:h-[440px] ${className}`}
      >
        设置目的地后显示路线地图
      </div>
    );
  }

  return (
    <div className={`relative h-[350px] overflow-hidden rounded-[18px] md:h-[440px] ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {locatedCount === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent-soft text-[11px] text-muted-foreground">
          地图加载中…
        </div>
      )}
      {locatedCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent-soft px-6 text-center text-[11px] text-muted-foreground">
          暂未在地图上定位到行程地点
        </div>
      )}
    </div>
  );
}
