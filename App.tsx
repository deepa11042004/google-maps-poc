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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

function App() {
  const mapRef = useRef<MapView | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [locationStatus, setLocationStatus] = useState('Requesting permission...');
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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

  return (
    <View style={styles.container}>
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
        <Marker
          coordinate={{
            latitude: 28.6139,
            longitude: 77.209,
          }}
          title="Delhi"
        />
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
