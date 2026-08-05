import { useEffect, useMemo, useState, useCallback } from "react";
import type { ItineraryItem } from "@/lib/app-model";
import { fetchPoiPhoto } from "@/lib/poi-photos";

export interface DayRouteSketchProps {
  day: number;
  items: ItineraryItem[];
  destination?: string;
  className?: string;
}

type Point = {
  x: number;
  y: number;
  item: ItineraryItem & { image?: string; photo?: string; arriveTime?: string; leaveTime?: string; type?: string };
  index: number;
};

type Leg = {
  from: Point;
  to: Point;
  minutes: number;
  distanceKm: number;
  estimated: boolean;
  mode: string;
};

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const PADDING = 60;

/* ---------- 工具函数 ---------- */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractMinutes(text: string | null): number {
  if (!text) return 0;
  const h = text.match(/(\d+)\s*小时/);
  const m = text.match(/(\d+)\s*分钟?/);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return Number.isFinite(total) ? total : 0;
}

function extractDistanceKm(text: string | null): number | null {
  if (!text) return null;
  const km = text.match(/(\d+(?:\.\d+)?)\s*公里/);
  if (km) return Number(km[1]);
  const m = text.match(/(\d+(?:\.\d+)?)\s*米/);
  if (m) return Number(m[1]) / 1000;
  return null;
}

function inferModeSpeedKmPerMin(text: string | null): number {
  if (!text) return 0.45;
  if (/步行/.test(text)) return 0.075;
  if (/骑行/.test(text)) return 0.22;
  if (/地铁/.test(text)) return 0.6;
  if (/公交/.test(text)) return 0.42;
  if (/打车|驾车/.test(text)) return 0.68;
  return 0.45;
}

function inferDistanceKm(text: string | null, fallbackIndex: number): { km: number; estimated: boolean } {
  const explicit = extractDistanceKm(text);
  if (explicit && explicit > 0) return { km: explicit, estimated: false };
  const minutes = extractMinutes(text);
  if (minutes > 0) return { km: Math.max(0.3, minutes * inferModeSpeedKmPerMin(text)), estimated: true };
  return { km: 1.2 + fallbackIndex * 0.25, estimated: true };
}

function inferMinutesWithFallback(text: string | null, fallbackKm: number): number {
  const minutes = extractMinutes(text);
  if (minutes > 0) return minutes;
  // 无明确用时时,按通行方式速度从距离反推一个近似时长,用于线段长度映射。
  const speed = inferModeSpeedKmPerMin(text);
  const estimated = speed > 0 ? fallbackKm / speed : 0;
  return clamp(Math.round(estimated || 12), 8, 90);
}

function inferMode(text: string | null): string {
  if (!text) return "default";
  if (/步行/.test(text)) return "walk";
  if (/骑行/.test(text)) return "bike";
  if (/地铁/.test(text)) return "subway";
  if (/公交/.test(text)) return "bus";
  if (/打车|驾车/.test(text)) return "drive";
  return "default";
}

function getAdaptiveVisualConfig(pointCount: number) {
  // 点位越多,整体元素按比例收缩,避免遮挡。
  const t = clamp((pointCount - 4) / 8, 0, 1);
  const scale = 1 - t * 0.24;
  const imageScale = 1.5;

  return {
    scale,
    nodeRadius: Math.round(26 * scale * imageScale),
    imageRadius: Math.round(22 * scale * imageScale),
    glowRadius: Math.round(34 * scale * imageScale),
    labelWidth: Math.round(140 * scale),
    labelHeight: Math.round(26 * scale),
    labelOffset: Math.round(58 * scale),
    altLabelOffset: Math.round(66 * scale),
    nameFont: Math.max(9, Math.round(11 * scale)),
    indexFont: Math.max(9, Math.round(13 * scale)),
    smallIndexFont: Math.max(7, Math.round(8 * scale)),
    legLabelWidth: Math.round(72 * scale),
    legLabelHeight: Math.round(28 * scale),
    legFont: Math.max(9, Math.round(11 * scale)),
    legStroke: Math.max(1.8, 2.5 * scale),
    selectedLegStroke: Math.max(2.6, 3.5 * scale),
  };
}

function directionAngle(index: number, title: string): number {
  const base = [-20, 30, -40, 50, -10, 35, -55, 15][index % 8];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash += title.charCodeAt(i);
  const bias = (hash % 17) - 8;
  return ((base + bias) * Math.PI) / 180;
}

/* ---------- 布局算法（时空映射） ---------- */

