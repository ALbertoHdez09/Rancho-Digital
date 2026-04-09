import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Modal } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { PieChart, Beef, Download, AlertTriangle, Scale, X, FileText, CheckCircle2, HeartPulse } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 1. IMPORTAMOS RADAR Y MEMORIA
import { useNetwork } from '../../src/context/NetworkContext';
import { obtenerCacheLocal } from '../../src/services/offlineService';

const { width } = Dimensions.get('window');

export default function ReportesScreen() {
  const { color } = useTheme();
  const router = useRouter();
  
  // 2. INVOCAMOS EL RADAR
  const { isConnected } = useNetwork();

  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [stats, setStats] = useState({ total: 0, machos: 0, hembras: 0, alertas: 0, pesoTotal: 0 });
  const [listaAnimales, setListaAnimales] = useState<any[]>([]);
  const [alertasSet, setAlertasSet] = useState<Set<any>>(new Set());

  useFocusEffect(
    useCallback(() => {
      cargarEstadisticas();
    }, [isConnected])
  );

  // 3. BLINDAMOS LAS ESTADÍSTICAS
  async function cargarEstadisticas() {
    setLoading(true);
    try {
      let animalesData: any[] = [];
      let dosisData: any[] = [];
      let pesajesData: any[] = []; // Offline no calcularemos el último pesaje, solo usaremos el peso inicial para evitar errores
      
      if (isConnected) {
        // 🟢 PLAN A: Hay señal
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const resAnimales = await supabase.from('animales').select('*').eq('user_id', session.user.id);
            const resDosis = await supabase.from('dosis_medicas').select(`estado, planes_medicos!inner(animal_id)`).neq('estado', 'Completado');
            const resPesajes = await supabase.from('pesajes').select('animal_id, peso').order('fecha_pesaje', { ascending: false });
            
            animalesData = resAnimales.data || [];
            dosisData = resDosis.data || [];
            pesajesData = resPesajes.data || [];
          }
        } catch (e) {
          console.log("Fallo carga reportes, usando cache", e);
          animalesData = await obtenerCacheLocal('animales_cache') || [];
          dosisData = await obtenerCacheLocal('tareas_cache') || [];
        }
      } else {
        // 🔴 PLAN B: No hay señal, sacamos todo del caché
        animalesData = await obtenerCacheLocal('animales_cache') || [];
        dosisData = await obtenerCacheLocal('tareas_cache') || []; // tareas_cache tiene las dosis
      }

      // Procesamos la data para que las gráficas funcionen offline
      if (animalesData) {
        let machos = 0; let hembras = 0; let alertasIds = new Set(); let pesoTotalActual = 0;

        dosisData?.forEach((d: any) => {
          const plan = Array.isArray(d.planes_medicos) ? d.planes_medicos[0] : d.planes_medicos;
          if (plan?.animal_id) alertasIds.add(plan.animal_id);
        });

        animalesData.forEach(a => {
          if (a.genero === 'Macho') machos++;
          if (a.genero === 'Hembra') hembras++;
          if (a.estado === 'Enferma' || a.estado === 'Vacía') alertasIds.add(a.id);

          const ultimoPesaje = pesajesData?.find((p: any) => p.animal_id === a.id);
          pesoTotalActual += ultimoPesaje ? parseFloat(ultimoPesaje.peso) : (parseFloat(a.peso_inicial) || 0);
        });

        setStats({ total: animalesData.length, machos, hembras, alertas: alertasIds.size, pesoTotal: pesoTotalActual });
        setListaAnimales(animalesData);
        setAlertasSet(alertasIds);
      }
    } catch (error) {
      console.log('Error general Stats:', error);
    } finally {
      setLoading(false);
    }
  }  // EL CEREBRO DEL NUEVO PDF
    const generarPDF = async (tipo: 'Todos' | 'Sanos' | 'Alertas' | 'Machos' | 'Hembras') => {
    // Si no hay internet, no dejamos crear el PDF porque no trae el formato completo
    if (!isConnected) {
      Alert.alert('Modo Offline', '⚠️ Se requiere conexión a internet para generar e imprimir el PDF con la tabla clínica detallada.');
      setModalVisible(false);
      return;
    }
    
    setModalVisible(false);
    setDescargando(true);

    try {
      // 1. FILTRAMOS LOS ANIMALES SEGÚN LO QUE ELIGIÓ EL USUARIO
      let animalesFiltrados = listaAnimales;
      let tituloReporte = "Reporte Ejecutivo del Rancho";

      if (tipo === 'Sanos') {
        animalesFiltrados = listaAnimales.filter(a => !alertasSet.has(a.id) && a.estado === 'Sana');
        tituloReporte = "Reporte de Animales Sanos";
      } else if (tipo === 'Alertas') {
        animalesFiltrados = listaAnimales.filter(a => alertasSet.has(a.id) || a.estado === 'Enferma' || a.estado === 'Vacía');
        tituloReporte = "Reporte de Alertas y Enfermos";
      } else if (tipo === 'Machos') {
        animalesFiltrados = listaAnimales.filter(a => a.genero === 'Macho');
        tituloReporte = "Reporte de Sementales / Machos";
      } else if (tipo === 'Hembras') {
        animalesFiltrados = listaAnimales.filter(a => a.genero === 'Hembra');
        tituloReporte = "Reporte de Vientres / Hembras";
      }

      if (animalesFiltrados.length === 0) {
        Alert.alert('Sin resultados', `No hay animales en la categoría: ${tipo}`);
        setDescargando(false);
        return;
      }

      // 2. BUSCAMOS TRATAMIENTOS DE LOS ANIMALES FILTRADOS
      const idsFiltrados = animalesFiltrados.map(a => a.id);
      const { data: tratamientos } = await supabase
        .from('dosis_medicas')
        .select(`producto, fecha_programada, hora_programada, estado, planes_medicos!inner(animal_id, nombre_plan)`)
        .in('planes_medicos.animal_id', idsFiltrados)
        .neq('estado', 'Completado')
        .order('fecha_programada', { ascending: true });

      const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Construimos las filas del inventario
      const filasTabla = animalesFiltrados.map(a => `
        <tr>
          <td style="font-weight: bold;">${a.arete_siniiga}</td>
          <td>${a.raza}</td>
          <td>${a.genero}</td>
          <td>${a.peso_inicial} kg</td>
          <td><span class="badge ${alertasSet.has(a.id) ? 'alerta' : 'sana'}">${alertasSet.has(a.id) ? 'En Alerta' : 'Sana'}</span></td>
        </tr>
      `).join('');

      // Construimos la tabla de tratamientos (si hay)
      let tablaTratamientosHtml = '';
      if (tratamientos && tratamientos.length > 0) {
        const filasTratamientos = tratamientos.map((t: any) => {
          const plan = Array.isArray(t.planes_medicos) ? t.planes_medicos[0] : t.planes_medicos;
          const animal = animalesFiltrados.find(a => a.id === plan.animal_id);
          return `
            <tr>
              <td style="font-weight: bold;">${animal?.arete_siniiga || 'Desconocido'}</td>
              <td style="color: #991B1B; font-weight: bold;">${plan?.nombre_plan || 'Tratamiento'}</td>
              <td>${t.producto}</td>
              <td>${t.fecha_programada} a las ${t.hora_programada || 'N/A'}</td>
            </tr>
          `;
        }).join('');

        tablaTratamientosHtml = `
          <h2 style="font-size: 20px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; margin-top: 40px; color: #991B1B;">Detalle de Tratamientos Activos</h2>
          <table class="tratamientos-table">
            <thead>
              <tr>
                <th>Arete</th>
                <th>Diagnóstico / Plan</th>
                <th>Medicamento</th>
                <th>Programación</th>
              </tr>
            </thead>
            <tbody>
              ${filasTratamientos}
            </tbody>
          </table>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid ${color}; padding-bottom: 20px; margin-bottom: 40px; }
            .title { font-size: 32px; font-weight: 900; margin: 0; color: #111827; }
            .subtitle { font-size: 16px; color: #6B7280; margin-top: 5px; }
            .summary-box { display: flex; justify-content: space-between; background: #F9FAFB; padding: 20px; border-radius: 12px; margin-bottom: 40px; border: 1px solid #E5E7EB; }
            .summary-item { text-align: center; width: 23%; }
            .summary-value { font-size: 28px; font-weight: 900; color: ${color}; }
            .summary-label { font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: ${color}; color: white; padding: 12px; text-align: left; font-size: 14px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
            tr:nth-child(even) { background-color: #F9FAFB; }
            .tratamientos-table th { background-color: #EF4444; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .sana { background-color: #D1FAE5; color: #065F46; }
            .alerta { background-color: #FEE2E2; color: #991B1B; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9CA3AF; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${tituloReporte}</h1>
            <p class="subtitle">Generado el ${fecha}</p>
          </div>

          <div class="summary-box">
            <div class="summary-item"><div class="summary-value">${animalesFiltrados.length}</div><div class="summary-label">Cabezas</div></div>
            <div class="summary-item"><div class="summary-value">${tipo}</div><div class="summary-label">Filtro</div></div>
          </div>

          <h2 style="font-size: 20px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Inventario</h2>
          <table>
            <thead>
              <tr><th>Arete / ID</th><th>Raza</th><th>Género</th><th>Peso</th><th>Estado</th></tr>
            </thead>
            <tbody>${filasTabla}</tbody>
          </table>

          ${tablaTratamientosHtml}

          <div class="footer">Generado automáticamente por tu App Ganadera.</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'No se pudo generar el documento PDF.');
    } finally {
      setDescargando(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={color} /></View>;
  }

  const porcHembras = stats.total > 0 ? (stats.hembras / stats.total) * 100 : 0;
  const porcMachos = stats.total > 0 ? (stats.machos / stats.total) * 100 : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Central de Inteligencia</Text>
        <Text style={styles.headerSub}>Métricas y Reportes de tu Hato</Text>
      </View>

      <View style={styles.content}>
        
        <View style={styles.gridContainer}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}><Beef color={color} size={24} /></View>
            <Text style={styles.kpiValue}>{stats.total}</Text>
            <Text style={styles.kpiLabel}>Total Cabezas</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}><AlertTriangle color="#EF4444" size={24} /></View>
            <Text style={styles.kpiValue}>{stats.alertas}</Text>
            <Text style={styles.kpiLabel}>En Alerta</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.kpiLabel}>Peso Est. Total del Corral</Text>
            <Text style={[styles.kpiValue, { fontSize: 36 }]}>{stats.pesoTotal} <Text style={{fontSize: 16, color: '#9CA3AF'}}>kg</Text></Text>
          </View>
          <View style={[styles.kpiIcon, { backgroundColor: '#D1FAE5', width: 60, height: 60 }]}><Scale color="#10B981" size={32} /></View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <PieChart color="#000" size={24} />
            <Text style={styles.chartTitle}>Distribución por Sexo</Text>
          </View>
          <View style={styles.barRow}>
            <View style={[styles.barSegment, { backgroundColor: '#FF6B6B', width: `${porcHembras}%` }]} />
            <View style={[styles.barSegment, { backgroundColor: '#4ECDC4', width: `${porcMachos}%` }]} />
          </View>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} /><Text style={styles.legendText}>Hembras ({stats.hembras})</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} /><Text style={styles.legendText}>Machos ({stats.machos})</Text></View>
          </View>
        </View>

        {/* BOTÓN QUE ABRE EL MODAL */}
        <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: color }]} onPress={() => setModalVisible(true)} disabled={descargando}>
          {descargando ? <ActivityIndicator color="white" /> : (
            <>
              <Download color="white" size={24} />
              <Text style={styles.pdfBtnText}>Generar Reportes PDF</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.pdfSubText}>Toca para elegir el tipo de reporte y aplicar filtros avanzados.</Text>
      </View>

      {/* MODAL DE FILTROS PARA EL PDF */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Reporte</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>¿Qué información deseas incluir en el documento?</Text>

            <TouchableOpacity style={styles.filterOption} onPress={() => generarPDF('Todos')}>
              <View style={[styles.iconBadge, { backgroundColor: '#F3F4F6' }]}><FileText color="#374151" size={24} /></View>
              <View><Text style={styles.filterTitle}>Inventario Completo</Text><Text style={styles.filterDesc}>Todo el corral</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => generarPDF('Sanos')}>
              <View style={[styles.iconBadge, { backgroundColor: '#D1FAE5' }]}><CheckCircle2 color="#059669" size={24} /></View>
              <View><Text style={styles.filterTitle}>Animales Sanos</Text><Text style={styles.filterDesc}>Solo sin alertas</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => generarPDF('Alertas')}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEE2E2' }]}><HeartPulse color="#EF4444" size={24} /></View>
              <View><Text style={styles.filterTitle}>Enfermos / Alertas</Text><Text style={styles.filterDesc}>Incluye tabla clínica detallada</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => generarPDF('Machos')}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}><Beef color="#0284C7" size={24} /></View>
              <View><Text style={styles.filterTitle}>Machos / Sementales</Text><Text style={styles.filterDesc}>Filtrado por género</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => generarPDF('Hembras')}>
              <View style={[styles.iconBadge, { backgroundColor: '#FCE7F3' }]}><Beef color="#DB2777" size={24} /></View>
              <View><Text style={styles.filterTitle}>Hembras / Vientres</Text><Text style={styles.filterDesc}>Filtrado por género</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600', marginTop: 5 },
  content: { padding: 20, marginTop: -15 },
  
  gridContainer: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  kpiCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  kpiIcon: { width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 32, fontWeight: '900', color: '#111827' },
  kpiLabel: { fontSize: 13, color: '#6B7280', fontWeight: '700', marginTop: 2 },

  chartCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 25, elevation: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  chartTitle: { fontSize: 16, fontWeight: '900', color: '#111827', textTransform: 'uppercase' },
  barRow: { width: '100%', height: 24, borderRadius: 12, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F3F4F6', marginBottom: 15 },
  barSegment: { height: '100%' },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 14, fontWeight: '700', color: '#4B5563' },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, gap: 10, elevation: 3 },
  pdfBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  pdfSubText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 12, paddingHorizontal: 10, fontWeight: '600' },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  modalSub: { color: '#6B7280', fontSize: 14, fontWeight: '600', marginBottom: 25 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 15 },
  iconBadge: { padding: 12, borderRadius: 15 },
  filterTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  filterDesc: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 2 },
});