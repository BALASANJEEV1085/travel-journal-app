import * as Location from "expo-location";

export interface GeoFix {
  latitude: number;
  longitude: number;
  placeLabel: string | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentLocation(): Promise<GeoFix> {
  const granted = await requestLocationPermission();
  if (!granted) {
    throw new Error("Location permission was denied");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;

  let placeLabel: string | null = null;
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const r = results[0];
      placeLabel =
        [r.name, r.city ?? r.subregion, r.region, r.country]
          .filter((p): p is string => Boolean(p))
          .join(", ") || null;
    }
  } catch {
    // Reverse geocoding is best-effort; coordinates are still saved.
  }

  return { latitude, longitude, placeLabel };
}
