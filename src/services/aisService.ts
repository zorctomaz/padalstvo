import type { Boat, BoatType, Coordinates } from '../types';

/**
 * AIS ("Automatic Identification System") is the marine traffic feed sailors use
 * to see nearby vessels. A real feed (e.g. https://aisstream.io, a local NMEA/AIS
 * receiver, or a marine traffic API) can be dropped in later behind this same
 * `AisProvider` interface — screens only depend on the interface, never on how
 * the boats were produced.
 */
export interface AisProvider {
  /** One-shot fetch of vessels currently near `center`. */
  getNearbyBoats(center: Coordinates, radiusNm: number): Promise<Boat[]>;
  /** Subscribe to periodic position updates; returns an unsubscribe function. */
  subscribe(
    center: Coordinates,
    radiusNm: number,
    onUpdate: (boats: Boat[]) => void,
  ): () => void;
  /** Synchronous lookup of a previously-seen vessel by id, e.g. for a chat header. */
  getKnownBoat(id: string): Boat | undefined;
}

const BOAT_NAMES = [
  'Vesna', 'Morska Vila', 'Argonavt', 'Kaja II', 'Sirena',
  'Galeb', 'Adrija', 'Delfin', 'Severni Veter', 'Burja',
  'Jadran', 'Mistral', 'Poseidon', 'Zora', 'Mornar',
  'Val', 'Fortuna', 'Nixe', 'Libertas', 'Piran',
];

const BOAT_TYPES: BoatType[] = ['sailboat', 'sailboat', 'sailboat', 'motorboat', 'catamaran', 'fishing'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nmToDegreesLat(nm: number): number {
  return nm / 60;
}

function nmToDegreesLon(nm: number, atLatitudeDeg: number): number {
  const latRad = (atLatitudeDeg * Math.PI) / 180;
  return nm / (60 * Math.cos(latRad));
}

function randomMmsi(): string {
  // Real MMSIs start with a 3-digit MID; 238 = Slovenia, 247 = Italy, 272 = Croatia region etc.
  const mids = ['238', '247', '272', '224', '237'];
  const rest = Math.floor(100000 + Math.random() * 900000);
  return `${pick(mids)}${rest}`;
}

function makeBoat(id: string, center: Coordinates): Boat {
  const distanceNm = randomBetween(0.2, 6);
  const bearing = randomBetween(0, 360);
  const bearingRad = (bearing * Math.PI) / 180;
  const dLat = nmToDegreesLat(distanceNm) * Math.cos(bearingRad);
  const dLon = nmToDegreesLon(distanceNm, center.latitude) * Math.sin(bearingRad);

  const type = pick(BOAT_TYPES);
  return {
    id,
    mmsi: randomMmsi(),
    name: pick(BOAT_NAMES),
    type,
    coordinates: {
      latitude: center.latitude + dLat,
      longitude: center.longitude + dLon,
    },
    heading: Math.round(randomBetween(0, 359)),
    speedKnots: Math.round(randomBetween(type === 'sailboat' ? 0 : 2, type === 'cargo' ? 18 : 9) * 10) / 10,
    lengthMeters: type === 'sailboat' ? Math.round(randomBetween(8, 15)) : Math.round(randomBetween(6, 12)),
    callSign: `S5${Math.floor(1000 + Math.random() * 9000)}`,
    isRegisteredForMessages: Math.random() > 0.35,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Deterministic-ish mock AIS provider: generates a plausible cluster of nearby
 * boats around the sailor's position and gently drifts them on each tick, so the
 * map/list feel alive without needing a real AIS feed for this first version.
 */
class MockAisProvider implements AisProvider {
  private boats: Boat[] = [];

  async getNearbyBoats(center: Coordinates, radiusNm: number): Promise<Boat[]> {
    if (this.boats.length === 0) {
      const count = Math.round(randomBetween(6, 12));
      this.boats = Array.from({ length: count }, (_, i) => makeBoat(`boat-${i}`, center));
    }
    return this.boats.filter((b) => withinRadius(center, b.coordinates, radiusNm));
  }

  subscribe(center: Coordinates, radiusNm: number, onUpdate: (boats: Boat[]) => void): () => void {
    let cancelled = false;

    this.getNearbyBoats(center, radiusNm).then((boats) => {
      if (!cancelled) onUpdate(boats);
    });

    const interval = setInterval(() => {
      this.boats = this.boats.map((boat) => driftBoat(boat));
      if (!cancelled) {
        onUpdate(this.boats.filter((b) => withinRadius(center, b.coordinates, radiusNm)));
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }

  getKnownBoat(id: string): Boat | undefined {
    return this.boats.find((b) => b.id === id);
  }
}

function driftBoat(boat: Boat): Boat {
  const headingJitter = randomBetween(-8, 8);
  const heading = (boat.heading + headingJitter + 360) % 360;
  const distanceNm = (boat.speedKnots * (4 / 3600)) || 0.002; // ~4s tick
  const bearingRad = (heading * Math.PI) / 180;
  const dLat = nmToDegreesLat(distanceNm) * Math.cos(bearingRad);
  const dLon = nmToDegreesLon(distanceNm, boat.coordinates.latitude) * Math.sin(bearingRad);

  return {
    ...boat,
    heading: Math.round(heading),
    coordinates: {
      latitude: boat.coordinates.latitude + dLat,
      longitude: boat.coordinates.longitude + dLon,
    },
    lastUpdate: new Date().toISOString(),
  };
}

function withinRadius(center: Coordinates, point: Coordinates, radiusNm: number): boolean {
  return distanceNm(center, point) <= radiusNm;
}

export function distanceNm(a: Coordinates, b: Coordinates): number {
  const R_NM = 3440.065; // Earth radius in nautical miles
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R_NM * c;
}

export const aisProvider: AisProvider = new MockAisProvider();
