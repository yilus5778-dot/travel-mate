import { useEffect, useState, useRef } from "react";
import { AlertCircle, MapPin, Navigation } from "lucide-react";
import { fetchPoiPhoto, cleanPoiKeyword } from "@/lib/poi-photos";
import { isAmapConfigured, loadAmap } from "@/lib/amap-loader";
import type { ItineraryItem } from "@/lib/app-model";

export interface DayItineraryVisualizationProps {
  day: number;
  destination: string;
  items: ItineraryItem[];
  className?: string;
}

interface ItemWithLocation extends ItineraryItem {
  photoUrl: string | null;
  lng: number | null;
  lat: number | null;
  photoLoading?: boolean; // 标记是否正在加载
}

interface SVGNodePosition {
  x: number;
  y: number;
  label: string;
  radius: number;
}

/**
 * 根据景点标题推断景点类型，返回对应图标和背景色
 */
function inferPOIType(title: string): { icon: string; color: string; bgColor: string } {
  const titleLower = title.toLowerCase();

  // 美食相关
  if (/餐厅|饭店|酒店|咖啡|奶茶|美食|小吃|食府|面馆|烤肉|火锅|寿司/.test(title)) {
    return { icon: "🍽️", color: "#f59e0b", bgColor: "#fef3c7" };
  }

  // 博物馆、历史建筑
  if (/博物馆|美术馆|展览|宫殿|城堡|寺庙|教堂|古迹|文化|历史/.test(title)) {
    return { icon: "🏛️", color: "#8b5cf6", bgColor: "#ede9fe" };
  }

  // 自然景观
  if (/山|湖|海|瀑布|公园|森林|花园|植物园|风景|自然|溪/.test(title)) {
    return { icon: "🌿", color: "#10b981", bgColor: "#d1fae5" };
  }

  // 购物
  if (/商场|商街|市场|购物|百货|超市|夜市|街/.test(title)) {
    return { icon: "🛍️", color: "#ec4899", bgColor: "#fce7f3" };
  }

  // 娱乐休闲
  if (/游乐|主题公园|动物园|游戏|KTV|酒吧|演出|剧院|影院|游船/.test(title)) {
    return { icon: "🎡", color: "#06b6d4", bgColor: "#cffafe" };
  }

  // 默认通用景观
  return { icon: "🏞️", color: "#64748b", bgColor: "#f1f5f9" };
}

/**
 * 当日路线地理节点图：基于高德地图坐标显示景点位置
 * - 获取每个景点的真实地理坐标
 * - 按地理位置排列节点（而不是固定竖向）
 * - 连线长度/粗细反映景点间的用时
 * - 显示交通方式和景点图片
 * - 改进图片加载：重试、超时、占位符优化
 */
