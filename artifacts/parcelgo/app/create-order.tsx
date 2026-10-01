import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import {
  autocompletePlaces,
  createPlacesSessionToken,
  getPlaceDetails,
  googlePlacesCountryCode,
  isGooglePlacesConfigured,
  type PlaceSuggestion,
  type ResolvedPlace,
} from '@/lib/google-places';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PackageSize = 'small' | 'medium' | 'large';
type PlaceTarget = 'pickup' | 'destination';

interface PendingLocation {
  target: PlaceTarget;
  latitude: number;
  longitude: number;
}

const PACKAGE_SIZES: { value: PackageSize; label: string; detail: string }[] = [
  { value: 'small', label: 'Small', detail: 'Fits in a backpack' },
  { value: 'medium', label: 'Medium', detail: 'One-person carry' },
  { value: 'large', label: 'Large', detail: 'Needs extra space' },
];

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function friendlySaveError(error: unknown) {
  const message = errorText(error);
  if (message.includes('PGRST205') || message.includes('parcel_orders')) {
    return 'Parcel requests are not set up yet. Run supabase/migrations/0002_parcel_orders.sql in your Supabase SQL Editor.';
  }
  if (message.toLowerCase().includes('bucket') || message.includes('parcel-photos')) {
    return 'Parcel photo storage is not set up yet. Run supabase/migrations/0002_parcel_orders.sql in your Supabase SQL Editor.';
  }
  return message;
}