function relaxPointLayout(points: Point[]): Point[] {
  const adjusted = points.map((p) => ({ ...p }));
  const minDist = 110;

  for (let iter = 0; iter < 50; iter++) {
    for (let i = 0; i < adjusted.length; i++) {
      for (let j = i + 1; j < adjusted.length; j++) {
        const a = adjusted[i];
        const b = adjusted[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < minDist) {
          const push = (minDist - dist) * 0.45;
          const ux = dx / dist;
          const uy = dy / dist;

          // 恢复相对位置关系: 允许 X/Y 双向微调,避免挤压叠盖。
          a.x = clamp(a.x - ux * push * (i === 0 ? 0.25 : 0.9), PADDING + 20, SVG_WIDTH - PADDING - 20);
          a.y = clamp(a.y - uy * push * 0.9, PADDING + 50, SVG_HEIGHT - PADDING - 50);
          b.x = clamp(b.x + ux * push * (j === adjusted.length - 1 ? 0.25 : 0.9), PADDING + 20, SVG_WIDTH - PADDING - 20);
          b.y = clamp(b.y + uy * push * 0.9, PADDING + 50, SVG_HEIGHT - PADDING - 50);
        }
      }
    }
  }
  return adjusted;
}

function centerAndFitPoints(points: Point[]): Point[] {
  if (!points.length) return points;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // 让轨迹尽量铺满画面，同时保留上下左右 margin。
  const marginX = 96;
  const marginY = 86;
  const targetWidth = Math.max(80, SVG_WIDTH - marginX * 2);
  const targetHeight = Math.max(80, SVG_HEIGHT - marginY * 2);

  const scaleX = targetWidth / width;
  const scaleY = targetHeight / height;
  // 稍微放大一点点，视觉更饱满；同时给上限避免过度膨胀。
  const scale = clamp(Math.min(scaleX, scaleY) * 1.06, 0.85, 2.35);

  const sourceCenterX = (minX + maxX) / 2;
  const sourceCenterY = (minY + maxY) / 2;
  const targetCenterX = SVG_WIDTH / 2;
  const targetCenterY = SVG_HEIGHT / 2;

  return points.map((p) => ({
    ...p,
    x: clamp(
      targetCenterX + (p.x - sourceCenterX) * scale,
      marginX,
      SVG_WIDTH - marginX,
    ),
    y: clamp(
      targetCenterY + (p.y - sourceCenterY) * scale,
      marginY,
      SVG_HEIGHT - marginY,
    ),
  }));
}

function buildRoute(items: ItineraryItem[]): { points: Point[]; legs: Leg[] } {
  const points: Point[] = [];

  // 起点固定在左侧中部,后续点按"方位 + 用时长度"递推,恢复相对位置感。
  const startX = PADDING + 60;
  const startY = SVG_HEIGHT / 2;
  points.push({ x: startX, y: startY, item: items[0] as Point["item"], index: 0 });

  for (let i = 1; i < items.length; i++) {
    const prev = points[i - 1];
    const legText = items[i].transportToNext ?? null;
    const { km } = inferDistanceKm(legText, i);
    const minutes = inferMinutesWithFallback(legText, km);
    const angle = directionAngle(i, items[i].title);

    // 线段长度优先按用时映射,并受最小/最大值约束。
    const legLength = clamp(minutes * 3.2, 62, 220);

    const x = clamp(prev.x + Math.cos(angle) * legLength, PADDING + 20, SVG_WIDTH - PADDING - 20);
    const y = clamp(prev.y + Math.sin(angle) * legLength, PADDING + 50, SVG_HEIGHT - PADDING - 50);

    points.push({
      x,
      y,
      item: items[i] as Point["item"],
      index: i,
    });
  }

  const stablePoints = centerAndFitPoints(relaxPointLayout(points));

  const legs: Leg[] = [];
  for (let i = 0; i < stablePoints.length - 1; i++) {
    const from = stablePoints[i];
    const to = stablePoints[i + 1];
    const legText = to.item.transportToNext ?? null;
    const minutes = extractMinutes(legText);
    const { km, estimated } = inferDistanceKm(legText, i + 1);
    legs.push({ from, to, minutes, distanceKm: km, estimated, mode: inferMode(legText) });
  }

  return { points: stablePoints, legs };
}

/* ---------- 贝塞尔曲线路径 ---------- */

function bezierPath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // S形曲线控制点
  const cp1x = from.x + dx * 0.4;
  const cp1y = from.y + dy * 0.1;
  const cp2x = to.x - dx * 0.4;
  const cp2y = to.y - dy * 0.1;
  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}

/* ---------- 配色 ---------- */

