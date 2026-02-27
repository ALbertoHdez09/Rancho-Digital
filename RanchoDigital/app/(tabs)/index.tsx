import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { User, ShieldCheck, Beef, Syringe, ClipboardList } from 'lucide-react-native';

export default function HomeScreen() {
  const { color } = useTheme();
  const [email, setEmail] = useState<string | undefined>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email);
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{flex: 1}} color={color} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color }}> 
      <ScrollView style={{ backgroundColor: '#F8F9FA' }}>
        {/* Header Dinámico */}
        <View style={[styles.header, { backgroundColor: color }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
               <User color={color} size={28} />
            </View>
            <View style={{marginLeft: 15}}>
              <Text style={styles.welcome}>¡Qué onda, Caporal!</Text>
              <Text style={styles.email}>{email}</Text>
            </View>
          </View>
          <View style={styles.roleBadge}>
            <ShieldCheck color="white" size={14} />
            <Text style={styles.roleText}>ADMINISTRADOR</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Acceso Rápido</Text>
          
          <View style={styles.grid}>
            <QuickCard icon={<ClipboardList color={color} />} label="Inventario" count="--" />
            <QuickCard icon={<Syringe color={color} />} label="Vacunas" count="Hoy" />
            <QuickCard icon={<Beef color={color} />} label="Inventario" count="--" />
          </View>

          <View style={[styles.infoCard, { borderLeftColor: color }]}>
            <Text style={styles.infoTitle}>Estado del Rancho</Text>
            <Text style={styles.infoText}>Todo en orden. La sesión está protegida y el sistema está listo para registrar ganado.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const QuickCard = ({ icon, label, count }: any) => (
  <TouchableOpacity style={styles.card}>
    {icon}
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardCount}>{count}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 25, paddingTop: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { backgroundColor: 'white', padding: 10, borderRadius: 15 },
  welcome: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start' },
  roleText: { color: 'white', fontSize: 11, fontWeight: '900', marginLeft: 6 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  grid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  card: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardLabel: { fontSize: 14, color: '#666', marginTop: 10 },
  cardCount: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, borderLeftWidth: 5 },
  infoTitle: { fontWeight: 'bold', marginBottom: 5 },
  infoText: { color: '#666', lineHeight: 20 }
});