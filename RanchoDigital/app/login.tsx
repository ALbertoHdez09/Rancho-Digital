import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { supabase } from '../src/services/supabase';
import { COLORS } from '../src/constants/Colors';
import { LogIn, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.inner}>
        {/* Aquí irá el logo de tu rancho más adelante */}
        <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>RD</Text>
            </View>
          <Text style={styles.title}>Rancho Digital</Text>
          <Text style={styles.subtitle}>Gestión Ganadera Profesional</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
            style={[styles.button, { backgroundColor: COLORS.primary }]} 
            onPress={signInWithEmail}
            disabled={loading}
        >
          <LogIn size={20} color="white" />
          <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Iniciar Sesión'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/registro')} 
          style={{ marginTop: 20, marginVertical: 30, alignItems: 'center' }}
        >
          <Text style={{ color: '#2D5A27', fontWeight: 'bold', fontSize: 17 }}>
            ¿No tienes cuenta? Regístrate aquí
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton}>
          <Image 
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
            style={styles.googleIcon} 
          />
          <Text style={styles.googleButtonText}>Entrar con Google</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>¿Olvidaste tu contraseña o necesitas acceso?</Text>
        <Text style={styles.footerLink}>Contacta al Administrador</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  inner: { flex: 1, padding: 30, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoPlaceholder: { 
    width: 80, height: 80, borderRadius: 20, 
    backgroundColor: '#2D5A27', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15
  },
  logoText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  subtitle: { fontSize: 16, color: '#8E8E93', marginTop: 5 },
  inputContainer: { marginBottom: 20 },
  input: { 
    backgroundColor: '#F2F2F7', padding: 18, borderRadius: 12, 
    marginBottom: 15, fontSize: 16 
  },
  button: { 
    flexDirection: 'row', height: 55, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15 
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 10 },
  googleButton: { 
    flexDirection: 'row', height: 55, borderRadius: 12, borderWidth: 1, 
    borderColor: '#D1D1D6', justifyContent: 'center', alignItems: 'center' 
  },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  googleButtonText: { color: '#1C1C1E', fontSize: 16, fontWeight: '500' },
  footerText: { textAlign: 'center', color: '#8E8E93', marginTop: 30 },
  footerLink: { textAlign: 'center', color: '#2D5A27', fontWeight: 'bold', marginTop: 5 }
});