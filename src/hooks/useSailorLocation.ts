import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { Coordinates } from '../types';

// Fallback: Marina Koper, Slovenia — used when location permission is denied
// or unavailable (e.g. web preview), so the rest of the app always has a
// sensible coordinate to work with.
export const DEFAULT_LOCATION: Coordinates = { latitude: 45.5469, longitude: 13.7295 };
export const DEFAULT_LOCATION_NAME = 'Marina Koper (privzeto)';

export interface SailorLocationState {
  coordinates: Coordinates;
  isDefault: boolean;
  loading: boolean;
  permissionDenied: boolean;
  refresh: () => void;
}

export function useSailorLocation(): SailorLocationState {
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_LOCATION);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setPermissionDenied(true);
            setIsDefault(true);
            setCoordinates(DEFAULT_LOCATION);
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setPermissionDenied(false);
          setIsDefault(false);
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) {
          setIsDefault(true);
          setCoordinates(DEFAULT_LOCATION);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    coordinates,
    isDefault,
    loading,
    permissionDenied,
    refresh: () => setTick((t) => t + 1),
  };
}
