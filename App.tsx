import React, { useEffect, useRef } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

function App() {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const requestAndLocateUser = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;

          mapRef.current?.animateCamera(
            {
              center: { latitude, longitude },
              zoom: 15,
            },
            { duration: 1000 },
          );
        },
        error => {
          Alert.alert('Location Error', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    };

    requestAndLocateUser();
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
    </View>
  );
}

async function requestLocationPermission() {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
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

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default App;
