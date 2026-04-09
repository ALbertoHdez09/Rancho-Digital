import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import "react-native-url-polyfill/auto";

// 1. Configuramos el "almacén" seguro para que la sesión no se borre
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// 2. Tus credenciales reales
const supabaseUrl = "https://ompeukbzjybtdbaarsmt.supabase.co";
const supabaseAnonKey = "sb_publishable_rzcG2Jipml2flSFJSruViw_MTKr1ZbI";

// 3. Creamos el cliente con el "candado" de sesión activado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});