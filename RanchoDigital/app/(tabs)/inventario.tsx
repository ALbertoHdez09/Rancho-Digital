import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list'; 
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Search, Beef, ChevronRight, Tag, Scale } from 'lucide-react-native';

// 1. IMPORTAMOS EL RADAR Y LA MEMORIA SECRETA
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal } from '../../src/services/offlineService';

const { width } = Dimensions.get('window');

interface Animal {
  id: number;
  arete_siniiga: string;
  raza: string;
  genero: string;
  peso_inicial: number;
  estado?: string;
}

export default function InventarioScreen() {
  const { color } = useTheme();
  const router = useRouter();
  
  // 2. INVOCAMOS EL RADAR
  const { isConnected } = useNetwork();
  
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchAnimales();
    }, [isConnected]) // Escucha si el internet cambia
  );

  // 3. BLINDAMOS LA FUNCIÓN DE BÚSQUEDA
  async function fetchAnimales() {
    setLoading(true);
    try {
      if (isConnected) {
        // 🟢 PLAN A: Hay internet, vamos por datos frescos
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from('animales')
          .select('*')
          .eq('user_id', session?.user?.id) 
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAnimales(data || []);
      } else {
        // 🔴 PLAN B DIRECTO: No hay internet
        const cache = await obtenerCacheLocal('animales_cache');
        setAnimales(cache || []);
      }
    } catch (error) {
      console.log('Fallo red, usando memoria...', error);
      // ⚠️ PLAN B DE EMERGENCIA: Falló la petición a la mitad
      const cache = await obtenerCacheLocal('animales_cache');
      setAnimales(cache || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnimales();
    setRefreshing(false);
  };

  const animalesFiltrados = animales.filter((animal) => {
    // Convertimos todo a minúsculas para que no importe si escribes con mayúsculas
    const textoBuscado = busqueda.toLowerCase();
    const arete = animal.arete_siniiga ? animal.arete_siniiga.toLowerCase() : '';
    const raza = animal.raza ? animal.raza.toLowerCase() : '';
    
    // Busca coincidencias en el arete o en la raza
    return arete.includes(textoBuscado) || raza.includes(textoBuscado);
  });

  const renderAnimal = ({ item }: { item: Animal }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/animal/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.areteRow}>
          <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
            <Tag color={color} size={20} />
          </View>
          <Text style={styles.areteText}>{item.arete_siniiga}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.genero}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoMain}>
          <Text style={styles.razaLabel}>RAZA</Text>
          <Text style={styles.razaValue}>{item.raza}</Text>
        </View>
        
        <View style={styles.pesoContainer}>
          <Scale color="#666" size={16} style={{marginRight: 4}}/>
          <Text style={styles.pesoText}>{item.peso_inicial} kg</Text>
          <ChevronRight color="#CCC" size={24} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={color} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER CURVO PRO */}
      <View style={[styles.header, { backgroundColor: color }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mi Ganado</Text>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: color }]}>{animales.length} cabezas</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* BARRA DE BÚSQUEDA 100% FUNCIONAL */}
        <View style={styles.searchBar}>
          <Search color="#999" size={20} />
          <TextInput 
            style={[styles.searchPlaceholder, { flex: 1, height: '100%', color: '#333' }]} // Le ponemos flex: 1 para que ocupe el espacio
            placeholder="Buscar por arete o raza..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
          />
        </View>

        <FlashList<Animal>
          data={animalesFiltrados} /* <--- AQUÍ LE PASAMOS LA LISTA FILTRADA */
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAnimal}
          // @ts-ignore
          estimatedItemSize={130}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color]} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150, paddingTop: 10 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Beef color="#DDD" size={100} strokeWidth={1} />
              <Text style={styles.emptyText}>
                {busqueda !== '' ? 'No se encontraron animales' : 'Corral vacío'}
              </Text>
              <Text style={styles.emptySubText}>
                {busqueda !== '' ? 'Intenta buscar con otro arete o raza.' : 'Presiona el botón de abajo para registrar tu primer animal.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* BOTÓN FLOTANTE ESTILO FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: color }]}
        onPress={() => router.push('/nuevo-animal' as any)}
      >
        <Plus color="white" size={32} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  
  // Header Curvo
  header: {
    height: 160,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingTop: 60,
    paddingHorizontal: 25,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countText: { fontWeight: '900', fontSize: 13 },

  content: { flex: 1, paddingHorizontal: 20 },

  // Barra de búsqueda
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: -25, 
    marginBottom: 15, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10,
  },
  searchPlaceholder: { color: '#999', marginLeft: 10, fontSize: 15, fontWeight: '500' },

  // Tarjetas
  card: { 
    backgroundColor: 'white', 
    padding: 18, 
    borderRadius: 25, 
    marginBottom: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  areteRow: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { padding: 8, borderRadius: 10, marginRight: 10 },
  areteText: { fontSize: 22, fontWeight: '900', color: '#000' }, 
  statusBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#666', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },

  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  infoMain: { flex: 1 },
  razaLabel: { fontSize: 11, fontWeight: '800', color: '#AAA', letterSpacing: 1 },
  razaValue: { fontSize: 16, fontWeight: '700', color: '#333' },
  pesoContainer: { flexDirection: 'row', alignItems: 'center' },
  pesoText: { fontSize: 20, fontWeight: '900', color: '#000', marginRight: 5 },

  // Empty State
  emptyState: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 22, fontWeight: '900', color: '#000', marginTop: 20 },
  emptySubText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // FAB
  fab: { 
    position: 'absolute', 
    right: 25, 
    bottom: 95,
    width: 65, 
    height: 65, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 10 
  },
});