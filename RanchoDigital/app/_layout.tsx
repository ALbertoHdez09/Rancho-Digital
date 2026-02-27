import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../src/services/supabase';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '@/src/context/ThemeContext';


export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Escuchar cambios en la sesión (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

useEffect(() => {
    if (!initialized) return;

    // Convertimos a string para que TypeScript no se ponga delicado
    const currentSegment = segments[0] as string;

    if (!session && currentSegment !== 'login') {
      // Si no hay sesión y no estoy en login, mando a login
      router.replace('/login' as any);
    } else if (session && currentSegment === 'login') {
      // Si hay sesión y estoy en login, mando a las pestañas
      router.replace('/(tabs)' as any);
    }
  }, [session, initialized, segments]);
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}