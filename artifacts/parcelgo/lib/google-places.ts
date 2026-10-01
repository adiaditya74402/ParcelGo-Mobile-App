export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

export interface ResolvedPlace {
  placeId: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface CachedSuggestions {
  savedAt: number;
  items: PlaceSuggestion[];
}

const suggestionsCache = new Map<string, CachedSuggestions>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 24;

export const googlePlacesCountryCode = (
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_COUNTRY_CODE || 'in'
).trim().toLowerCase();

export const isGooglePlacesConfigured = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);

function getApiKey() {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('Place search is not configured. Add the Google Places API key in Replit Secrets.');
  }
  return key;
}

export function createPlacesSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readErrorMessage(body: unknown, fallback: string) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return fallback;
}

export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const normalizedInput = input.trim();
  if (normalizedInput.length < 3) return [];

  const cacheKey = `${googlePlacesCountryCode}:${normalizedInput.toLowerCase()}`;
  const cached = suggestionsCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
    },
    body: JSON.stringify({
      input: normalizedInput,
      sessionToken,
      includedRegionCodes: [googlePlacesCountryCode],
      languageCode: 'en',
    }),
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readErrorMessage(body, 'Could not search places. Check the Google Places API setup.'));
  }

  const suggestions =
    typeof body === 'object' && body !== null && 'suggestions' in body && Array.isArray(body.suggestions)
      ? body.suggestions
      : [];

  const results = suggestions.flatMap((item): PlaceSuggestion[] => {
    if (typeof item !== 'object' || item === null || !('placePrediction' in item)) return [];
    const prediction = item.placePrediction;
    if (typeof prediction !== 'object' || prediction === null) return [];

    const placeId = 'placeId' in prediction && typeof prediction.placeId === 'string'
      ? prediction.placeId
      : '';
    if (!placeId) return [];

    const text = 'text' in prediction ? prediction.text : null;
    const primaryText =
      typeof text === 'object' && text !== null && 'text' in text && typeof text.text === 'string'
        ? text.text
        : '';
    const structured =
      'structuredFormat' in prediction ? prediction.structuredFormat : null;
    const secondaryText =
      typeof structured === 'object' &&
      structured !== null &&
      'secondaryText' in structured &&
      typeof structured.secondaryText === 'object' &&
      structured.secondaryText !== null &&
      'text' in structured.secondaryText &&
      typeof structured.secondaryText.text === 'string'
        ? structured.secondaryText.text
        : '';

    return [{ placeId, primaryText: primaryText || secondaryText, secondaryText }];
  });

  suggestionsCache.set(cacheKey, { savedAt: Date.now(), items: results });
  if (suggestionsCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = suggestionsCache.keys().next().value;
    if (oldestKey) suggestionsCache.delete(oldestKey);
  }
  return results;
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<ResolvedPlace> {
  const query = new URLSearchParams({ sessionToken });
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${query.toString()}`,
    {
      headers: {
        'X-Goog-Api-Key': getApiKey(),
        'X-Goog-FieldMask': 'id,formattedAddress,displayName,location',
      },
    },
  );
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readErrorMessage(body, 'Could not load that place. Please choose another result.'));
  }

  if (typeof body !== 'object' || body === null) {
    throw new Error('Google Places returned an invalid place.');
  }
  const location = 'location' in body ? body.location : null;
  const address =
    'formattedAddress' in body && typeof body.formattedAddress === 'string'
      ? body.formattedAddress
      : '';
  if (
    typeof location !== 'object' ||
    location === null ||
    !('latitude' in location) ||
    !('longitude' in location) ||
    typeof location.latitude !== 'number' ||
    typeof location.longitude !== 'number' ||
    !address
  ) {
    throw new Error('Google Places did not return an address and map coordinates.');
  }

  return {
    placeId,
    address,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}