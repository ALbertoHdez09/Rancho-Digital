import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { ChevronLeft, Syringe, Calendar, Stethoscope } from 'lucide-react-native';

// 🛡️ 1. IMPORTAMOS NUESTRO ARSENAL OFFLINE
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../../src/services/offlineService';

export default function DetalleSaludAnimal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { color } = useTheme();

  // 🛡️ 2. INVOCAMOS AL VIGILANTE
  const { isConnected } = useNetwork();

  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalInfo, setAnimalInfo] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) fetchTratamientosAnimal();
    }, [id, isConnected]) // Agregamos isConnected para que reaccione si cambia la red
  );

  async function fetchTratamientosAnimal() {
    try {
      setLoading(true);
      
      if (isConnected) {
        // 🟢 PLAN A: HAY INTERNET (Supabase)
        // Traemos info del animal para el título
        const { data: animalData } = await supabase.from('animales').select('arete_siniiga, nombre').eq('id', id).single();
        if (animalData) setAnimalInfo(animalData);

        // Traemos TODOS los tratamientos (pendientes y completados) de este animal
        const { data: dosis } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, nombre_plan, tipo )`)
          .eq('planes_medicos.animal_id', id)
          .order('fecha_programada', { ascending: false });

        setRegistros(dosis || []);
        
        // 💾 Guardamos una copia exacta en la memoria local para esta vaca específica
        await guardarCacheLocal(`historial_salud_${id}`, dosis || []);
        
      } else {
        // 🔴 PLAN B: NO HAY INTERNET (Caché Local)
        console.log("Cargando historial de salud offline...");
        
        // 1. Buscamos el nombre y arete del animal en el caché general
        const cacheAnimales = await obtenerCacheLocal('animales_cache') || [];
        const animalEncontrado = cacheAnimales.find((a: any) => String(a.id) === String(id));
        if (animalEncontrado) {
          setAnimalInfo({ arete_siniiga: animalEncontrado.arete_siniiga, nombre: animalEncontrado.nombre });
        }

        // 2. Buscamos el historial específico que guardamos antes
        const cacheHistorial = await obtenerCacheLocal(`historial_salud_${id}`) || [];
        
        if (cacheHistorial.length > 0) {
          setRegistros(cacheHistorial);
        } else {
          // 🆘 Plan C: Si no hay historial específico, buscamos en las tareas pendientes generales
          const cacheTareas = await obtenerCacheLocal('tareas_cache') || [];
          const tareasDeEsteAnimal = cacheTareas.filter((t: any) => String(t.planes_medicos?.animal_id) === String(id));
          setRegistros(tareasDeEsteAnimal);
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Tratamientos</Text>
          <Text style={styles.headerSub}>{animalInfo?.nombre ? `${animalInfo.arete_siniiga} - ${animalInfo.nombre}` : `Arete: ${animalInfo?.arete_siniiga}`}</Text>
        </View>
      </View>

      {/* LISTA DE TRATAMIENTOS DE ESTE ANIMAL */}
      <View style={styles.content}>
        <FlatList 
          data={registros}
          // 🛡️ 3. BLINDAJE ANTI-CRASH DEL TOSTRING
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={[styles.iconBadge, { backgroundColor: item.tipo_producto === 'Medicamento' ? '#FEE2E2' : color + '15' }]}>
                {item.tipo_producto === 'Medicamento' ? <Stethoscope color="#EF4444" size={24} /> : <Syringe color={color} size={24} />}
              </View>
              
              <View style={styles.historyInfo}>
                <Text style={styles.histProduct}>{item.producto}</Text>
                <Text style={styles.histPlan}>Plan: {item.planes_medicos?.nombre_plan}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={12} color="#9CA3AF" />
                  <Text style={styles.histDate}>{item.fecha_programada} {item.hora_programada || ''}</Text>
                </View>
              </View>

              <View style={[styles.statusTag, { backgroundColor: item.estado === 'Completado' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.statusTagText, { color: item.estado === 'Completado' ? '#059669' : '#EF4444' }]}>{item.estado}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  historyCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#E5E7EB' },
  iconBadge: { padding: 10, borderRadius: 12 },
  historyInfo: { flex: 1, marginLeft: 12 },
  histProduct: { fontSize: 16, fontWeight: '900', color: '#111827' },
  histPlan: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  histDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusTagText: { fontSize: 10, fontWeight: '900' },
});