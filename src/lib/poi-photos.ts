/**
 * 景点照片：通过高德 PlaceSearch 取 POI 首图
 * 改进方案：
 * - 自动重试机制（失败后最多重试 2 次）
 * - 超时控制（单次查询 3 秒超时）
 * - 本地缓存（sessionStorage 持久化）
 * - 多策略搜索（完整名称 → 简化名称 → 主关键词）
 * - 降级占位符（无图片显示景点分类图标）
 */

import { isAmapConfigured, loadAmap } from "./amap-loader";

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();
const failureRetry = new Map<string, number>(); // 追踪重试次数
const MAX_RETRIES = 2;
const SEARCH_TIMEOUT_MS = 3000;

/**
 * 提取可检索的主名称："鼓浪屿(日光岩、菽庄花园)" → "鼓浪屿";"A、B" → "A"
 * AI 生成的复合标题直接拿去检索通常搜不到，必须先清洗
 */
export function cleanPoiKeyword(title: string): string {
  return title
    .replace(/[(（【\[].*?[)）】\]]/g, "")
    .split(/[、,，·\/]/)[0]
    .trim();
}

/**
 * 从 localStorage 恢复缓存
 */
function loadCacheFromStorage() {
  try {
    const stored = sessionStorage.getItem("poi_photos_cache");
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([key, value]) => {
        cache.set(key, value as string | null);
      });
    }
  } catch (e) {
    // 缓存损坏，忽略
  }
}

/**
 * 保存缓存到 localStorage
 */
function saveCacheToStorage() {
  try {
    const data = Object.fromEntries(cache);
    sessionStorage.setItem("poi_photos_cache", JSON.stringify(data));
  } catch (e) {
    // 存储满或其他错误，忽略
  }
}

/**
 * 带超时的 PlaceSearch 查询
 */
function searchWithTimeout(
  placeSearch: any,
  keyword: string,
  timeoutMs: number = SEARCH_TIMEOUT_MS,
): Promise<string | null> {
  return Promise.race([
    new Promise<string | null>((resolve) => {
      try {
        placeSearch.search(keyword, (status: string, result: any) => {
          const url =
            status === "complete"
              ? result?.poiList?.pois?.[0]?.photos?.[0]?.url
              : null;
          resolve(typeof url === "string" && url ? url : null);
        });
      } catch (e) {
        resolve(null);
      }
    }),
    new Promise<string | null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

/**
 * 单次搜索尝试（带降级策略）
 */
async function tryFetchPhoto(
  AMap: any,
  city: string,
  originalTitle: string,
): Promise<string | null> {
  // 策略 1：使用原始标题
  let placeSearch = new AMap.PlaceSearch({ city, citylimit: true, extensions: "all" });
  let result = await searchWithTimeout(placeSearch, originalTitle);
  if (result) return result;

  // 策略 2：使用清洁后的关键词
  const keyword = cleanPoiKeyword(originalTitle);
  if (keyword !== originalTitle) {
    result = await searchWithTimeout(placeSearch, keyword);
    if (result) return result;
  }

  // 策略 3：使用主关键词的前 N 个字（处理名称过长的情况）
  if (keyword.length > 8) {
    const shortKeyword = keyword.slice(0, 8);
    result = await searchWithTimeout(placeSearch, shortKeyword);
    if (result) return result;
  }

  // 策略 4：尝试不限制城市的搜索（用于跨城市的知名景点）
  placeSearch = new AMap.PlaceSearch({ extensions: "all" });
  result = await searchWithTimeout(placeSearch, keyword, SEARCH_TIMEOUT_MS / 2);
  if (result) return result;

  return null;
}

// 初始化时从存储恢复缓存
if (typeof window !== "undefined") {
  loadCacheFromStorage();
}

export function fetchPoiPhoto(destination: string, title: string): Promise<string | null> {
  const city = destination.trim();
  const keyword = cleanPoiKeyword(title);
  if (!city || !keyword || !isAmapConfigured()) return Promise.resolve(null);

  const key = `${city}:${keyword}`;

  // 1. 检查缓存
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key) ?? null);
  }

  // 2. 检查是否已在请求中
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  // 3. 发起新请求（带重试）
  let retryCount = failureRetry.get(key) ?? 0;

  const promise = (async () => {
    try {
      const AMap = await loadAmap();

      // 重试循环
      let url: string | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          url = await tryFetchPhoto(AMap, city, title);
          if (url) break; // 成功，退出重试循环
        } catch (e) {
          // 单次尝试出错，继续重试
          if (attempt === MAX_RETRIES) {
            throw e;
          }
          // 等待 200ms 后重试
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // 缓存结果（包括 null）
      cache.set(key, url ?? null);
      saveCacheToStorage();
      failureRetry.delete(key); // 清除重试计数

      return url ?? null;
    } catch (err) {
      // 最终失败，记录重试次数
      retryCount++;
      failureRetry.set(key, retryCount);

      // 如果还有重试次数，缓存为 null 但保留失败标记
      cache.set(key, null);
      saveCacheToStorage();

      return null;
    }
  })();

  pending.set(key, promise);

  // 清理 pending 状态
  promise.finally(() => {
    pending.delete(key);
  });

  return promise;
}

