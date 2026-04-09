import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView, Modal, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/services/supabase'; 
import { useTheme } from '../../src/context/ThemeContext'; 

// 1. IMPORTAMOS NUESTRAS NUEVAS HERRAMIENTAS OFFLINE
import { useNetwork } from '../../src/context/NetworkContext';
import { guardarCacheLocal, obtenerCacheLocal } from '../../src/services/offlineService';

import { Plus, Tag, ChevronRight, Scale, ScanLine, Syringe, Calendar as CalendarIcon, X, CalendarDays } from 'lucide-react-native';

export default function InventarioScreen() {
  const { color } = useTheme();
  const router = useRouter();
  
  // 2. INVOCAMOS AL VIGILANTE DEL INTERNET
  const { isConnected } = useNetwork();
  
  const [animales, setAnimales] = useState<any[]>([]);
  const [todasLasTareas, setTodasLasTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalAgendaVisible, setModalAgendaVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDatos();
    }, [isConnected]) // Agregamos isConnected aquí para que reaccione si cambia
  );

  async function fetchDatos() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (isConnected && userId) {
        // 1. Cargar Animales del usuario
        const { data: dataAn, error: errAn } = await supabase
          .from('animales')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (errAn) throw errAn; 
        setAnimales(dataAn || []);
        await guardarCacheLocal('animales_cache', dataAn || []);

        // 2. Cargar Tareas Pendientes (QUITAMOS EL FILTRO LTE PARA VER EL FUTURO)
        const { data: dataT, error: errT } = await supabase
          .from('dosis_medicas')
          .select(`*, planes_medicos!inner( animal_id, animales!inner(arete_siniiga) )`)
          .eq('estado', 'Pendiente')
          // 🛡️ Quitamos el .lte para que salgan las de mañana, pasado, etc.
          .order('fecha_programada', { ascending: true });
        
        if (errT) throw errT;

        if (dataT && dataAn) {
          const misIds = dataAn.map(a => a.id);
          const misTareas = dataT.filter(t => misIds.includes(t.planes_medicos?.animal_id));
          setTodasLasTareas(misTareas);
          await guardarCacheLocal('tareas_cache', misTareas);
        }
      } else {
        // Modo Offline... (se queda igual)
        const cacheAn = await obtenerCacheLocal('animales_cache') || [];
        const cacheTa = await obtenerCacheLocal('tareas_cache') || [];
        setAnimales(cacheAn);
        setTodasLasTareas(cacheTa);
      }
    } catch (error) {
      console.log("Error en fetch dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Tomamos solo las primeras 5 para el carrusel principal
  const tareasRecientes = todasLasTareas.slice(0, 5);

  const renderAnimal = ({ item }: { item: any }) => {
    const isActive = item.estado === 'En engorda' || item.estado === 'Cargada';
    return (
      <TouchableOpacity style={styles.animalCard} onPress={() => router.push(`/animal/${item.id}`)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <View style={styles.areteRow}>
            <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}><Tag color={color} size={24} /></View>
            <Text style={styles.areteText}>{item.arete_siniiga}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#D1FAE5' : '#F3F4F6' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#059669' : '#4B5563' }]}>{item.estado || 'Activo'}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>RAZA / GÉNERO</Text>
            <Text style={styles.infoValue}>{item.raza} • {item.genero}</Text>
          </View>
          <View style={styles.pesoCol}>
            <Text style={styles.infoLabel}>PESO</Text>
            <View style={styles.pesoRow}><Scale color="#9CA3AF" size={16} /><Text style={styles.pesoValue}>{item.peso_inicial} kg</Text></View>
          </View>
          <ChevronRight color="#D1D5DB" size={28} style={{ alignSelf: 'center' }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;

  return (
    <View style={styles.container}>
      {/* ==========================================
          PARTE FIJA (HEADER, BOTONES Y TAREAS HORIZONTALES)
          ========================================== */}
      <View style={{ zIndex: 10, backgroundColor: '#F3F4F6' }}>
        {/* 1. HEADER */}
        <View style={[styles.header, { backgroundColor: color }]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Rancho Pro</Text>
            <View style={styles.countBadge}><Text style={[styles.countText, { color: color }]}>{animales.length} cabezas</Text></View>
          </View>
        </View>

        {/* 2. BOTONES RÁPIDOS */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/escaner')}>
            <View style={[styles.actionIconBg, { backgroundColor: '#E0E7FF' }]}><ScanLine color="#4F46E5" size={32} /></View>
            <Text style={styles.actionText}>Escanear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/nuevo-animal')}>
            <View style={[styles.actionIconBg, { backgroundColor: '#F3F4F6' }]}><Plus color="#111827" size={32} /></View>
            <Text style={styles.actionText}>Manual</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SECCIÓN DE TAREAS HORIZONTALES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.listTitle}>Próximas Tareas</Text>
          <TouchableOpacity onPress={() => setModalAgendaVisible(true)} style={styles.verTodasBtn}>
            <Text style={[styles.verTodasText, { color: color }]}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {tareasRecientes.length > 0 ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {tareasRecientes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.pendienteCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/detalle-salud/${item.planes_medicos?.animal_id}` as any)}
                >
                  <View style={styles.pendienteBadge}>
                    <Syringe color={color} size={14} />
                    <Text style={[styles.badgeText, { color: color }]}>{item.tipo_producto || 'Vacuna'}</Text>
                  </View>
                  <Text style={styles.taskTitle} numberOfLines={1}>{item.producto}</Text>
                  <Text style={styles.taskArete}>Arete: {item.planes_medicos?.animales?.arete_siniiga}</Text>
                  <View style={styles.dateRow}>
                    <CalendarIcon size={12} color="#6B7280" />
                    <Text style={styles.dateText}>{item.fecha_programada}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyTasks}><Text style={styles.emptyTasksText}>Sin tareas hoy 🤠</Text></View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.listTitle, { marginTop: 15 }]}>Todos los Animales</Text>
        </View>
      </View>

      {/* ==========================================
          SCROLL INDEPENDIENTE (SÓLO PARA ANIMALES)
          ========================================== */}
      <FlatList
        data={animales}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAnimal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDatos} colors={[color]} />}
      />

      {/* ==========================================
          MODAL CHULO DE AGENDA / CALENDARIO
          ========================================== */}
      <Modal visible={modalAgendaVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalAgendaVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}><CalendarDays color={color} size={28} /></View>
              <Text style={styles.modalTitle}>Agenda Médica</Text>
            </View>
            <TouchableOpacity onPress={() => setModalAgendaVisible(false)} style={styles.closeBtn}>
              <X color="#4B5563" size={28} />
            </TouchableOpacity>
          </View>

          <FlatList 
            data={todasLasTareas}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.agendaRow}>
                <View style={styles.agendaDateBox}>
                  <Text style={styles.agendaDay}>{item.fecha_programada.split('-')[2]}</Text>
                  <Text style={styles.agendaMonth}>{item.fecha_programada.split('-')[1]}</Text>
                </View>
                <TouchableOpacity
                  style={styles.agendaCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalAgendaVisible(false);
                    router.push(`/detalle-salud/${item.planes_medicos?.animal_id}` as any);
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={styles.agendaProduct}>{item.producto}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: '#D97706' }]}>Pendiente</Text>
                    </View>
                  </View>
                  <Text style={styles.agendaArete}>Vaca / Arete: <Text style={{fontWeight: '800', color: '#111827'}}>{item.planes_medicos?.animales?.arete_siniiga}</Text></Text>
                  <View style={styles.agendaInfoRow}>
                    <Syringe size={14} color="#6B7280" />
                    <Text style={styles.agendaInfoText}>{item.tipo_producto || 'Dosis Médica'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Agenda Libre</Text>
                <Text style={styles.emptyText}>No tienes tratamientos ni vacunas programadas.</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { height: 170, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 60, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: '900' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countText: { fontSize: 14, fontWeight: '800' },

  quickActionsContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: -35, gap: 15, zIndex: 10, elevation: 10 },
  actionBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  actionIconBg: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionText: { fontSize: 16, fontWeight: '900', color: '#111827' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  listTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  verTodasBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  verTodasText: { fontWeight: '800', fontSize: 13 },

  pendienteCard: { backgroundColor: 'white', width: 210, padding: 15, borderRadius: 22, marginRight: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  pendienteBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  taskTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  taskArete: { fontSize: 13, color: '#6B7280', marginVertical: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  emptyTasks: { padding: 15, marginHorizontal: 20, backgroundColor: '#E5E7EB', borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#9CA3AF' },
  emptyTasksText: { textAlign: 'center', color: '#6B7280', fontWeight: '700' },

  animalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  areteRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { padding: 10, borderRadius: 12 },
  areteText: { fontSize: 24, fontWeight: '900', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1.5 },
  pesoCol: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
  pesoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pesoValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: 'white' },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 12 },
  
  agendaRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  agendaDateBox: { width: 55, height: 65, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  agendaDay: { fontSize: 22, fontWeight: '900', color: '#111827' },
  agendaMonth: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  
  agendaCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  agendaProduct: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 6, flex: 1 },
  agendaArete: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  agendaInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agendaInfoText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 10 },
  emptyText: { color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 }
});