export function DayItineraryVisualization({
  day,
  destination,
  items,
  className = "",
}: DayItineraryVisualizationProps) {
  const [itemsWithData, setItemsWithData] = useState<ItemWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgBounds, setSvgBounds] = useState({ width: 600, height: 400 });

  const configured = isAmapConfigured();
  const itemsOnDay = items.filter((item) => item.day === day && item.duration !== "待生成");

  // 步骤 1：并行获取坐标和图片
  useEffect(() => {
    if (!configured || !destination.trim() || itemsOnDay.length === 0) {
      if (itemsOnDay.length === 0 && configured) {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const AMap = await loadAmap();
        if (cancelled) return;

        const city = destination.trim();
        const withData = await Promise.all(
          itemsOnDay.map(async (item) => {
            // 并行获取坐标和图片
            const [photoUrl, location] = await Promise.all([
              fetchPoiPhoto(city, item.title),
              new Promise<{ lng: number; lat: number } | null>((resolve) => {
                try {
                  const placeSearch = new AMap.PlaceSearch({
                    city,
                    citylimit: true,
                  });
                  placeSearch.search(cleanPoiKeyword(item.title), (status, result) => {
                    const loc = status === "complete" ? result?.poiList?.pois?.[0]?.location : null;
                    resolve(loc ? { lng: loc.lng, lat: loc.lat } : null);
                  });
                } catch {
                  resolve(null);
                }
              }),
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

        // 步骤 2：计算地理坐标到 SVG 坐标的映射
        const locatedItems = withData.filter((item) => item.lng !== null && item.lat !== null);
        if (locatedItems.length > 0) {
          const lngs = locatedItems.map((item) => item.lng as number);
          const lats = locatedItems.map((item) => item.lat as number);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);

          // 地理坐标范围
          const lngRange = maxLng - minLng || 0.01;
          const latRange = maxLat - minLat || 0.01;

          // 设置 SVG 大小，留边距
          const padding = 80;
          const svgWidth = Math.max(600, lngRange > latRange ? 800 : 600);
          const svgHeight = Math.max(400, latRange > lngRange ? 600 : 400);

          setSvgBounds({ width: svgWidth, height: svgHeight });

          // 地理坐标 -> SVG 坐标的转换函数
          const geoToSvg = (lng: number, lat: number) => {
            const x = padding + ((lng - minLng) / lngRange) * (svgWidth - 2 * padding);
            const y = padding + ((maxLat - lat) / latRange) * (svgHeight - 2 * padding); // 反转 Y 轴
            return { x, y };
          };

          // 步骤 3：碰撞检测 + 位置调整
          const nodeRadius = 40;
          const positionedItems = locatedItems.map((item, idx) => {
            let pos = geoToSvg(item.lng as number, item.lat as number);

            // 简单碰撞检测：与前面的节点太近则偏移
            for (let i = 0; i < idx; i++) {
              const prevItem = positionedItems[i];
              const dx = pos.x - prevItem.x;
              const dy = pos.y - prevItem.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < nodeRadius * 2.5) {
                // 碰撞了，沿径向外推
                const angle = Math.atan2(dy, dx);
                pos.x = prevItem.x + Math.cos(angle) * nodeRadius * 2.5;
                pos.y = prevItem.y + Math.sin(angle) * nodeRadius * 2.5;
              }
            }

            return { ...item, ...pos };
          });

          setItemsWithData(positionedItems as ItemWithLocation[]);
        } else {
          setItemsWithData(withData);
        }

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
    };
  }, [configured, destination, day, JSON.stringify(itemsOnDay)]);

  // 渲染状态检查
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
        加载地理信息失败：{error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-lg bg-accent-soft p-8 text-center text-sm text-muted-foreground ${className}`}>
        <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p>正在获取地理位置信息…</p>
      </div>
    );
  }

  // 步骤 4：渲染 SVG
  const nodeRadius = 40;
  const photoRadius = nodeRadius - 6;

  // 提取用时（例如 "打车约15分钟" -> 15）
  const extractMinutes = (transport: string | null): number => {
    if (!transport) return 0;
    const match = transport.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  return (
    <div
      className={`overflow-auto rounded-lg border border-border bg-white/80 backdrop-blur-sm ${className}`}
      style={{ maxHeight: "600px" }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        svg image {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
      <svg
        width={svgBounds.width}
        height={svgBounds.height}
        viewBox={`0 0 ${svgBounds.width} ${svgBounds.height}`}
        className="min-w-full"
      >
        <defs>
          {/* 圆形裁剪路径 */}
          <clipPath id="photoClip">
            <circle cx="0" cy="0" r={photoRadius} />
          </clipPath>

          {/* 箭头标记 */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#cbd5e1" />
          </marker>

          {/* 渐变背景 */}
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.9" />
          </linearGradient>

          {/* 用时标签背景 */}
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* 连接线 + 用时标签（第二阶段） */}
        {itemsWithData.map((item, idx) => {
          if (idx === itemsWithData.length - 1) return null;

          const nextItem = itemsWithData[idx + 1];
          const x1 = (item as any).x || 0;
          const y1 = (item as any).y || 0;
          const x2 = (nextItem as any).x || 0;
          const y2 = (nextItem as any).y || 0;

          const minutes = extractMinutes(nextItem.transportToNext);
          const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

          // 连线粗细与用时关联（10分钟 = 2px, 30分钟 = 6px）
          const lineWidth = Math.min(6, 2 + (minutes / 20) * 4);

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const angle = Math.atan2(y2 - y1, x2 - x1);

          // 连接线端点调整（从节点边界开始）
          const startX = x1 + Math.cos(angle) * nodeRadius;
          const startY = y1 + Math.sin(angle) * nodeRadius;
          const endX = x2 - Math.cos(angle) * nodeRadius;
          const endY = y2 - Math.sin(angle) * nodeRadius;

          return (
            <g key={`connection-${idx}`}>
              {/* 渐变连接线 */}
              <defs>
                <linearGradient
                  id={`lineGradient-${idx}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={`url(#lineGradient-${idx})`}
                strokeWidth={lineWidth}
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />

              {/* 用时标签背景 */}
              <rect
                x={midX - 45}
                y={midY - 16}
                width="90"
                height="32"
                rx="16"
                fill="url(#edgeGradient)"
                stroke="#f59e0b"
                strokeWidth="1"
              />

              {/* 用时数字 + 交通方式图标 */}
              <text
                x={midX - 12}
                y={midY + 5}
                fontSize="12"
                fontWeight="600"
                fill="#d97706"
                textAnchor="middle"
              >
                {minutes}分
              </text>

              {/* 交通方式简写 */}
              {nextItem.transportToNext && (
                <text
                  x={midX + 20}
                  y={midY + 5}
                  fontSize="10"
                  fill="#92400e"
                  textAnchor="start"
                >
                  {nextItem.transportToNext.includes("步行")
                    ? "🚶"
                    : nextItem.transportToNext.includes("打车") || nextItem.transportToNext.includes("驾")
                      ? "🚗"
                      : nextItem.transportToNext.includes("公交")
                        ? "🚌"
                        : "→"}
                </text>
              )}
            </g>
          );
        })}

        {/* 节点 */}
        {itemsWithData.map((item, idx) => {
          const x = (item as any).x || 0;
          const y = (item as any).y || 0;
          const { icon, color, bgColor } = inferPOIType(item.title);

          return (
            <g key={`node-${idx}`}>
              {/* 节点背景圆形 */}
              <circle
                cx={x}
                cy={y}
                r={nodeRadius}
                fill="url(#nodeGradient)"
                stroke="#e2e8f0"
                strokeWidth="2"
              />

              {/* 图片或占位符 */}
              {item.photoUrl ? (
                <g>
                  {/* 图片加载中的骨架屏 */}
                  {item.photoLoading && (
                    <circle
                      cx={x}
                      cy={y}
                      r={photoRadius}
                      fill={bgColor}
                      opacity="0.6"
                      style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
                    />
                  )}
                  {/* 实际图片 */}
                  <image
                    href={item.photoUrl}
                    x={x - photoRadius}
                    y={y - photoRadius}
                    width={photoRadius * 2}
                    height={photoRadius * 2}
                    clipPath="url(#photoClip)"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: item.photoLoading ? 0.7 : 1 }}
                  />
                </g>
              ) : (
                <>
                  {/* 改进的占位符：根据景点类型显示颜色和图标 */}
                  <circle cx={x} cy={y} r={photoRadius} fill={bgColor} stroke={color} strokeWidth="2" />
                  <text x={x} y={y + 6} textAnchor="middle" fontSize="24" fontWeight="600">
                    {icon}
                  </text>
                </>
              )}

              {/* 序号徽章 */}
              <circle cx={x + photoRadius - 8} cy={y - photoRadius + 8} r="11" fill="#ff6a3d" />
              <text
                x={x + photoRadius - 8}
                y={y - photoRadius + 13}
                textAnchor="middle"
                fontSize="12"
                fill="#fff"
                fontWeight="bold"
              >
                {idx + 1}
              </text>

              {/* 信息标签（下方） */}
              <g>
                {/* 景点名称 */}
                <text
                  x={x}
                  y={y + nodeRadius + 18}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#1e293b"
                >
                  {item.title.length > 16 ? item.title.slice(0, 16) + "…" : item.title}
                </text>

                {/* 时间 + 停留时长 */}
                <text x={x} y={y + nodeRadius + 34} textAnchor="middle" fontSize="10" fill="#64748b">
                  🕐 {item.time}
                </text>

                <text x={x} y={y + nodeRadius + 48} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  ⏱ {item.duration}
                </text>
              </g>
            </g>
          );
        })}

        {/* 地理信息标记（右下角） */}
        <g>
          <rect x={svgBounds.width - 150} y={svgBounds.height - 40} width="140" height="30" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
          <text
            x={svgBounds.width - 80}
            y={svgBounds.height - 22}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            📍 地理位置映射
          </text>
        </g>
      </svg>

      {/* 加载状态提示 */}
      {itemsWithData.length > 0 && itemsWithData.some((item) => item.photoUrl === null) && (
        <div className="border-t border-border px-4 py-2 text-xs text-amber-700">
          <AlertCircle className="mb-1 inline size-3" /> 
          <span className="ml-1">部分景点图片暂无或加载失败，已显示景点分类图标（自动重试最多 2 次）</span>
        </div>
      )}

      {itemsWithData.length > 0 &&
        itemsWithData.some((item) => item.lng === null || item.lat === null) && (
          <div className="border-t border-border px-4 py-2 text-xs text-amber-700">
            <AlertCircle className="mb-1 inline size-3" /> 
            <span className="ml-1">部分景点未在地图上定位（可能是小景点或别名，不影响导航）</span>
          </div>
        )}
    </div>
  );
}
