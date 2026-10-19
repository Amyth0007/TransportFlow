import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { login, type DriverInfo } from '../lib/auth';
import { colors, radius } from '../lib/theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLoginSuccess: (info: DriverInfo) => void;
};

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!phone || !password) {
      setError('Phone and password are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const info = await login(phone, password);
      onLoginSuccess(info);
    } catch {
      setError('Invalid phone number or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.kicker}>DRIVER</Text>
        <Text style={styles.title}>TransportFlow</Text>
        <Text style={styles.subtitle}>Sign in with the phone and password your manager set.</Text>

        <View style={styles.card}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.mute}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.mute}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.ink} />
              : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  kicker: { color: colors.cyan, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
  title: { color: colors.sand, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.mute, fontSize: 14, lineHeight: 20, marginBottom: 28 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { color: colors.mute, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  error: { color: colors.coral, fontSize: 13, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink2,
    color: colors.sand,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    backgroundColor: colors.cyan,
    borderRadius: radius.control,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
