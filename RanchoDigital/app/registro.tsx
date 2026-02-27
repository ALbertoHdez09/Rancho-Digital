import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../src/services/supabase';
import { useRouter } from 'expo-router';
import { UserPlus, Mail, Lock } from 'lucide-react-native';

export default function RegistroScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor llena todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Éxito!', 'Cuenta creada. Si activaste la confirmación, revisa tu correo.');
      router.replace('/login');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserPlus color="#2D5A27" size={60} />
        <Text style={styles.title}>Nuevo Registro</Text>
        <Text style={styles.subtitle}>Crea una cuenta para tu rancho</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail color="#666" size={20} />
          <TextInput 
            style={styles.input} 
            placeholder="Correo electrónico" 
            value={email} 
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#666" size={20} />
          <TextInput 
            style={styles.input} 
            placeholder="Contraseña" 
            value={password} 
            onChangeText={setPassword}
            secureTextEntry 
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Registrarme</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')} style={styles.link}>
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D5A27' },
  subtitle: { color: '#666', marginTop: 5 },
  form: { gap: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12 },
  input: { flex: 1, marginLeft: 10 },
  button: { backgroundColor: '#2D5A27', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  link: { marginTop: 15, alignItems: 'center' },
  linkText: { color: '#2D5A27', fontWeight: '600' }
});