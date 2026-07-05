import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { loadStoredAuth, type DriverInfo } from './src/lib/auth';
import LoginScreen from './src/screens/LoginScreen';
import TripScreen from './src/screens/TripScreen';

export type RootStackParamList = {
  Login: undefined;
  Trip: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [driver, setDriver] = useState<DriverInfo | null>(null);

  useEffect(() => {
    loadStoredAuth().then(info => {
      setDriver(info);
      setBootstrapping(false);
    });
  }, []);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {driver ? (
          <Stack.Screen name="Trip">
            {props => <TripScreen {...props} driver={driver} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
