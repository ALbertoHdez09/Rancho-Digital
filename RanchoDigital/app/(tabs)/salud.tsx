import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { Syringe } from 'lucide-react-native';

export default function SaludScreen() {
  const { color } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.alert, { backgroundColor: color + '20' }]}>
        <Syringe color={color} size={24} />
        <Text style={[styles.alertText, { color: color }]}>Próximas Vacunas</Text>
      </View>
      <Text style={styles.placeholder}>Aquí verás el calendario sanitario de tu ganado.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  alert: { flexDirection: 'row', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  alertText: { marginLeft: 15, fontWeight: 'bold', fontSize: 16 },
  placeholder: { textAlign: 'center', color: '#999', marginTop: 50 }
});