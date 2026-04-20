import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAyyTfTaPeCXBPWnlcUPJTP8h5hbgoFiOw';

function App() {
  const mapRef = useRef<MapView | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [locationStatus, setLocationStatus] = useState('Requesting permission...');
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);

  useEffect(() => {
    const requestAndLocateUser = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setLocationStatus('Location permission not granted');
        return;
      }

      setLocationStatus('Fetching current location...');

      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setCurrentCoords({ latitude, longitude });
          setLocationStatus('Current location received');

          mapRef.current?.animateCamera(
            {
              center: { latitude, longitude },
              zoom: 15,
            },
            { duration: 1000 },
          );
        },
        error => {
          setLocationStatus(`Location error: ${error.message}`);
          Alert.alert('Location Error', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );

      watchIdRef.current = Geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setCurrentCoords({ latitude, longitude });
          setLocationStatus('Live location updates active');
        },
        error => {
          setLocationStatus(`Live update error: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    };

    requestAndLocateUser();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      Geolocation.stopObserving();
    };
  }, []);

  useEffect(() => {
    if (!currentCoords || !selectedPlace || routeCoords.length > 0) {
      return;
    }

    fetchAndDrawRoute(currentCoords, {
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
    });
  }, [currentCoords, selectedPlace, routeCoords.length]);

  const fetchAndDrawRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ) => {
    try {
      setLocationStatus('Fetching route from A to B...');

      const url =
        'https://maps.googleapis.com/maps/api/directions/json?' +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes?.length) {
        setLocationStatus(`Route error: ${data.status || 'UNKNOWN'}`);
        return;
      }

      const encodedPoints = data.routes[0]?.overview_polyline?.points;
      if (!encodedPoints) {
        setLocationStatus('Route error: No polyline points returned');
        return;
      }

      const decodedRoute = decodePolyline(encodedPoints);
      setRouteCoords(decodedRoute);
      setLocationStatus('Route ready');

      mapRef.current?.fitToCoordinates(decodedRoute, {
        edgePadding: {
          top: 160,
          right: 40,
          bottom: 180,
          left: 40,
        },
        animated: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch route';
      setLocationStatus(`Route error: ${message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <GooglePlacesAutocomplete
          placeholder="Search pickup/drop address"
          fetchDetails
          enablePoweredByContainer={false}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
          }}
          onPress={(data, details = null) => {
            const location = details?.geometry?.location;

            if (!location) {
              return;
            }

            const latitude = location.lat;
            const longitude = location.lng;

            setSelectedPlace({
              name: data.description,
              latitude,
              longitude,
            });

            setRouteCoords([]);

            mapRef.current?.animateCamera(
              {
                center: { latitude, longitude },
                zoom: 16,
              },
              { duration: 900 },
            );
          }}
          styles={{
            textInput: styles.searchInput,
            listView: styles.suggestionsList,
            row: styles.suggestionRow,
            description: styles.suggestionText,
          }}
          textInputProps={{
            placeholderTextColor: '#6b7280',
          }}
          keyboardShouldPersistTaps="handled"
          debounce={250}
        />
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {currentCoords ? (
          <Marker
            coordinate={{
              latitude: currentCoords.latitude,
              longitude: currentCoords.longitude,
            }}
            title="Current Location"
            pinColor="#16a34a"
          />
        ) : null}

        {selectedPlace ? (
          <Marker
            coordinate={{
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
            }}
            title={selectedPlace.name}
          />
        ) : (
          <Marker
            coordinate={{
              latitude: 28.6139,
              longitude: 77.209,
            }}
            title="Delhi"
          />
        )}

        {routeCoords.length > 1 ? (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#1d4ed8"
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>Location Debug</Text>
        <Text style={styles.debugText}>{locationStatus}</Text>
        <Text style={styles.debugText}>
          {currentCoords
            ? `Lat: ${currentCoords.latitude.toFixed(6)}, Lng: ${currentCoords.longitude.toFixed(6)}`
            : 'Coords: not available yet'}
        </Text>
      </View>
    </View>
  );
}

function decodePolyline(encoded: string) {
  const coordinates: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

async function requestLocationPermission() {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    if (status === 'denied' || status === 'restricted') {
      Alert.alert(
        'Location Permission Needed',
        'Please allow location access from iOS Settings to fetch your current position.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }],
      );
    }
    return status === 'granted';
  }

  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  if (alreadyGranted) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'We need your location to center the map around you.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );

  if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Alert.alert(
      'Location Permission Needed',
      'Location permission is set to "Don\'t ask again". Please enable it manually in Android Settings.',
      [{ text: 'Open Settings', onPress: () => Linking.openSettings() }],
    );
  }

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 20,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  searchInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 15,
    paddingHorizontal: 12,
  },
  suggestionsList: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 220,
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  suggestionText: {
    color: '#111827',
    fontSize: 14,
  },
  debugCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 10,
    borderRadius: 10,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default App;
