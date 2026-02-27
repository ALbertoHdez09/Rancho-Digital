import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Palette, User, Bell, LogOut, ChevronRight, Check } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';

const OPCIONES_COLORES = ['#2D5A27', '#1A365D', '#742A2A', '#2D3748', '#B7791F', '#553C9A'];

export default function AjustesScreen() {
  const { color, updateColor } = useTheme();

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Salir', 
        style: 'destructive', 
        onPress: async () => await supabase.auth.signOut() 
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: color, borderBottomWidth: 2 }]}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <Text style={styles.headerSubtitle}>Personaliza tu Rancho Digital</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta y Seguridad</Text>
        <OptionItem icon={<User size={20} color={color} />} label="Perfil del Rancho" />
        <OptionItem icon={<Bell size={20} color={color} />} label="Notificaciones de Salud" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identidad Visual (Color)</Text>
        <View style={styles.colorCard}>
          <View style={styles.colorPicker}>
            {OPCIONES_COLORES.map((c) => (
              <TouchableOpacity 
                key={c}
                style={[styles.colorCircle, { backgroundColor: c }]}
                onPress={() => updateColor(c)}
              >
                {color === c && <Check size={20} color="white" />}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.colorInfo}>Selecciona el color que representa a tu ganadería.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versión 1.0.0 Beta - Rancho Digital</Text>
    </ScrollView>
  );
}

const OptionItem = ({ icon, label }: { icon: any, label: string }) => (
  <TouchableOpacity style={styles.option}>
    <View style={styles.optionLeft}>
      <View style={styles.iconWrapper}>{icon}</View>
      <Text style={styles.optionLabel}>{label}</Text>
    </View>
    <ChevronRight size={20} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 25, paddingTop: 60, backgroundColor: 'white' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  headerSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 },
  option: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 35, alignItems: 'center' },
  optionLabel: { marginLeft: 10, fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
  colorCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 2 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorInfo: { fontSize: 12, color: '#8E8E93', textAlign: 'center', fontStyle: 'italic' },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 15,
    marginTop: 10
  },
  logoutText: { color: '#FF3B30', marginLeft: 10, fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: '#BDBDBD', fontSize: 12, marginTop: 40, marginBottom: 40 }
});