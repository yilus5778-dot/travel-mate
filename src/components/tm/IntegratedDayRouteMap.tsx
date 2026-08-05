import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPin } from "lucide-react";
import { isAmapConfigured, loadAmap, type AMapMapInstance } from "@/lib/amap-loader";
import { fetchPoiPhoto, cleanPoiKeyword } from "@/lib/poi-photos";
import type { ItineraryItem } from "@/lib/app-model";

export interface IntegratedDayRouteMapProps {
  day: number;
  destination: string;
  items: ItineraryItem[];
  className?: string;
}

interface ItemWithLocation extends ItineraryItem {
  photoUrl: string | null;
  lng: number | null;
  lat: number | null;
}

/**
 * 获取景点首字母（处理中英文）
 */
function getFirstCharacter(title: string): string {
  // 过滤掉括号内容和特殊字符
  const cleaned = title.replace(/[(（【\[].*?[)）】\]]/g, "").trim();
  if (!cleaned) return "？";

  // 中文优先，否则取英文首字
  const firstChar = cleaned[0];
  return /[\u4e00-\u9fa5]/.test(firstChar) ? firstChar : cleaned[0].toUpperCase();
}

/**
 * 生成景点类型颜色梯度
 */
function getGradientForPOI(
  title: string,
): { startColor: string; endColor: string; textColor: string } {
  if (/餐厅|饭店|酒店|咖啡|美食|小吃|面馆|烤肉|火锅/.test(title)) {
    return { startColor: "#fbbf24", endColor: "#f59e0b", textColor: "#92400e" };
  }
  if (/博物馆|美术馆|宫殿|城堡|寺庙|教堂|古迹|文化|历史/.test(title)) {
    return { startColor: "#c084fc", endColor: "#a855f7", textColor: "#581c87" };
  }
  if (/山|湖|海|瀑布|公园|森林|花园|植物园|溪/.test(title)) {
    return { startColor: "#4ade80", endColor: "#22c55e", textColor: "#15803d" };
  }
  if (/商场|商街|市场|购物|百货|夜市/.test(title)) {
    return { startColor: "#ec4899", endColor: "#db2777", textColor: "#831843" };
  }
  if (/游乐|主题|动物园|游戏|KTV|酒吧|剧院|影院/.test(title)) {
    return { startColor: "#06b6d4", endColor: "#0891b2", textColor: "#082f49" };
  }
  // 默认蓝色
  return { startColor: "#60a5fa", endColor: "#3b82f6", textColor: "#1e3a8a" };
}

/**
 * 提取用时（分钟）
 */
