/**
 * 高德地图 JS API 2.0 动态加载器。
 * Key 与安全密钥来自 VITE_AMAP_JS_KEY / VITE_AMAP_JS_SECURITY_CODE(仅前端可见)。
 * 需要在高德开放平台创建「Web端(JS API)」类型的应用。
 * 文档:https://lbs.amap.com/api/javascript-api-v2/guide/abc/load
 */

// 仅声明用到的最小 API 面,避免引入完整类型包。
export type AMapPlaceSearchCallbackResult = {
  poiList?: { pois?: Array<{ location?: { lng: number; lat: number } | null }> };
};

export interface AMapMapInstance {
  add(overlay: unknown): void;
  destroy(): void;
  setFitView(overlays?: unknown[] | null): void;
}

export interface AMapNamespace {
  Map: new (container: HTMLElement, options?: Record<string, unknown>) => AMapMapInstance;
  PlaceSearch: new (options: { city?: string; citylimit?: boolean }) => {
    search(
      keyword: string,
      callback: (status: string, result: AMapPlaceSearchCallbackResult) => void,
    ): void;
  };
  Marker: new (options: Record<string, unknown>) => unknown;
  Polyline: new (options: Record<string, unknown>) => unknown;
  Pixel: new (x: number, y: number) => unknown;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
    AMap?: AMapNamespace;
  }
}

/** 高德 Key 缺失时抛出,调用方可识别并优雅降级。 */
export class AmapNotConfiguredError extends Error {
  constructor() {
    super("高德地图 JS API 未配置(VITE_AMAP_JS_KEY 缺失)");
    this.name = "AmapNotConfiguredError";
  }
}

export function isAmapConfigured(): boolean {
  return Boolean(import.meta.env.VITE_AMAP_JS_KEY?.trim());
}

const AMAP_SCRIPT_ID = "travelmate-amap-jsapi";

let loadingPromise: Promise<AMapNamespace> | null = null;

export function loadAmap(): Promise<AMapNamespace> {
  const key = import.meta.env.VITE_AMAP_JS_KEY?.trim();
  if (!key) return Promise.reject(new AmapNotConfiguredError());
  if (window.AMap) return Promise.resolve(window.AMap);
  if (loadingPromise) return loadingPromise;

  // 安全密钥必须在加载脚本之前设置。
  const securityJsCode = import.meta.env.VITE_AMAP_JS_SECURITY_CODE?.trim() ?? "";
  window._AMapSecurityConfig = { securityJsCode };

  loadingPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = AMAP_SCRIPT_ID;
    script.async = true;
    const params = new URLSearchParams({
      v: "2.0",
      key,
      plugin: "AMap.PlaceSearch,AMap.Geocoder",
    });
    script.src = `https://webapi.amap.com/maps?${params.toString()}`;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        loadingPromise = null;
        reject(new Error("高德地图脚本加载完成,但未找到 AMap 全局对象"));
      }
    };
    script.onerror = () => {
      loadingPromise = null;
      script.remove();
      reject(new Error("高德地图脚本加载失败"));
    };
    document.head.appendChild(script);
  });
  return loadingPromise;
}
