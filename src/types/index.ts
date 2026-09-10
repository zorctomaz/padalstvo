export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A vessel shown on the AIS map, either a real AIS contact or our own boat. */
export interface Boat {
  id: string;
  mmsi: string;
  name: string;
  type: BoatType;
  coordinates: Coordinates;
  /** True heading / course over ground in degrees (0-359). */
  heading: number;
  speedKnots: number;
  lengthMeters?: number;
  callSign?: string;
  /** Whether the skipper opted in to receive direct messages from other sailors. */
  isRegisteredForMessages: boolean;
  lastUpdate: string; // ISO timestamp
}

export type BoatType =
  | 'sailboat'
  | 'motorboat'
  | 'catamaran'
  | 'cargo'
  | 'fishing'
  | 'passenger';

export interface ChatMessage {
  id: string;
  boatId: string;
  text: string;
  timestamp: string; // ISO timestamp
  fromMe: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}

export interface Conversation {
  boat: Boat;
  messages: ChatMessage[];
}

/** Current + short forecast weather relevant to sailors. */
export interface MarineWeather {
  location: Coordinates;
  locationName: string;
  fetchedAt: string;
  current: {
    temperatureC: number;
    windSpeedKn: number;
    windGustsKn: number;
    windDirectionDeg: number;
    pressureHpa: number;
    visibilityKm: number | null;
    waveHeightM: number | null;
    wavePeriodS: number | null;
    weatherCode: number;
    isDay: boolean;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface HourlyForecast {
  time: string; // ISO timestamp
  temperatureC: number;
  windSpeedKn: number;
  windGustsKn: number;
  windDirectionDeg: number;
  waveHeightM: number | null;
  precipitationProbability: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string; // ISO date
  tempMinC: number;
  tempMaxC: number;
  windSpeedMaxKn: number;
  windGustsMaxKn: number;
  waveHeightMaxM: number | null;
  weatherCode: number;
  sunrise: string;
  sunset: string;
}