function extractMinutes(transport: string | null): number {
  if (!transport) return 0;
  const match = transport.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 集成高德地图和节点图的统一组件
 * - 高德地图作为底图
 * - SVG 节点直接叠加在地图上（使用高德坐标系统）
 * - 改进的占位符（首字母 + 渐变背景）
 * - 显示距离和用时标注
 */
export function IntegratedDayRouteMap({
  day,
  destination,
  items,
  className = "",
}: IntegratedDayRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const [itemsWithData, setItemsWithData] = useState<ItemWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<AMapMapInstance | null>(null);

  const configured = isAmapConfigured();
  const itemsOnDay = items.filter((item) => item.day === day && item.duration !== "待生成");
  const trimmedDestination = destination.trim();

  // 步骤 1：初始化高德地图
  useEffect(() => {
    if (!configured || !trimmedDestination || itemsOnDay.length === 0) {
      if (itemsOnDay.length === 0) setLoading(false);
      return;
    }

    let cancelled = false;
    let mapInstance: AMapMapInstance | null = null;

    (async () => {
      try {
        const AMap = await loadAmap();
        if (cancelled || !mapContainerRef.current) return;

        mapInstance = new AMap.Map(mapContainerRef.current, {
          zoom: 12,
          viewMode: "2D",
          mapStyle: "amap://styles/whitesmoke",
        });

        if (cancelled) return;
        setMap(mapInstance);
        // 某些布局场景下容器尺寸会延后稳定,主动触发一次 resize 防止白图。
        requestAnimationFrame(() => {
          (mapInstance as unknown as { resize?: () => void }).resize?.();
        });

        // 步骤 2：并行获取坐标和图片
        const placeSearch = new AMap.PlaceSearch({
          city: trimmedDestination,
          citylimit: true,
        });
        const placeSearchFallback = new AMap.PlaceSearch({
          city: trimmedDestination,
          citylimit: false,
        });

        const searchWithTimeout = (
          searcher: { search: (keyword: string, callback: (status: string, result: unknown) => void) => void },
          title: string,
          timeoutMs: number = 8000,
        ): Promise<{ lng: number; lat: number } | null> => {
          return Promise.race([
            new Promise<{ lng: number; lat: number } | null>((resolve) => {
              try {
                searcher.search(cleanPoiKeyword(title), (status, result) => {
                  const poiList = (result as { poiList?: { pois?: Array<{ location?: { lng?: number; lat?: number; getLng?: () => number; getLat?: () => number } }> } })?.poiList;
                  if (status === "complete" && poiList?.pois?.length) {
                    const poi = poiList.pois[0];
                    // 处理不同格式的坐标并统一转为 number。
                    const location = poi.location;
                    const rawLng = location?.lng ?? location?.getLng?.();
                    const rawLat = location?.lat ?? location?.getLat?.();
                    const lng = Number(rawLng);
                    const lat = Number(rawLat);

                    if (Number.isFinite(lng) && Number.isFinite(lat)) {
                      resolve({ lng, lat });
                    } else {
                      console.warn(`Invalid coordinates for "${title}":`, { lng, lat });
                      resolve(null);
                    }
                  } else {
                    console.debug(`No results for "${title}"`);
                    resolve(null);
                  }
                });
              } catch (err) {
                console.error(`PlaceSearch error for "${title}":`, err);
                resolve(null);
              }
            }),
            new Promise<null>((resolve) =>
              setTimeout(() => {
                console.warn(`PlaceSearch timeout for "${title}"`);
                resolve(null);
              }, timeoutMs),
            ),
          ]);
        };

        const withData = await Promise.all(
          itemsOnDay.map(async (item) => {
            const strictLocation = await searchWithTimeout(placeSearch, item.title);
            const resolvedLocation =
              strictLocation ?? (await searchWithTimeout(placeSearchFallback, item.title));
            const [photoUrl, location] = await Promise.all([
              fetchPoiPhoto(trimmedDestination, item.title),
              Promise.resolve(resolvedLocation),
            ]);

            return {
              ...item,
              photoUrl,
              lng: location?.lng ?? null,
              lat: location?.lat ?? null,
            };
          }),
        );

        if (cancelled) return;

        // 步骤 3：将地图视图适配到所有定位点
        const locatedItems = withData.filter(
          (item) =>
            item.lng !== null &&
            item.lat !== null &&
            Number.isFinite(item.lng) &&
            Number.isFinite(item.lat),
        );

        if (locatedItems.length === 0) {
          setItemsWithData(withData);
          setLoading(false);
          setError("地图服务暂不可用（定位超时或网络受限）");
          return;
        }

        if (locatedItems.length > 0) {
          try {
            if (locatedItems.length === 1) {
              const first = locatedItems[0];
              (mapInstance as unknown as { setCenter: (pos: [number, number]) => void }).setCenter([
                first.lng!,
                first.lat!,
              ]);
              (mapInstance as unknown as { setZoom: (zoom: number) => void }).setZoom(14);
            } else {
              const lngs = locatedItems.map((item) => item.lng!);
              const lats = locatedItems.map((item) => item.lat!);
              const minLng = Math.min(...lngs);
              const maxLng = Math.max(...lngs);
              const minLat = Math.min(...lats);
              const maxLat = Math.max(...lats);

              // AMap.Bounds 构造函数需要 southwest + northeast 两个点。
              const bounds = new (AMap as unknown as { Bounds: new (sw: [number, number], ne: [number, number]) => unknown }).Bounds(
                [minLng, minLat],
                [maxLng, maxLat],
              );

              const mapWithBounds = mapInstance as unknown as {
                setBounds?: (bounds: unknown, immediately?: boolean, padding?: [number, number, number, number]) => void;
                setFitView?: (overlays?: unknown[] | null) => void;
              };

              if (mapWithBounds.setBounds) {
                mapWithBounds.setBounds(bounds, false, [60, 60, 60, 60]);
              } else {
                mapWithBounds.setFitView?.();
              }
            }
          } catch (fitViewErr) {
            console.error("Error fitting map view:", fitViewErr);
            // 降级到中心点缩放
            const center = locatedItems[0];
            (mapInstance as unknown as { setCenter: (pos: [number, number]) => void }).setCenter([
              center.lng!,
              center.lat!,
            ]);
            (mapInstance as unknown as { setZoom: (zoom: number) => void }).setZoom(12);
          }
        }

        setItemsWithData(withData);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mapInstance?.destroy();
    };
  }, [configured, trimmedDestination, day, JSON.stringify(itemsOnDay)]);

  // 步骤 4：在地图上绘制 SVG 节点图
  useEffect(() => {
    if (!map || !svgOverlayRef.current || itemsWithData.length === 0) return;

    const nodeRadius = 32;
    const photoRadius = nodeRadius - 4;

    // 获取地图容器尺寸
    const container = map.getContainer() as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 更新 SVG 尺寸
    svgOverlayRef.current.setAttribute("width", String(width));
    svgOverlayRef.current.setAttribute("height", String(height));
    svgOverlayRef.current.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // 清除旧内容
    const svg = svgOverlayRef.current;
    while (svg.lastChild) {
      svg.removeChild(svg.lastChild);
    }

    // 创建 defs
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    // 圆形裁剪路径
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", "photoClip");
    const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    clipCircle.setAttribute("cx", "0");
    clipCircle.setAttribute("cy", "0");
    clipCircle.setAttribute("r", String(photoRadius));
    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);

    // 箭头标记
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "0 0, 10 3, 0 6");
    polygon.setAttribute("fill", "#cbd5e1");
    marker.appendChild(polygon);
    defs.appendChild(marker);

    svg.appendChild(defs);

    // 将地理坐标转换为像素坐标
    const lngLatToPixel = (lng: number, lat: number): { x: number; y: number } | null => {
      // 使用高德地图的坐标转换
      const point = map.lngLatToContainer([lng, lat]);
      if (!point) return null;
      return { x: point.getX(), y: point.getY() };
    };

    // 绘制连接线
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (let idx = 0; idx < itemsWithData.length - 1; idx++) {
      const item = itemsWithData[idx];
      const nextItem = itemsWithData[idx + 1];

      if (!item.lng || !item.lat || !nextItem.lng || !nextItem.lat) continue;

      const p1 = lngLatToPixel(item.lng, item.lat);
      const p2 = lngLatToPixel(nextItem.lng, nextItem.lat);
      if (!p1 || !p2) continue;

      const minutes = extractMinutes(nextItem.transportToNext);
      const lineWidth = Math.min(6, 2 + (minutes / 20) * 4);

      // 连接线
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(p1.x));
      line.setAttribute("y1", String(p1.y));
      line.setAttribute("x2", String(p2.x));
      line.setAttribute("y2", String(p2.y));
      line.setAttribute("stroke", "#3b82f6");
      line.setAttribute("stroke-width", String(lineWidth));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("marker-end", "url(#arrowhead)");
      line.setAttribute("opacity", "0.7");
      g.appendChild(line);

      // 用时标签
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      labelBg.setAttribute("x", String(midX - 45));
      labelBg.setAttribute("y", String(midY - 16));
      labelBg.setAttribute("width", "90");
      labelBg.setAttribute("height", "32");
      labelBg.setAttribute("rx", "16");
      labelBg.setAttribute("fill", "#fef3c7");
      labelBg.setAttribute("stroke", "#f59e0b");
      labelBg.setAttribute("stroke-width", "1");
      g.appendChild(labelBg);

      const timeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      timeText.setAttribute("x", String(midX - 12));
      timeText.setAttribute("y", String(midY + 5));
      timeText.setAttribute("text-anchor", "middle");
      timeText.setAttribute("font-size", "12");
      timeText.setAttribute("font-weight", "600");
      timeText.setAttribute("fill", "#d97706");
      timeText.textContent = minutes > 0 ? `${minutes}分` : "前往";
      g.appendChild(timeText);
    }

    svg.appendChild(g);

    // 绘制节点
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (let idx = 0; idx < itemsWithData.length; idx++) {
      const item = itemsWithData[idx];
      if (!item.lng || !item.lat) continue;

      const pos = lngLatToPixel(item.lng, item.lat);
      if (!pos) continue;

      const { x, y } = pos;
      const { startColor, endColor, textColor } = getGradientForPOI(item.title);
      const firstChar = getFirstCharacter(item.title);

      // 渐变背景
      const gradientId = `gradient-${idx}`;
      const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      gradient.setAttribute("id", gradientId);
      gradient.setAttribute("x1", "0%");
      gradient.setAttribute("y1", "0%");
      gradient.setAttribute("x2", "0%");
      gradient.setAttribute("y2", "100%");
      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", startColor);
      gradient.appendChild(stop1);
      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", endColor);
      gradient.appendChild(stop2);
      svg.querySelector("defs")!.appendChild(gradient);

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      // 节点背景圆形
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(x));
      circle.setAttribute("cy", String(y));
      circle.setAttribute("r", String(nodeRadius));
      circle.setAttribute("fill", `url(#${gradientId})`);
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))");
      g.appendChild(circle);

      // 图片或占位符
      if (item.photoUrl) {
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS("http://www.w3.org/1999/xlink", "href", item.photoUrl);
        image.setAttribute("x", String(x - photoRadius));
        image.setAttribute("y", String(y - photoRadius));
        image.setAttribute("width", String(photoRadius * 2));
        image.setAttribute("height", String(photoRadius * 2));
        image.setAttribute("clip-path", "url(#photoClip)");
        image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        g.appendChild(image);
      } else {
        // 占位符：首字母
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y + 6));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "18");
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", textColor);
        text.textContent = firstChar;
        g.appendChild(text);
      }

      // 序号徽章
      const badgeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      badgeCircle.setAttribute("cx", String(x + photoRadius - 6));
      badgeCircle.setAttribute("cy", String(y - photoRadius + 6));
      badgeCircle.setAttribute("r", "10");
      badgeCircle.setAttribute("fill", "#ff6a3d");
      badgeCircle.setAttribute("stroke", "#fff");
      badgeCircle.setAttribute("stroke-width", "1.5");
      g.appendChild(badgeCircle);

      const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeText.setAttribute("x", String(x + photoRadius - 6));
      badgeText.setAttribute("y", String(y - photoRadius + 10));
      badgeText.setAttribute("text-anchor", "middle");
      badgeText.setAttribute("font-size", "11");
      badgeText.setAttribute("font-weight", "700");
      badgeText.setAttribute("fill", "#fff");
      badgeText.textContent = String(idx + 1);
      g.appendChild(badgeText);

      nodesGroup.appendChild(g);
    }

    svg.appendChild(nodesGroup);
  }, [map, itemsWithData]);

  if (!configured) {
    return (
      <div className={`rounded-lg border border-border bg-accent-soft p-4 text-center text-sm text-muted-foreground ${className}`}>
        <MapPin className="mx-auto mb-2 size-4" />
        地图服务未配置
      </div>
    );
  }

  if (itemsOnDay.length === 0) {
    return (
      <div className={`rounded-lg bg-accent-soft p-6 text-center text-sm text-muted-foreground ${className}`}>
        这一天暂无行程安排
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-border bg-red-50 p-4 text-sm text-red-700 ${className}`}>
        <AlertCircle className="mb-2 inline size-4" />
        加载地图失败：{error}
      </div>
    );
  }

  return (
    <div className={`relative rounded-[18px] border border-border overflow-hidden ${className}`} style={{ height: "440px" }}>
      {/* 高德地图容器 */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* SVG 节点图叠加层 */}
      <svg
        ref={svgOverlayRef}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      />

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white p-4 text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-muted-foreground">加载中…</p>
          </div>
        </div>
      )}

      {/* 错误和提示信息 */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
        {itemsWithData.some((item) => item.photoUrl === null) && (
          <div className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mb-1 inline size-3" /> 部分景点图片暂无或加载失败
          </div>
        )}

        {itemsWithData.some((item) => item.lng === null || item.lat === null) && (
          <div className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mb-1 inline size-3" /> 部分景点未在地图上定位
          </div>
        )}
      </div>
    </div>
  );
}