const MODE_COLORS: Record<string, { stroke: string; bg: string; icon: string }> = {
  walk:   { stroke: "#10b981", bg: "#d1fae5", icon: "🚶" },
  bike:   { stroke: "#f59e0b", bg: "#fef3c7", icon: "🚲" },
  subway: { stroke: "#6366f1", bg: "#e0e7ff", icon: "🚇" },
  bus:    { stroke: "#f59e0b", bg: "#fef3c7", icon: "🚌" },
  drive:  { stroke: "#3b82f6", bg: "#dbeafe", icon: "🚗" },
  default:{ stroke: "#64748b", bg: "#f1f5f9", icon: "" },
};

const TYPE_COLORS: Record<string, string> = {
  attraction: "#0ea5e9", // 景点蓝
  restaurant: "#f97316", // 美食橙
  hotel:    "#8b5cf6", // 住宿紫
  transport:"#10b981", // 交通绿
  default:  "#0ea5e9",
};

function getTypeColor(item: Point["item"]): string {
  return TYPE_COLORS[item.type || "default"] || TYPE_COLORS.default;
}

/* ---------- 图片占位组件 ---------- */

function PhotoPlaceholder({ name, className = "" }: { name: string; className?: string }) {
  const initial = name.charAt(0) || "景";
  const gradients = [
    "from-rose-400 to-orange-300",
    "from-sky-400 to-indigo-300",
    "from-emerald-400 to-teal-300",
    "from-violet-400 to-purple-300",
    "from-amber-400 to-yellow-300",
  ];
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradients[hash]} ${className}`}>
      <span className="text-white font-bold text-lg drop-shadow-sm">{initial}</span>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function DayRouteSketch({ day, items, destination = "", className = "" }: DayRouteSketchProps) {
  const dayItems = items.filter((item) => item.day === day && item.duration !== "待生成");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const destinationText = destination.trim();

  useEffect(() => {
    setSelectedIndex(0);
  }, [day]);

  // 图片加载：优先用行程自带，其次fetch
  useEffect(() => {
    let cancelled = false;
    const targets = dayItems.filter((item) => item.title.trim());
    if (!targets.length) return;

    (async () => {
      // 1. 先收集自带图片
      const direct: Record<string, string | null> = {};
      const needFetch: typeof targets = [];
      
      targets.forEach((item) => {
        const extended = item as Point["item"];
        const url = extended.image || extended.photo || null;
        if (url) direct[item.id] = url;
        else needFetch.push(item);
      });

      // 2. 异步获取缺失图片
      const fetched = await Promise.all(
        needFetch.map(async (item) => {
          try {
            const url = destinationText ? await fetchPoiPhoto(destinationText, item.title) : null;
            return [item.id, url] as const;
          } catch {
            return [item.id, null] as const;
          }
        })
      );

      if (!cancelled) {
        setPhotos({ ...direct, ...Object.fromEntries(fetched) });
      }
    })();

    return () => { cancelled = true; };
  }, [day, destinationText, JSON.stringify(dayItems.map((i) => i.id))]);

  const handleImageLoad = useCallback((id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleImageError = useCallback((id: string) => {
    setPhotos((prev) => ({ ...prev, [id]: null }));
  }, []);

  if (!dayItems.length) {
    return (
      <div className={`rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-400 ${className}`}>
        这一天暂无行程安排
      </div>
    );
  }

  if (dayItems.length === 1) {
    const item = dayItems[0] as Point["item"];
    const photo = photos[item.id];
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
        <div className="p-4 flex items-center gap-4">
          {photo ? (
            <img src={photo} alt={item.title} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <PhotoPlaceholder name={item.title} className="w-16 h-16 rounded-xl" />
          )}
          <div>
            <div className="text-xs text-slate-400 mb-0.5">第 {day} 天 · 仅 1 个景点</div>
            <div className="font-semibold text-slate-800">{item.title}</div>
          </div>
        </div>
      </div>
    );
  }

  const { points, legs } = useMemo(() => buildRoute(dayItems), [dayItems]);
  const visual = useMemo(() => getAdaptiveVisualConfig(dayItems.length), [dayItems.length]);
  const selectedItem = dayItems[selectedIndex] as Point["item"];
  const selectedPoint = points[selectedIndex];
  const selectedPhoto = selectedItem ? photos[selectedItem.id] : null;

  // 计算当日总览
  const totalDistance = legs.reduce((sum, l) => sum + l.distanceKm, 0);
  const totalMoveMinutes = legs.reduce((sum, l) => sum + l.minutes, 0);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}>
      {/* ===== 地图区域 ===== */}
      <div className="relative bg-slate-50">
        <svg
          width="100%"
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="select-none"
          style={{ minHeight: clamp(320 + dayItems.length * 6, 320, 460) }}
        >
          <defs>
            {/* 箭头标记 */}
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
            </marker>
            {/* 圆形裁剪 */}
            <clipPath id="circle-clip">
              <circle cx="0" cy="0" r="20" />
            </clipPath>
            {/* 阴影滤镜 */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* 背景网格（营造地图感） */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grid)" />
          <image
            href="/route-sketch-bg.svg"
            x="0"
            y="0"
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
            opacity="0.34"
            style={{ pointerEvents: "none" }}
          />

          {/* 连线 */}
          {legs.map((leg, idx) => {
            const mc = MODE_COLORS[leg.mode] || MODE_COLORS.default;
            const pathD = bezierPath(leg.from, leg.to);
            const midX = (leg.from.x + leg.to.x) / 2;
            const midY = (leg.from.y + leg.to.y) / 2;
            const isSelected = selectedIndex === idx || selectedIndex === idx + 1;

            return (
              <g key={`leg-${idx}`} opacity={isSelected ? 1 : 0.55}>
                {/* 底线路径 */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={mc.stroke}
                  strokeWidth={isSelected ? visual.selectedLegStroke : visual.legStroke}
                  strokeLinecap="round"
                  strokeDasharray={leg.mode === "walk" ? "6 4" : "none"}
                  opacity={0.7}
                />
                {/* 交通标签背景 */}
                <rect
                  x={midX - visual.legLabelWidth / 2}
                  y={midY - visual.legLabelHeight / 2}
                  width={visual.legLabelWidth}
                  height={visual.legLabelHeight}
                  rx={visual.legLabelHeight / 2}
                  fill="white"
                  stroke={mc.stroke}
                  strokeWidth="1.5"
                  filter="url(#shadow)"
                />
                {/* 交通标签文字 */}
                <text
                  x={midX}
                  y={midY + Math.max(3, Math.round(4 * visual.scale))}
                  textAnchor="middle"
                  fontSize={visual.legFont}
                  fill="#334155"
                  fontWeight="600"
                >
                  {`${leg.estimated ? "~" : ""}${leg.distanceKm.toFixed(1)}km`}
                </text>
              </g>
            );
          })}

          {/* 节点 */}
          {points.map((p, idx) => {
            const isSelected = selectedIndex === idx;
            const color = getTypeColor(p.item);
            const photo = photos[p.item.id];
            const hasImage = !!photo;
            const imageLoaded = loadedImages[p.item.id];

            return (
              <g key={`node-${idx}`} transform={`translate(${p.x}, ${p.y})`} style={{ cursor: "pointer" }} onClick={() => setSelectedIndex(idx)}>
                {/* 选中光晕 */}
                {isSelected && (
                  <circle r={visual.glowRadius} fill={color} opacity="0.15">
                    <animate
                      attributeName="r"
                      values={`${Math.round(visual.glowRadius * 0.9)};${Math.round(visual.glowRadius * 1.08)};${Math.round(visual.glowRadius * 0.9)}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate attributeName="opacity" values="0.2;0.08;0.2" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                
                {/* 外圈 */}
                <circle
                  r={visual.nodeRadius}
                  fill="white"
                  stroke={color}
                  strokeWidth={isSelected ? Math.max(2.4, 3 * visual.scale) : Math.max(1.6, 2 * visual.scale)}
                  filter="url(#shadow)"
                />
                
                {/* 图片或色块 */}
                {hasImage ? (
                  <g>
                    <defs>
                      <clipPath id={`clip-${p.item.id}`}>
                        <circle r={visual.imageRadius} />
                      </clipPath>
                    </defs>
                    <image
                      href={photo!}
                      x={-visual.imageRadius}
                      y={-visual.imageRadius}
                      width={visual.imageRadius * 2}
                      height={visual.imageRadius * 2}
                      clipPath={`url(#clip-${p.item.id})`}
                      preserveAspectRatio="xMidYMid slice"
                      opacity={imageLoaded ? 1 : 0}
                      onLoad={() => handleImageLoad(p.item.id)}
                    />
                    {!imageLoaded && (
                      <circle r={visual.imageRadius} fill={`${color}22`} />
                    )}
                  </g>
                ) : (
                  <circle r={visual.imageRadius} fill={`${color}18`} />
                )}
                
                {/* 序号 */}
                <text
                  y={hasImage && imageLoaded ? 0 : 4}
                  textAnchor="middle"
                  fontSize={hasImage && imageLoaded ? Math.max(8, Math.round(10 * visual.scale)) : visual.indexFont}
                  fill={hasImage && imageLoaded ? "white" : color}
                  fontWeight="700"
                  style={{ textShadow: hasImage && imageLoaded ? "0 1px 3px rgba(0,0,0,0.5)" : "none" }}
                >
                  {idx + 1}
                </text>

                {/* 名称标签 */}
                <g transform={`translate(0, ${idx % 2 === 0 ? visual.labelOffset : -visual.altLabelOffset})`}>
                  <rect
                    x={-visual.labelWidth / 2}
                    y={-visual.labelHeight / 2}
                    width={visual.labelWidth}
                    height={visual.labelHeight}
                    rx={visual.labelHeight / 2}
                    fill={isSelected ? color : "white"}
                    stroke={isSelected ? color : "#e2e8f0"}
                    strokeWidth="1.5"
                    filter="url(#shadow)"
                  />
                  <text
                    y={Math.max(3, Math.round(4 * visual.scale))}
                    textAnchor="middle"
                    fontSize={visual.nameFont}
                    fill={isSelected ? "white" : "#1e293b"}
                    fontWeight="600"
                  >
                    {p.item.title.length > 10 ? `${p.item.title.slice(0, 10)}…` : p.item.title}
                  </text>
                </g>

                {/* 时间标签（小字） */}
                {(p.item.arriveTime || p.item.leaveTime) && (
                  <g transform={`translate(0, ${idx % 2 === 0 ? -34 : 34})`}>
                    <text
                      y="3"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                      fontWeight="500"
                    >
                      {p.item.arriveTime || ""}{p.item.leaveTime ? `-${p.item.leaveTime}` : ""}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 当日总览浮层 */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[11px] font-medium text-slate-600 border border-slate-200 shadow-sm">
            总里程 {totalDistance.toFixed(1)}km
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[11px] font-medium text-slate-600 border border-slate-200 shadow-sm">
            移动 {totalMoveMinutes}分钟
          </span>
        </div>
      </div>

      {/* ===== 横向时间轴 ===== */}
      <div className="border-t border-slate-100 bg-white">
        <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
          {dayItems.map((rawItem, idx) => {
            const item = rawItem as Point["item"];
            const photo = photos[item.id];
            const isSelected = selectedIndex === idx;
            const color = getTypeColor(item);
            
            return (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "border-slate-300 bg-slate-50 shadow-sm ring-1 ring-slate-200"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={item.title}
                    className={`w-9 h-9 rounded-lg object-cover transition-all ${isSelected ? "ring-2 ring-offset-1" : ""}`}
                    style={isSelected ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
                    loading="lazy"
                  />
                ) : (
                  <PhotoPlaceholder name={item.title} className="w-9 h-9 rounded-lg flex-shrink-0" />
                )}
                <div className="text-left">
                  <div className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-slate-800" : "text-slate-500"}`}>
                    {item.title.length > 8 ? `${item.title.slice(0, 8)}…` : item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.arriveTime || ""}{item.leaveTime ? `-${item.leaveTime}` : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== 选中详情面板 ===== */}
      {selectedItem && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
          <div className="flex gap-4">
            {/* 图片 */}
            <div className="flex-shrink-0">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt={selectedItem.title}
                  className="w-24 h-24 rounded-xl object-cover shadow-sm"
                  loading="lazy"
                />
              ) : (
                <PhotoPlaceholder name={selectedItem.title} className="w-24 h-24 rounded-xl shadow-sm" />
              )}
            </div>
            
            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getTypeColor(selectedItem) }}
                />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {selectedItem.type === "restaurant" ? "美食" : selectedItem.type === "hotel" ? "住宿" : selectedItem.type === "transport" ? "交通" : "景点"}
                </span>
                {selectedPoint && selectedPoint.index > 0 && (
                  <span className="text-[10px] text-slate-400">
                    距上站 {legs[selectedPoint.index - 1]?.distanceKm.toFixed(1)}km · {legs[selectedPoint.index - 1]?.minutes}分钟
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1 truncate">
                {selectedIndex + 1}. {selectedItem.title}
              </h3>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                {selectedItem.arriveTime && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                    ⏰ {selectedItem.arriveTime}{selectedItem.leaveTime ? ` - ${selectedItem.leaveTime}` : ""}
                  </span>
                )}
                {selectedItem.duration && selectedItem.duration !== "待生成" && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                    ⏳ 停留 {selectedItem.duration}
                  </span>
                )}
              </div>
              {selectedItem.transportToNext && selectedPoint && selectedPoint.index < dayItems.length - 1 && (
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <span>下一站：</span>
                  <span className="text-slate-500 font-medium">{selectedItem.transportToNext}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}