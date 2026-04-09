import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { Syringe, Plus, Activity, ChevronRight } from 'lucide-react-native';

// 1. IMPORTAMOS EL RADAR Y LA MEMORIA
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../../src/services/offlineService';

export default function SaludScreen() {
  const { color } = useTheme();
  const router = useRouter();

  // 2. INVOCAMOS EL RADAR
  const { isConnected } = useNetwork();

  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDatosAgrupados();
    }, [isConnected]) // Reacciona si se va el internet
  );

  // 3. BLINDAMOS LA FUNCIÓN
  // 3. FUNCIÓN REFORZADA Y FILTRADA POR USUARIO
  async function fetchDatosAgrupados() {
    setLoading(true);
    try {
      // 🕵️‍♂️ Obtenemos la sesión local (offline-friendly)
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) return;

      let dosisData: any[] = [];

      if (isConnected) {
        // 🟢 PLAN A: Hay internet
        // Traemos primero TUS animales para saber qué filtrar
        const { data: misAn } = await supabase
          .from('animales')
          .select('id')
          .eq('user_id', userId);
        
        const misIds = misAn?.map(a => a.id) || [];

        const { data, error } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, animales!inner(arete_siniiga, nombre) )`)
          .neq('estado', 'Completado')
          .order('fecha_programada', { ascending: true });
        
        if (error) throw error;
        
        // 🛡️ Filtramos para que SOLO veas tus tareas (igual que en el Index)
        dosisData = (data || []).filter(d => misIds.includes(d.planes_medicos?.animal_id));
        
        // Actualizamos caché de tareas con lo más nuevo
        await guardarCacheLocal('tareas_cache', dosisData);
      } else {
        // 🔴 PLAN B: No hay internet, usamos el caché que ya está filtrado
        dosisData = await obtenerCacheLocal('tareas_cache') || [];
      }

      // Procesamos los datos para agrupar
      if (dosisData.length > 0) {
        const agrupados = dosisData.reduce((acc: any, curr: any) => {
          const plan = curr.planes_medicos;
          
          // 🛡️ Si el plan no existe por error de datos, lo ignoramos
          if (!plan) return acc;

          const animalId = plan.animal_id;
          const animalInfo = plan.animales || {};
          
          if (!acc[animalId]) {
            acc[animalId] = {
              animalId: animalId, // Nos aseguramos que sea el ID real
              arete: animalInfo.arete_siniiga || 'Arete Desconocido',
              nombre: animalInfo.nombre || '',
              total: 0,
            };
          }
          acc[animalId].total += 1;
          return acc;
        }, {});

        setGrupos(Object.values(agrupados));
      } else {
        setGrupos([]);
      }
    } catch (e) {
      console.log('Error general Salud:', e);
    } finally {
      setLoading(false);
    }
  }


  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Área Médica</Text>
        <Text style={styles.headerSub}>Animales que requieren atención</Text>
      </View>

      <View style={styles.content}>
        {loading ? <ActivityIndicator size="large" color={color} style={{marginTop: 50}} /> : (
          <FlatList 
            data={grupos}
            keyExtractor={(item) => item?.animalId?.toString() || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={<Text style={styles.emptyText}>¡Todo el corral está sano! Ninguna tarea médica pendiente.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.groupCard}
                activeOpacity={0.7}
                // Aquí mandamos al usuario a la PANTALLA NUEVA con el ID del animal
                onPress={() => router.push(`/detalle-salud/${item.animalId}` as any)}
              >
                <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
                  <Activity color={color} size={28} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.arete}>{item.nombre ? `${item.arete} - ${item.nombre}` : `Arete: ${item.arete}`}</Text>
                  <Text style={styles.subtitle}>{item.total} {item.total === 1 ? 'tratamiento pendiente' : 'tratamientos pendientes'}</Text>
                </View>
                <ChevronRight color="#D1D5DB" size={24} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <TouchableOpacity style={[styles.fab, { backgroundColor: color }]} onPress={() => router.push('/nuevo-registro-medico')}>
        <Plus color="white" size={28} />
        <Text style={styles.fabText}>Nuevo Registro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 150, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 50, paddingHorizontal: 25 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  groupCard: { backgroundColor: 'white', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBadge: { padding: 12, borderRadius: 15 },
  groupInfo: { flex: 1, marginLeft: 15 },
  arete: { fontSize: 18, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#EF4444', fontWeight: '700', marginTop: 4 },
  
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, marginTop: 40, fontWeight: '600', paddingHorizontal: 20 },
  
  fab: { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  fabText: { color: 'white', fontWeight: '900', fontSize: 16 },
});