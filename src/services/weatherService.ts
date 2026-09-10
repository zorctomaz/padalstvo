import type { Coordinates, DailyForecast, HourlyForecast, MarineWeather } from '../types';

// Open-Meteo is free, keyless and CORS-friendly, which makes it a good default
// for a sailing weather feed. https://open-meteo.com/en/docs & /en/docs/marine-weather-api
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/reverse';

const HOURLY_FIELDS = [
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'precipitation_probability',
  'weather_code',
  'visibility',
  'surface_pressure',
].join(',');

const DAILY_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'weather_code',
  'sunrise',
  'sunset',
].join(',');

const MARINE_HOURLY_FIELDS = ['wave_height', 'wave_period'].join(',');

function knots(kmh: number): number {
  return kmh * 0.539957;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather request failed (${res.status})`);
  }
  return res.json();
}

async function reverseGeocode(coords: Coordinates): Promise<string> {
  try {
    const url = `${GEOCODE_URL}?latitude=${coords.latitude}&longitude=${coords.longitude}&count=1&language=sl`;
    const data = await fetchJson(url);
    const place = data?.results?.[0];
    if (!place) return 'Trenutna lokacija';
    return [place.name, place.country].filter(Boolean).join(', ');
  } catch {
    return 'Trenutna lokacija';
  }
}

/**
 * Fetches current + hourly + daily weather, and (best-effort) marine wave data,
 * for the given coordinates and merges them into a sailing-focused view model.
 */
export async function fetchMarineWeather(coords: Coordinates): Promise<MarineWeather> {
  const { latitude, longitude } = coords;

  const forecastUrl =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,weather_code,is_day` +
    `&hourly=${HOURLY_FIELDS}&daily=${DAILY_FIELDS}` +
    `&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

  const marineUrl =
    `${MARINE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=${MARINE_HOURLY_FIELDS}&timezone=auto&forecast_days=7`;

  const [forecast, marine, locationName] = await Promise.all([
    fetchJson(forecastUrl),
    fetchJson(marineUrl).catch(() => null), // inland lakes have no marine data
    reverseGeocode(coords),
  ]);

  const marineHourlyTimes: string[] = marine?.hourly?.time ?? [];
  const waveHeightByTime = new Map<string, number>();
  const wavePeriodByTime = new Map<string, number>();
  marineHourlyTimes.forEach((t, i) => {
    const h = marine.hourly.wave_height?.[i];
    const p = marine.hourly.wave_period?.[i];
    if (typeof h === 'number') waveHeightByTime.set(t, h);
    if (typeof p === 'number') wavePeriodByTime.set(t, p);
  });

  const hourlyTimes: string[] = forecast.hourly.time;
  const hourly: HourlyForecast[] = hourlyTimes.map((time, i) => ({
    time,
    temperatureC: forecast.hourly.temperature_2m[i],
    windSpeedKn: knots(forecast.hourly.wind_speed_10m[i]),
    windGustsKn: knots(forecast.hourly.wind_gusts_10m[i]),
    windDirectionDeg: forecast.hourly.wind_direction_10m[i],
    waveHeightM: waveHeightByTime.get(time) ?? null,
    precipitationProbability: forecast.hourly.precipitation_probability?.[i] ?? 0,
    weatherCode: forecast.hourly.weather_code[i],
  }));

  const dailyDates: string[] = forecast.daily.time;
  const daily: DailyForecast[] = dailyDates.map((date, i) => ({
    date,
    tempMinC: forecast.daily.temperature_2m_min[i],
    tempMaxC: forecast.daily.temperature_2m_max[i],
    windSpeedMaxKn: knots(forecast.daily.wind_speed_10m_max[i]),
    windGustsMaxKn: knots(forecast.daily.wind_gusts_10m_max[i]),
    waveHeightMaxM: null,
    weatherCode: forecast.daily.weather_code[i],
    sunrise: forecast.daily.sunrise[i],
    sunset: forecast.daily.sunset[i],
  }));

  // fill daily max wave height from the marine hourly series
  daily.forEach((d) => {
    const dayValues = hourly
      .filter((h) => h.time.startsWith(d.date) && h.waveHeightM !== null)
      .map((h) => h.waveHeightM as number);
    if (dayValues.length) {
      d.waveHeightMaxM = Math.max(...dayValues);
    }
  });

  const nowIso = new Date().toISOString().slice(0, 13); // matches hourly "YYYY-MM-DDTHH"
  const currentHourly = hourly.find((h) => h.time.startsWith(nowIso)) ?? hourly[0];

  return {
    location: coords,
    locationName,
    fetchedAt: new Date().toISOString(),
    current: {
      temperatureC: forecast.current.temperature_2m,
      windSpeedKn: knots(forecast.current.wind_speed_10m),
      windGustsKn: knots(forecast.current.wind_gusts_10m),
      windDirectionDeg: forecast.current.wind_direction_10m,
      pressureHpa: forecast.current.surface_pressure,
      visibilityKm: forecast.hourly.visibility?.[0] != null ? forecast.hourly.visibility[0] / 1000 : null,
      waveHeightM: currentHourly?.waveHeightM ?? null,
      wavePeriodS: currentHourly ? wavePeriodByTime.get(currentHourly.time) ?? null : null,
      weatherCode: forecast.current.weather_code,
      isDay: forecast.current.is_day === 1,
    },
    hourly,
    daily,
  };
}

/** Human-readable Slovenian description + emoji for an Open-Meteo WMO weather code. */
export function describeWeatherCode(code: number): { label: string; icon: string } {
  const map: Record<number, { label: string; icon: string }> = {
    0: { label: 'Jasno', icon: '☀️' },
    1: { label: 'Pretežno jasno', icon: '🌤️' },
    2: { label: 'Delno oblačno', icon: '⛅' },
    3: { label: 'Oblačno', icon: '☁️' },
    45: { label: 'Megla', icon: '🌫️' },
    48: { label: 'Ivje v megli', icon: '🌫️' },
    51: { label: 'Rahel rosenje', icon: '🌦️' },
    53: { label: 'Rosenje', icon: '🌦️' },
    55: { label: 'Močno rosenje', icon: '🌧️' },
    61: { label: 'Rahel dež', icon: '🌦️' },
    63: { label: 'Dež', icon: '🌧️' },
    65: { label: 'Močan dež', icon: '🌧️' },
    71: { label: 'Rahel sneg', icon: '🌨️' },
    73: { label: 'Sneg', icon: '🌨️' },
    75: { label: 'Močan sneg', icon: '❄️' },
    80: { label: 'Plohe', icon: '🌦️' },
    81: { label: 'Krepke plohe', icon: '🌧️' },
    82: { label: 'Silovite plohe', icon: '⛈️' },
    95: { label: 'Nevihta', icon: '⛈️' },
    96: { label: 'Nevihta s točo', icon: '⛈️' },
    99: { label: 'Huda nevihta s točo', icon: '⛈️' },
  };
  return map[code] ?? { label: 'Vreme neznano', icon: '🌡️' };
}

/** Wind direction in degrees -> 16-point compass abbreviation (used in Slovenian sailing jargon too). */
export function degreesToCompass(deg: number): string {
  const dirs = [
    'S', 'SSV', 'SV', 'VSV', 'V', 'VJV', 'JV', 'JJV',
    'J', 'JJZ', 'JZ', 'ZJZ', 'Z', 'ZSZ', 'SZ', 'SSZ',
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/** Beaufort scale (0-12) estimated from wind speed in knots — very relevant for sailors. */
export function knotsToBeaufort(knotsValue: number): number {
  const thresholds = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];
  let scale = 0;
  for (const t of thresholds) {
    if (knotsValue >= t) scale += 1;
    else break;
  }
  return scale;
}
