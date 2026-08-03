/**
 * 高德天气(Web 服务 API)。Key 只存在于服务器环境变量。
 * 文档:https://lbs.amap.com/api/webservice/guide/api/weather
 */

type AmapCast = {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  daypower: string;
};

type AmapWeatherResponse = {
  status: string;
  info?: string;
  infocode?: string;
  forecasts?: Array<{ city: string; reporttime: string; casts: AmapCast[] }>;
};

export type WeatherCast = {
  date: string;
  dayWeather: string;
  nightWeather: string;
  dayTemp: number;
  nightTemp: number;
  wind: string;
};

export async function fetchWeatherForecast(city: string): Promise<{
  city: string;
  reportTime: string;
  casts: WeatherCast[];
}> {
  const key = process.env.AMAP_WEB_SERVICE_KEY?.trim();
  if (!key) throw new Error("天气服务未配置(AMAP_WEB_SERVICE_KEY 缺失)");

  const url = new URL("https://restapi.amap.com/v3/weather/weatherInfo");
  url.searchParams.set("key", key);
  url.searchParams.set("city", city);
  url.searchParams.set("extensions", "all");
  url.searchParams.set("output", "json");

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`天气接口返回 ${response.status}`);
  const payload = (await response.json()) as AmapWeatherResponse;
  if (payload.status !== "1" || !payload.forecasts?.length) {
    throw new Error(`查询「${city}」天气失败:${payload.info ?? "未知错误"}`);
  }
  const forecast = payload.forecasts[0];
  return {
    city: forecast.city,
    reportTime: forecast.reporttime,
    casts: forecast.casts.map((cast) => ({
      date: cast.date,
      dayWeather: cast.dayweather,
      nightWeather: cast.nightweather,
      dayTemp: Number(cast.daytemp),
      nightTemp: Number(cast.nighttemp),
      wind: `${cast.daywind}风 ${cast.daypower}级`,
    })),
  };
}
