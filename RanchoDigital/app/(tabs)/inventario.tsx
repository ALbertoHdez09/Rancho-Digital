import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { Search } from 'lucide-react-native';

export default function InventarioScreen() {
  const { color } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search color="#999" size={20} />
        <Text style={{color: '#999', marginLeft: 10}}>Buscar arete o nombre...</Text>
      </View>
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: color }]}>No hay animales registrados aún</Text>
        <Text style={{color: '#666'}}>Dale al botón de (+) para agregar uno.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  searchBar: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 }
});