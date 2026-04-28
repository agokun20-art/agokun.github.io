import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type Coords = { lat: number; lon: number };

export async function getCurrentCoords(): Promise<Coords | null> {
  // Web fallback — expo-location also works on web but browser API is more reliable
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000, maximumAge: 60_000 }
      );
    });
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: loc.coords.latitude, lon: loc.coords.longitude };
  } catch {
    return null;
  }
}