function PlaceSearchField({
  label,
  placeholder,
  value,
  selectedPlace,
  testID,
  onChangeText,
  onChoosePlace,
  onRequestLocation,
  locationLoading,
  colors,
}: {
  label: string;
  placeholder: string;
  value: string;
  selectedPlace: ResolvedPlace | null;
  testID: string;
  onChangeText: (text: string) => void;
  onChoosePlace: (place: ResolvedPlace) => void;
  onRequestLocation: () => void;
  locationLoading: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const sessionToken = useRef(createPlacesSessionToken());
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || selectedPlace) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);
      void autocompletePlaces(query, sessionToken.current, controller.signal)
        .then(setSuggestions)
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setSearchError(errorText(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedPlace, value]);

  const chooseSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsLoadingDetails(true);
    setSearchError(null);
    try {
      const place = await getPlaceDetails(suggestion.placeId, sessionToken.current);
      sessionToken.current = createPlacesSessionToken();
      setSuggestions([]);
      onChoosePlace(place);
    } catch (error) {
      setSearchError(errorText(error));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <View style={styles.placeField}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.placeInputWrap,
          { backgroundColor: colors.card, borderColor: selectedPlace ? colors.primary : colors.border },
        ]}
      >
        <Feather
          name={selectedPlace ? 'check-circle' : 'search'}
          size={18}
          color={selectedPlace ? colors.primary : colors.mutedForeground}
        />
        <TextInput
          accessibilityLabel={label}
          testID={testID}
          value={value}
          onChangeText={(text) => {
            setSearchError(null);
            onChangeText(text);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.placeInput, { color: colors.foreground }]}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => {
              setSuggestions([]);
              onChangeText('');
            }}
            hitSlop={8}
          >
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {selectedPlace ? (
        <Text style={[styles.selectedHint, { color: colors.primary }]}>
          Coordinates confirmed · {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
          Search for a place or use your current location.
        </Text>
      )}

      {!selectedPlace && isGooglePlacesConfigured && value.trim().length >= 3 ? (
        <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isSearching || isLoadingDetails ? (
            <View style={styles.suggestionStatus}>
              <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
                {isLoadingDetails ? 'Loading address…' : 'Searching places…'}
              </Text>
            </View>
          ) : null}
          {!isSearching && !isLoadingDetails
            ? suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.placeId}
                  accessibilityRole="button"
                  testID={`${testID}-suggestion-${suggestion.placeId}`}
                  onPress={() => void chooseSuggestion(suggestion)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    { borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <Feather name="map-pin" size={16} color={colors.primary} />
                  <View style={styles.suggestionCopy}>
                    <Text numberOfLines={1} style={[styles.suggestionTitle, { color: colors.foreground }]}>
                      {suggestion.primaryText}
                    </Text>
                    {suggestion.secondaryText ? (
                      <Text numberOfLines={1} style={[styles.suggestionSubtitle, { color: colors.mutedForeground }]}>
                        {suggestion.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            : null}
          {!isSearching && !isLoadingDetails && suggestions.length === 0 && !searchError ? (
            <View style={styles.suggestionStatus}>
              <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
                No matching places found.
              </Text>
            </View>
          ) : null}
          {searchError ? (
            <View style={styles.suggestionStatus}>
              <Text style={[styles.inputHint, { color: colors.destructive }]}>{searchError}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {!isGooglePlacesConfigured ? (
        <Text style={[styles.inputHint, { color: colors.destructive }]}>
          Place search needs a Google Places API key.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: locationLoading }}
        testID={`${testID}-use-current-location`}
        disabled={locationLoading}
        onPress={onRequestLocation}
        style={({ pressed }) => [
          styles.locationButton,
          { borderColor: colors.border, opacity: pressed || locationLoading ? 0.65 : 1 },
        ]}
      >
        <Feather name="crosshair" size={15} color={colors.primary} />
        <Text style={[styles.locationButtonText, { color: colors.primary }]}>
          {locationLoading ? 'Finding your location…' : 'Use current location'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CreateOrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [packageSize, setPackageSize] = useState<PackageSize>('small');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [pickupText, setPickupText] = useState('');
  const [pickupPlace, setPickupPlace] = useState<ResolvedPlace | null>(null);
  const [destinationText, setDestinationText] = useState('');
  const [destinationPlace, setDestinationPlace] = useState<ResolvedPlace | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [locationLoadingTarget, setLocationLoadingTarget] = useState<PlaceTarget | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);

  if (!session || profile?.role !== 'sender') {
    return <Redirect href="/" />;
  }

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);

  const requestCurrentLocation = async (target: PlaceTarget) => {
    setLocationError(null);
    setPendingLocation(null);
    setLocationLoadingTarget(target);
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          throw new Error('Location is not available in this browser.');
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
        });
        setPendingLocation({
          target,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!permission.canAskAgain) {
            setLocationError('Location access is blocked. You can enable it in device settings or search for an address.');
          } else {
            setLocationError('Allow location access to use your current location, or search for an address.');
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setPendingLocation({
          target,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    } catch (error) {
      setLocationError(
        error instanceof Error && error.message.includes('denied')
          ? 'Location access was denied. You can still search for an address.'
          : errorText(error),
      );
    } finally {
      setLocationLoadingTarget(null);
    }
  };

  const confirmCurrentLocation = async () => {
    if (!pendingLocation) return;
    const { target, latitude, longitude } = pendingLocation;
    setLocationError(null);

    let address = `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
    if (Platform.OS !== 'web') {
      try {
        const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
          const street = [result.name, result.street].filter(Boolean).join(' ');
          const locality = [result.city, result.subregion, result.region].filter(Boolean);
          const resolvedAddress = [street, ...locality].filter(Boolean).join(', ');
          if (resolvedAddress) address = resolvedAddress;
        }
      } catch {
        // Keep the coordinate label so the user can continue if device reverse-geocoding is unavailable.
      }
    }

    const place: ResolvedPlace = {
      placeId: `current-${Date.now().toString(36)}`,
      address,
      latitude,
      longitude,
    };
    if (target === 'pickup') {
      setPickupPlace(place);
      setPickupText(place.address);
    } else {
      setDestinationPlace(place);
      setDestinationText(place.address);
    }
    setPendingLocation(null);
  };

  const choosePhoto = async () => {
    setFormError(null);
    setIsPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError(
          permission.canAskAgain
            ? 'Allow photo access to attach an optional parcel image.'
            : 'Photo access is blocked. You can enable it in device settings or continue without a photo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
        setFormError('Choose an image file for the parcel photo.');
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setFormError('Choose an image smaller than 5 MB.');
        return;
      }
      setPhoto(asset);
    } catch (error) {
      setFormError(errorText(error));
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const submitOrder = async () => {
    setFormError(null);
    if (!isSupabaseConfigured || !supabase) {
      setFormError('ParcelGo is missing its Supabase configuration.');
      return;
    }
    if (!title.trim() || title.trim().length < 2) {
      setFormError('Add a short name for the parcel.');
      return;
    }
    if (!pickupPlace || !destinationPlace) {
      setFormError('Choose a pickup and destination from the search results, or confirm your current location.');
      return;
    }
    const price = Number(offeredPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Enter a delivery offer greater than zero.');
      return;
    }

    setSaving(true);
    let uploadedPhotoPath: string | null = null;
    try {
      if (photo) {
        const mimeType = photo.mimeType || 'image/jpeg';
        const extension = mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const path = `${session.user.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const bytes = await new File(photo.uri).arrayBuffer();
        const { data: upload, error: uploadError } = await supabase.storage
          .from('parcel-photos')
          .upload(path, bytes, { contentType: mimeType, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPhotoPath = upload.path;
      }

      const { data, error } = await supabase
        .from('parcel_orders')
        .insert({
          sender_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          package_size: packageSize,
          pickup_address: pickupPlace.address,
          pickup_latitude: pickupPlace.latitude,
          pickup_longitude: pickupPlace.longitude,
          destination_address: destinationPlace.address,
          destination_latitude: destinationPlace.latitude,
          destination_longitude: destinationPlace.longitude,
          offered_price: price,
          photo_path: uploadedPhotoPath,
        })
        .select('id')
        .single();

      if (error) throw error;
      setSavedOrderId(data.id);
    } catch (error) {
      if (uploadedPhotoPath) {
        const { error: cleanupError } = await supabase.storage
          .from('parcel-photos')
          .remove([uploadedPhotoPath]);
        if (cleanupError) console.warn('Could not remove an unused parcel photo.', cleanupError.message);
      }
      setFormError(friendlySaveError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 12, paddingBottom: bottomPadding + 24 },
        ]}
        bottomOffset={28}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="create-order-back"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={19} color={colors.foreground} />
          </Pressable>
          <View style={styles.topBarCopy}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>SENDER · NEW REQUEST</Text>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              Add a parcel
            </Text>
          </View>
          <View style={[styles.topBarMark, { backgroundColor: colors.secondary }]}>
            <Feather name="package" size={18} color={colors.primary} />
          </View>
        </View>

        {savedOrderId ? (
          <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="check" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Parcel request created</Text>
            <Text style={[styles.successCopy, { color: colors.mutedForeground }]}>
              Your request is saved. Nearby courier matching will be available in a later step.
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="create-order-done"
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Back to home</Text>
              <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              Tell us what you’re sending, then set where it should be picked up and delivered.
            </Text>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionNumber, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.sectionNumberText, { color: colors.primary }]}>01</Text>
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Route</Text>
                  <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
                    Select a place to confirm its exact coordinates.
                  </Text>
                </View>
              </View>

              <PlaceSearchField
                label="Pickup"
                placeholder="Search an address or place"
                value={pickupText}
                selectedPlace={pickupPlace}
                testID="pickup-input"
                colors={colors}
                locationLoading={locationLoadingTarget === 'pickup'}
                onChangeText={(text) => {
                  setPickupText(text);
                  setPickupPlace(null);
                }}
                onChoosePlace={(place) => {
                  setPickupText(place.address);
                  setPickupPlace(place);
                  setPendingLocation(null);
                }}
                onRequestLocation={() => void requestCurrentLocation('pickup')}
              />

              <View style={[styles.routeLine, { backgroundColor: colors.border }]} />

              <PlaceSearchField
                label="Destination"
                placeholder="Where should it be delivered?"
                value={destinationText}
                selectedPlace={destinationPlace}
                testID="destination-input"
                colors={colors}
                locationLoading={locationLoadingTarget === 'destination'}
                onChangeText={(text) => {
                  setDestinationText(text);
                  setDestinationPlace(null);
                }}
                onChoosePlace={(place) => {
                  setDestinationText(place.address);
                  setDestinationPlace(place);
                  setPendingLocation(null);
                }}
                onRequestLocation={() => void requestCurrentLocation('destination')}
              />

              {pendingLocation ? (
                <View style={[styles.confirmLocation, { backgroundColor: colors.secondary }]}>
                  <Feather name="map-pin" size={17} color={colors.primary} />
                  <View style={styles.confirmCopy}>
                    <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
                      Use this device location?
                    </Text>
                    <Text style={[styles.confirmAddress, { color: colors.mutedForeground }]}>
                      {pendingLocation.latitude.toFixed(5)}, {pendingLocation.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    testID="confirm-current-location"
                    onPress={() => void confirmCurrentLocation()}
                    style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.confirmButtonText, { color: colors.primaryForeground }]}>Use it</Text>
                  </Pressable>
                </View>
              ) : null}
              {locationError ? (
                <View style={styles.inlineError}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{locationError}</Text>
                  {locationError.includes('device settings') ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (Platform.OS !== 'web') void Linking.openSettings().catch(() => undefined);
                      }}
                    >
                      <Text style={[styles.settingsLink, { color: colors.primary }]}>Open settings</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <Text style={[styles.countryHint, { color: colors.mutedForeground }]}>
                Place search is filtered to {googlePlacesCountryCode.toUpperCase()}.
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionNumber, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.sectionNumberText, { color: colors.primary }]}>02</Text>
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Parcel details</Text>
                  <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
                    Help the courier know what to expect.
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>What are you sending?</Text>
              <TextInput
                accessibilityLabel="Parcel name"
                testID="parcel-title-input"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Documents, a small gift"
                placeholderTextColor={colors.mutedForeground}
                maxLength={80}
                returnKeyType="next"
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                ]}
              />

              <Text style={[styles.fieldLabel, styles.spacedLabel, { color: colors.foreground }]}>
                Add a note <Text style={{ color: colors.mutedForeground }}>(optional)</Text>
              </Text>
              <TextInput
                accessibilityLabel="Parcel note"
                testID="parcel-description-input"
                value={description}
                onChangeText={setDescription}
                placeholder="Anything the courier should know?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={300}
                textAlignVertical="top"
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                ]}
              />

              <Text style={[styles.fieldLabel, styles.spacedLabel, { color: colors.foreground }]}>
                Package size
              </Text>
              <View style={styles.sizeOptions}>
                {PACKAGE_SIZES.map((option) => {
                  const selected = packageSize === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      testID={`package-size-${option.value}`}
                      onPress={() => setPackageSize(option.value)}
                      style={({ pressed }) => [
                        styles.sizeOption,
                        {
                          backgroundColor: selected ? colors.secondary : colors.background,
                          borderColor: selected ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.sizeLabel, { color: selected ? colors.primary : colors.foreground }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.sizeDetail, { color: colors.mutedForeground }]}>{option.detail}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, styles.spacedLabel, { color: colors.foreground }]}>
                Your delivery offer
              </Text>
              <View style={[styles.priceInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currency, { color: colors.mutedForeground }]}>₹</Text>
                <TextInput
                  accessibilityLabel="Delivery offer in rupees"
                  testID="parcel-price-input"
                  value={offeredPrice}
                  onChangeText={(text) => setOfferedPrice(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  style={[styles.priceInput, { color: colors.foreground }]}
                />
                <Text style={[styles.currencyCode, { color: colors.mutedForeground }]}>INR</Text>
              </View>

              <Text style={[styles.fieldLabel, styles.spacedLabel, { color: colors.foreground }]}>
                Parcel photo <Text style={{ color: colors.mutedForeground }}>(optional)</Text>
              </Text>
              {photo ? (
                <View style={[styles.photoPreview, { borderColor: colors.border }]}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} accessibilityLabel="Selected parcel photo" />
                  <View style={styles.photoDetails}>
                    <Text numberOfLines={1} style={[styles.photoName, { color: colors.foreground }]}>
                      {photo.fileName || 'Parcel photo'}
                    </Text>
                    <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
                      {photo.fileSize ? `${(photo.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Ready to upload'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove parcel photo"
                    testID="remove-parcel-photo"
                    onPress={() => setPhoto(null)}
                    hitSlop={8}
                  >
                    <Feather name="x-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  testID="choose-parcel-photo"
                  disabled={isPickingPhoto}
                  onPress={() => void choosePhoto()}
                  style={({ pressed }) => [
                    styles.photoPicker,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      opacity: pressed || isPickingPhoto ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={[styles.photoPickerIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={isPickingPhoto ? 'loader' : 'image'} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.photoPickerCopy}>
                    <Text style={[styles.photoPickerTitle, { color: colors.foreground }]}>
                      {isPickingPhoto ? 'Opening photos…' : 'Add a parcel photo'}
                    </Text>
                    <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
                      JPG, PNG or HEIC · up to 5 MB
                    </Text>
                  </View>
                  <Feather name="plus" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {formError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
                <Feather name="alert-circle" size={17} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              testID="submit-parcel-order"
              disabled={saving}
              onPress={() => void submitOrder()}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || saving ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {saving ? 'Creating request…' : 'Create parcel request'}
              </Text>
              <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
            </Pressable>
            <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
              Your pickup details are shared only to arrange this delivery.
            </Text>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, gap: 15 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBarCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  screenTitle: { fontSize: 25, letterSpacing: -0.7, fontFamily: 'Inter_700Bold' },
  topBarMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  intro: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  sectionCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 11 },
  sectionHeading: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 3 },
  sectionNumber: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionNumberText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sectionDescription: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  placeField: { gap: 7 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  placeInputWrap: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeInput: { minHeight: 48, flex: 1, paddingVertical: 9, fontSize: 12, fontFamily: 'Inter_400Regular' },
  inputHint: { fontSize: 9, lineHeight: 14, fontFamily: 'Inter_400Regular' },
  selectedHint: { fontSize: 9, lineHeight: 14, fontFamily: 'Inter_500Medium' },
  suggestions: { borderWidth: 1, borderRadius: 13, overflow: 'hidden' },
  suggestionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  suggestionCopy: { flex: 1, gap: 3 },
  suggestionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  suggestionSubtitle: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  suggestionStatus: { padding: 12 },
  locationButton: { alignSelf: 'flex-start', minHeight: 34, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationButtonText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  routeLine: { height: 1, marginLeft: 9, marginVertical: 1 },
  countryHint: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 1 },
  confirmLocation: { borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  confirmCopy: { flex: 1, gap: 3 },
  confirmTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  confirmAddress: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  confirmButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  inlineError: { gap: 5 },
  settingsLink: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  textInput: { minHeight: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12, fontFamily: 'Inter_400Regular' },
  spacedLabel: { marginTop: 4 },
  multilineInput: { minHeight: 78, paddingTop: 12 },
  sizeOptions: { flexDirection: 'row', gap: 7 },
  sizeOption: { flex: 1, minHeight: 59, borderRadius: 13, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center', gap: 4 },
  sizeLabel: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  sizeDetail: { fontSize: 8, lineHeight: 11, fontFamily: 'Inter_400Regular' },
  priceInputWrap: { height: 49, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  currency: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  priceInput: { flex: 1, height: 47, paddingVertical: 8, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  currencyCode: { fontSize: 9, letterSpacing: 0.7, fontFamily: 'Inter_700Bold' },
  photoPicker: { minHeight: 68, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 10 },
  photoPickerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoPickerCopy: { flex: 1, gap: 3 },
  photoPickerTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  photoHint: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  photoPreview: { minHeight: 73, borderWidth: 1, borderRadius: 14, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  photoImage: { width: 55, height: 55, borderRadius: 10, backgroundColor: '#e8e8e8' },
  photoDetails: { flex: 1, gap: 4 },
  photoName: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  errorBanner: { borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  errorText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  submitButton: { minHeight: 54, borderRadius: 15, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  privacyNote: { textAlign: 'center', fontSize: 9, lineHeight: 14, fontFamily: 'Inter_400Regular', paddingHorizontal: 12 },
  successCard: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', gap: 11, marginTop: 20 },
  successIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 20, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  successCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 8 },
});