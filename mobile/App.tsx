import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { loadStoredAuth, type DriverInfo } from './src/lib/auth';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TripScreen from './src/screens/TripScreen';
import { colors } from './src/lib/theme';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Trip: { tripId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [driver, setDriver] = useState<DriverInfo | null>(null);

  useEffect(() => {
    async function boot() {
      const info = await loadStoredAuth();
      setDriver(info);
      setBootstrapping(false);
    }
    void boot();
  }, []);

  if (bootstrapping) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink }}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ink },
          }}
        >
          {driver === null ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLoginSuccess={(info) => setDriver(info)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home">
                {(props) => (
                  <HomeScreen {...props} driver={driver} onLogoutSuccess={() => setDriver(null)} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Trip" component={TripScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
