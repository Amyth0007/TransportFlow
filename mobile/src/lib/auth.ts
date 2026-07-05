import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from './api';

const TOKEN_KEY = 'tf_driver_token';
const DRIVER_KEY = 'tf_driver_info';

export interface DriverInfo {
  _id: string;
  name: string;
  phone: string;
  licenseNumber: string;
}

export async function login(phone: string, password: string): Promise<DriverInfo> {
  const res = await api.post<{ data: { token: string; driver: DriverInfo } }>(
    '/auth/driver/login',
    { phone, password }
  );
  const { token, driver } = res.data.data;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
  setAuthToken(token);
  return driver;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(DRIVER_KEY);
  setAuthToken(null);
}

export async function loadStoredAuth(): Promise<DriverInfo | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const driverJson = await AsyncStorage.getItem(DRIVER_KEY);
  if (!token || !driverJson) return null;
  setAuthToken(token);
  return JSON.parse(driverJson) as DriverInfo;
}
