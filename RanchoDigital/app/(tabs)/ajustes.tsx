import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Switch, ActivityIndicator } from 'react-native';
import { User, Bell, LogOut, ChevronRight, Check, Home, Save, Mail, Scale, MessageCircle, Settings as SettingsIcon, Wifi, WifiOff, Trash2 } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { guardarCacheLocal, obtenerCacheLocal } from '@/src/services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../../src/context/NetworkContext';

const OPCIONES_COLORES = ['#2D5A27', '#1A365D', '#742A2A', '#2D3748', '#B7791F', '#553C9A'];

export default function AjustesScreen() {
  const { color, updateColor } = useTheme();
  const router = useRouter();
  const { isConnected } = useNetwork();

  const [emailUsuario, setEmailUsuario] = useState('');
  const [nombreRancho, setNombreRancho] = useState('');
  const [notisActivas, setNotisActivas] = useState(true);
  const [usarLibras, setUsarLibras] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [totalAnimales, setTotalAnimales] = useState(0);

  useEffect(() => {
    fetchPerfil();
    cargarPreferenciasLocales();
    contarAnimales();
  }, [isConnected]);

  async function cargarPreferenciasLocales() {
    const libras = await AsyncStorage.getItem('usar_libras');
    if (libras !== null) setUsarLibras(libras === 'true');
  }

  async function contarAnimales() {
    const cache = await obtenerCacheLocal('animales_cache') || [];
    setTotalAnimales(cache.length);
  }

  async function fetchPerfil() {
    if (!isConnected) {
      const emailCache = await obtenerCacheLocal('perfil_email');
      if (emailCache) setEmailUsuario(emailCache);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setEmailUsuario(user.email || '');
        await guardarCacheLocal('perfil_email', user.email || '');
        const { data } = await supabase.from('perfiles').select('nombre_rancho, notificaciones_on').eq('id', user.id).single();
        if (data) {
          setNombreRancho(data.nombre_rancho || '');
          setNotisActivas(data.notificaciones_on ?? true);
        }
      }
    } catch (error) {
      console.log('Error al cargar perfil', error);
    }
  }

  async function guardarCambios() {
    if (!isConnected) {
      Alert.alert('Modo Offline', 'Necesitas conexión para actualizar los datos del rancho.');
      return;
    }
    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('perfiles').update({ nombre_rancho: nombreRancho, notificaciones_on: notisActivas }).eq('id', session.user.id);
        Alert.alert('¡Listo, patrón!', 'Los datos del rancho se actualizaron.');
      }
    } catch (error) { console.log('Error guardando:', error); }
    setGuardando(false);
  }

  async function toggleLibras(val: boolean) {
    setUsarLibras(val);
    await AsyncStorage.setItem('usar_libras', val ? 'true' : 'false');
  }

  async function toggleNotis(val: boolean) {
    setNotisActivas(val);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isConnected) {
        await supabase.from('perfiles').update({ notificaciones_on: val }).eq('id', session.user.id);
      }
    } catch (e) { console.log(e); }
  }

  async function limpiarCache() {
    Alert.alert(
      'Limpiar Caché',
      'Esto borrará los datos guardados localmente. La próxima vez que abras la app con internet se descargarán de nuevo. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['animales_cache', 'tareas_cache', 'perfil_email', 'sync_queue']);
          setTotalAnimales(0);
          Alert.alert('Caché limpio', 'Los datos locales fueron eliminados.');
        }}
      ]
    );
  }

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        <View style={[styles.header, { backgroundColor: color }]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Configuración</Text>
            <SettingsIcon color="white" size={32} />
          </View>
        </View>

        <View style={styles.content}>

          {/* BANNER OFFLINE */}
          {!isConnected && (
            <View style={styles.offlineBanner}>
              <WifiOff color="#D97706" size={16} />
              <Text style={styles.offlineBannerText}>Modo sin conexión — algunos cambios no se guardarán en la nube</Text>
            </View>
          )}

          {/* SECCIÓN PERFIL */}
          <View style={styles.floatingCard}>
            <Text style={styles.sectionLabel}>MI GANADERÍA</Text>

            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Home size={20} color={color} />
              </View>
              <TextInput
                style={styles.input}
                value={nombreRancho}
                onChangeText={setNombreRancho}
                placeholder="Nombre de tu rancho..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={guardarCambios} style={[styles.saveBtn, { backgroundColor: color }]}>
                {guardando ? <ActivityIndicator size="small" color="white" /> : <Save size={20} color="white" />}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                <Mail size={20} color="#666" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Cuenta vinculada</Text>
                <Text style={styles.infoText}>{emailUsuario || 'Cargando...'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Text style={{ fontSize: 18 }}>🐄</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Animales registrados</Text>
                <Text style={styles.infoText}>{totalAnimales} en inventario local</Text>
              </View>
            </View>
          </View>

          {/* TEMA */}
          <Text style={styles.sectionLabelOut}>APARIENCIA DE LA APP</Text>
          <View style={styles.card}>
            <View style={styles.colorPicker}>
              {OPCIONES_COLORES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorCircle, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#000', transform: [{ scale: 1.1 }] }]}
                  onPress={() => updateColor(c)}
                  activeOpacity={0.8}
                >
                  {color === c && <Check size={20} color="white" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* PREFERENCIAS */}
          <Text style={styles.sectionLabelOut}>PREFERENCIAS</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                  <Bell size={20} color={color} />
                </View>
                <Text style={styles.settingText}>Notificaciones de Salud</Text>
              </View>
              <Switch value={notisActivas} onValueChange={toggleNotis} trackColor={{ false: '#E5E7EB', true: color }} />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Scale size={20} color="#D97706" />
                </View>
                <Text style={styles.settingText}>Peso en Libras (LBS)</Text>
              </View>
              <Switch value={usarLibras} onValueChange={toggleLibras} trackColor={{ false: '#E5E7EB', true: '#D97706' }} />
            </View>
          </View>

          {/* DATOS Y CACHÉ */}
          <Text style={styles.sectionLabelOut}>DATOS Y ALMACENAMIENTO</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRowBtn} onPress={limpiarCache}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.settingText}>Limpiar Caché Local</Text>
                  <Text style={styles.settingSubtext}>Libera espacio y reinicia datos locales</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>
          </View>

          {/* CUENTA Y AYUDA */}
          <Text style={styles.sectionLabelOut}>CUENTA Y AYUDA</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRowBtn}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                  <MessageCircle size={20} color="#16A34A" />
                </View>
                <Text style={styles.settingText}>Contactar a Soporte</Text>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRowBtn} onPress={handleLogout}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <LogOut size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingText, { color: '#EF4444', fontWeight: '800' }]}>Cerrar Sesión</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>RanchoDigital v1.0.0 • Build Premium</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 180, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 60, paddingHorizontal: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginTop: 16, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  offlineBannerText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '700' },
  floatingCard: { backgroundColor: 'white', padding: 20, borderRadius: 25, marginTop: -40, marginBottom: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, borderWidth: 1, borderColor: '#F0F0F0' },
  card: { backgroundColor: 'white', borderRadius: 25, padding: 10, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#888', marginBottom: 15, letterSpacing: 1 },
  sectionLabelOut: { fontSize: 12, fontWeight: '900', color: '#888', marginBottom: 10, marginLeft: 15, letterSpacing: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 5, marginLeft: 55 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 5 },
  input: { flex: 1, fontSize: 18, fontWeight: '800', color: '#000', paddingVertical: 10 },
  saveBtn: { padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 5, paddingVertical: 5 },
  infoLabel: { fontSize: 12, color: '#888', fontWeight: '700' },
  infoText: { fontSize: 15, color: '#000', fontWeight: '600', marginTop: 2 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  colorCircle: { width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  settingRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  settingText: { fontSize: 16, fontWeight: '700', color: '#333' },
  settingSubtext: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  version: { textAlign: 'center', color: '#BBB', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 35 },
});