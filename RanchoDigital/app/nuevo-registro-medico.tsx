import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { supabase } from '../src/services/supabase';
import { useTheme } from '../src/context/ThemeContext';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, Search, Check, Clock, X, Calendar, ScanLine, CheckCircle2, ShieldPlus, Stethoscope, Plus, AlertCircle } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
// 1. IMPORTAMOS NUESTRO ARSENAL OFFLINE
import { useNetwork } from '../src/context/NetworkContext';
import { obtenerCacheLocal, guardarCacheLocal } from '../src/services/offlineService';
import { agregarAlBuzon } from '../src/services/syncService';

export default function NuevoRegistroMedico() {
  const { color } = useTheme();
  const router = useRouter();
  const { areteEscaneado } = useLocalSearchParams();
  
  // 2. INVOCAMOS AL VIGILANTE
  const { isConnected } = useNetwork();

  const [animales, setAnimales] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [animalSeleccionado, setAnimalSeleccionado] = useState({ id: '', arete: '' });

  const [tipoRegistro, setTipoRegistro] = useState<'preventivo' | 'tratamiento'>('preventivo');
  const [datePicker, setDatePicker] = useState({ show: false, mode: 'date' as 'date' | 'time', targetId: 0, targetType: '' });

  const [dosisPreventivas, setDosisPreventivas] = useState([
    { id: Date.now(), tipo: 'Vacuna', producto: '', fecha: new Date(), hora: new Date() }
  ]);
  const [datosTratamiento, setDatosTratamiento] = useState({ 
    enfermedad: '', producto: '', dias: '3', fechaInicio: new Date() 
  });

  const [alerta, setAlerta] = useState({ visible: false, tipo: 'exito', titulo: '', mensaje: '' });

  useFocusEffect(
    useCallback(() => {
      fetchAnimales();
    }, [areteEscaneado, isConnected]) // Reacciona al internet
  );

  // 🛡️ BUSCADOR OFFLINE-FIRST
  async function fetchAnimales() {
    try {
      let dataAnimales: any[] = [];
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (isConnected) {
        try {
          const { data } = await supabase.from('animales').select('id, arete_siniiga').eq('user_id', user?.id);
          if (data) dataAnimales = data;
        } catch (e) {
          dataAnimales = await obtenerCacheLocal('animales_cache') || [];
        }
      } else {
        dataAnimales = await obtenerCacheLocal('animales_cache') || [];
      }

      setAnimales(dataAnimales);
      
      if (areteEscaneado && dataAnimales.length > 0) {
        const encontrado = dataAnimales.find(a => String(a.arete_siniiga) === String(areteEscaneado));
        if (encontrado) setAnimalSeleccionado({ id: encontrado.id, arete: encontrado.arete_siniiga });
      }
    } catch (e) {
      console.log(e);
    }
  }

  // 👇 AQUÍ ESTÁN LAS FUNCIONES QUE SE HABÍAN BORRADO POR ERROR 👇
  const onDateChange = (event: any, selectedValue?: Date) => {
    setDatePicker({ ...datePicker, show: false });
    if (!selectedValue) return;

    if (datePicker.targetType === 'preventivo') {
      setDosisPreventivas(prev => prev.map(d => 
        d.id === datePicker.targetId ? { ...d, [datePicker.mode === 'date' ? 'fecha' : 'hora']: selectedValue } : d
      ));
    } else {
      setDatosTratamiento({ ...datosTratamiento, fechaInicio: selectedValue });
    }
  };

  const agregarDosisPrev = () => setDosisPreventivas([...dosisPreventivas, { id: Date.now(), tipo: 'Vacuna', producto: '', fecha: new Date(), hora: new Date() }]);

  const mostrarAlerta = (tipo: 'exito' | 'error', titulo: string, mensaje: string) => {
    setAlerta({ visible: true, tipo, titulo, mensaje });
  };
  // 👆 -------------------------------------------------------- 👆

  async function programarNotificaciones(dosisParaAgendar: any[], areteAnimal: string) {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        for (const dosis of dosisParaAgendar) {
        if (!dosis.fecha_programada) continue;
        const fechaDosis = new Date(dosis.fecha_programada);

        if (dosis.hora_programada) {
            const [h, m] = dosis.hora_programada.split(':');
            fechaDosis.setHours(parseInt(h), parseInt(m), 0, 0);
        } else {
            fechaDosis.setHours(8, 0, 0, 0);
        }

        if (fechaDosis <= new Date()) continue; // Solo agenda el futuro

        await Notifications.scheduleNotificationAsync({
            content: {
            title: '💉 Tratamiento programado',
            body: `Aplicar ${dosis.producto} al animal ${areteAnimal}`,
            sound: true,
            },
            trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fechaDosis,
            },
        });
        }
    } catch (e) {
        console.log('Error agendando notificaciones:', e);
    }
    }

  // 🛡️ GUARDADO OFFLINE CON CAJA ANIDADA
  async function guardarRegistro() {
    if (!animalSeleccionado.id) return mostrarAlerta('error', 'Falta información', 'Selecciona un animal primero.');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      // EMPACAMOS LA CAJA PRINCIPAL (EL PLAN)
      let planData: any = {
        animal_id: animalSeleccionado.id, 
        user_id: user?.id, 
        nombre_plan: tipoRegistro === 'preventivo' ? 'Control Preventivo' : datosTratamiento.enfermedad, 
        tipo: tipoRegistro === 'preventivo' ? 'Preventivo' : 'Tratamiento', 
        estado: tipoRegistro === 'preventivo' ? 'Activo' : 'En curso', 
        fecha_inicio: tipoRegistro === 'preventivo' ? new Date().toISOString() : datosTratamiento.fechaInicio.toISOString()
      };

      // EMPACAMOS EL CONTENIDO (LAS DOSIS)
      let dosisData: any[] = [];

      if (tipoRegistro === 'preventivo') {
        const validas = dosisPreventivas.filter(d => d.producto !== '');
        if (validas.length === 0) return mostrarAlerta('error', 'Sin productos', 'Añade al menos un producto para guardar la rutina.');
        
        dosisData = validas.map(d => ({
          producto: d.producto, tipo_producto: d.tipo, fecha_programada: d.fecha.toISOString().split('T')[0], 
          hora_programada: d.hora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), estado: 'Pendiente'
        }));
      } else {
        if (!datosTratamiento.enfermedad || !datosTratamiento.producto) return mostrarAlerta('error', 'Datos incompletos', 'Llena el diagnóstico y el medicamento.');
        const dias = parseInt(datosTratamiento.dias) || 1;
        for (let i = 0; i < dias; i++) {
          const f = new Date(datosTratamiento.fechaInicio);
          f.setDate(f.getDate() + i);
          dosisData.push({ producto: datosTratamiento.producto, tipo_producto: 'Medicamento', fecha_programada: f.toISOString().split('T')[0], estado: 'Pendiente' });
        }
      }

      // Programar notificaciones locales para cada dosis (funciona offline)
      await programarNotificaciones(dosisData, animalSeleccionado.arete);

      if (isConnected) {
        // 🟢 PLAN A: CON INTERNET (Guardado tradicional)
        try {
          const { data: plan, error: e1 } = await supabase.from('planes_medicos').insert([planData]).select().single();
          if (e1) throw e1;

          const inserts = dosisData.map(d => ({ ...d, plan_id: plan.id }));
          const { error: e2 } = await supabase.from('dosis_medicas').insert(inserts);
          if (e2) throw e2;

          mostrarAlerta('exito', '¡Registro Guardado!', 'El historial médico se actualizó en la nube. ☁️');
        } catch (error) {
          console.log("Fallo la nube, mandando a buzón...");
          guardarEnBuzon(planData, dosisData);
        }
      } else {
        // 🔴 PLAN B: SIN INTERNET
        guardarEnBuzon(planData, dosisData);
      }
      
    } catch (e: any) {
      mostrarAlerta('error', 'Ups, hubo un problema', e.message);
    }
  }

  // 📦 EL CARTERO EN ACCIÓN (Truco de inserción anidada)
  async function guardarEnBuzon(planData: any, dosisData: any[]) {
  // Embebemos las dosis dentro del plan (el syncService ya sabe desempacarlo)
  planData.dosis_medicas = dosisData;
  await agregarAlBuzon('planes_medicos', 'INSERT', planData);
  // 🆕 FIX Bug #6: Actualizamos tareas_cache para que aparezca de inmediato
  const cacheActual = await obtenerCacheLocal('tareas_cache') || [];
  const animalInfo = animales.find((a: any) => a.id === planData.animal_id) || {};
  const nuevasDosisParaCache = dosisData.map((d, i) => ({
    id: Date.now() + i,
    producto: d.producto,
    tipo_producto: d.tipo_producto,
    fecha_programada: d.fecha_programada,
    estado: 'Pendiente',
    planes_medicos: {
      animal_id: planData.animal_id,
      animales: { arete_siniiga: animalInfo.arete_siniiga || '' }
    }
  }));
  await guardarCacheLocal('tareas_cache', [...nuevasDosisParaCache, ...cacheActual]);
  mostrarAlerta('exito', '¡Guardado Offline!', 'El registro está en tu celular y se subirá al recuperar la red. 📡');
}

  const cerrarAlerta = () => {
    setAlerta({ ...alerta, visible: false });
    if (alerta.tipo === 'exito') {
      router.back(); 
    }
  };

  const animalesFiltrados = animales.filter(a => String(a.arete_siniiga || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Programar Salud</Text>
          <Text style={styles.headerSub}>Añade rutinas o tratamientos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BUSCADOR */}
        <View style={[styles.inputWrapper, { borderColor: animalSeleccionado.id ? color : '#E5E7EB' }]}>
          <Search size={20} color="#9CA3AF" />
          <TextInput 
            placeholder="Buscar arete..." placeholderTextColor="#9CA3AF" style={styles.input}
            value={animalSeleccionado.id ? `Vaca: ${animalSeleccionado.arete}` : busqueda}
            onChangeText={setBusqueda} editable={!animalSeleccionado.id}
          />
          {animalSeleccionado.id ? (
            <TouchableOpacity onPress={() => {setAnimalSeleccionado({id:'', arete:''}); router.setParams({areteEscaneado: ''});}}>
              <X size={24} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push({ pathname: '/escaner', params: { origin: 'salud' } })}>
              <ScanLine size={24} color={color} />
            </TouchableOpacity>
          )}
        </View>

        {busqueda.length > 0 && !animalSeleccionado.id && (
          <View style={styles.resultsBox}>
            {animalesFiltrados.slice(0,3).map(a => (
              <TouchableOpacity key={a.id} style={styles.resultItem} onPress={() => {setAnimalSeleccionado({id: a.id, arete: a.arete_siniiga}); setBusqueda('');}}>
                <Text style={styles.resultText}>Arete: <Text style={{fontWeight:'900'}}>{a.arete_siniiga}</Text></Text>
                <CheckCircle2 color={color} size={20} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tabBtn, tipoRegistro === 'preventivo' && {backgroundColor: color}]} onPress={() => setTipoRegistro('preventivo')}>
            <ShieldPlus color={tipoRegistro === 'preventivo' ? 'white' : '#6B7280'} size={18} />
            <Text style={[styles.tabText, tipoRegistro === 'preventivo' && {color: 'white'}]}>Rutina</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tipoRegistro === 'tratamiento' && {backgroundColor: '#EF4444'}]} onPress={() => setTipoRegistro('tratamiento')}>
            <Stethoscope color={tipoRegistro === 'tratamiento' ? 'white' : '#6B7280'} size={18} />
            <Text style={[styles.tabText, tipoRegistro === 'tratamiento' && {color: 'white'}]}>Enfermedad</Text>
          </TouchableOpacity>
        </View>

        {/* FORMULARIOS */}
        {tipoRegistro === 'preventivo' ? (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>VACUNAS / VITAMINAS</Text>
              <TouchableOpacity style={[styles.addBtn, {backgroundColor: color}]} onPress={agregarDosisPrev}><Plus color="white" size={14}/></TouchableOpacity>
            </View>
            {dosisPreventivas.map(d => (
              <View key={d.id} style={styles.dosisCard}>
                <TextInput style={styles.dosisInputMain} placeholder="Producto..." placeholderTextColor="#9CA3AF" onChangeText={(t) => setDosisPreventivas(prev => prev.map(item => item.id === d.id ? {...item, producto: t} : item))} />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setDatePicker({show:true, mode:'date', targetId: d.id, targetType: 'preventivo'})}>
                    <Calendar size={16} color={color} />
                    <Text style={styles.dateSelectorText}>{d.fecha.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setDatePicker({show:true, mode:'time', targetId: d.id, targetType: 'preventivo'})}>
                    <Clock size={16} color={color} />
                    <Text style={styles.dateSelectorText}>{d.hora.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.tratamientoBox}>
            <Text style={styles.label}>DIAGNÓSTICO</Text>
            <TextInput style={styles.inputRed} placeholder="Ej: Neumonía" placeholderTextColor="#9CA3AF" onChangeText={t => setDatosTratamiento({...datosTratamiento, enfermedad: t})} />
            <Text style={styles.label}>MEDICAMENTO Y DÍAS</Text>
            <View style={styles.row}>
              <TextInput style={[styles.inputRed, {flex: 2}]} placeholder="Producto" placeholderTextColor="#9CA3AF" onChangeText={t => setDatosTratamiento({...datosTratamiento, producto: t})} />
              <TextInput style={[styles.inputRed, {flex: 1}]} placeholder="Días" keyboardType="numeric" placeholderTextColor="#9CA3AF" value={datosTratamiento.dias} onChangeText={t => setDatosTratamiento({...datosTratamiento, dias: t})} />
            </View>
            <TouchableOpacity style={styles.dateSelectorFull} onPress={() => setDatePicker({show:true, mode:'date', targetId: 0, targetType: 'tratamiento'})}>
              <Calendar size={18} color="#EF4444" />
              <Text style={styles.dateSelectorText}>Inicia: {datosTratamiento.fechaInicio.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={[styles.saveBtn, {backgroundColor: tipoRegistro === 'preventivo' ? color : '#EF4444'}]} onPress={guardarRegistro}>
          <Check color="white" size={24} />
          <Text style={styles.saveBtnText}>Guardar Registro</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DATE PICKER NATIVO */}
      {datePicker.show && (
        <DateTimePicker
          value={datePicker.targetType === 'preventivo' ? (dosisPreventivas.find(d => d.id === datePicker.targetId)?.[datePicker.mode === 'date' ? 'fecha' : 'hora'] || new Date()) : datosTratamiento.fechaInicio}
          mode={datePicker.mode} is24Hour={true} onChange={onDateChange}
        />
      )}

      {/* MODAL DE ALERTA PREMIUM */}
      <Modal animationType="fade" transparent={true} visible={alerta.visible} onRequestClose={cerrarAlerta}>
        <View style={styles.modalAlertOverlay}>
          <View style={styles.modalAlertContent}>
            
            <View style={[styles.modalAlertIconBox, { backgroundColor: alerta.tipo === 'exito' ? '#D1FAE5' : '#FEE2E2' }]}>
              {alerta.tipo === 'exito' ? (
                <CheckCircle2 color="#10B981" size={50} />
              ) : (
                <AlertCircle color="#EF4444" size={50} />
              )}
            </View>

            <Text style={styles.modalAlertTitle}>{alerta.titulo}</Text>
            <Text style={styles.modalAlertMessage}>{alerta.mensaje}</Text>
            
            <TouchableOpacity 
              style={[styles.modalAlertBtn, { backgroundColor: alerta.tipo === 'exito' ? '#10B981' : '#EF4444' }]} 
              onPress={cerrarAlerta}
            >
              <Text style={styles.modalAlertBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 50 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 60, borderWidth: 2, marginBottom: 10, elevation: 2 },
  input: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '700', color: '#000000' },
  resultsBox: { backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 15 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  resultText: { fontSize: 15 },
  tabsContainer: { flexDirection: 'row', gap: 10, marginVertical: 15 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB' },
  tabText: { fontWeight: '800', fontSize: 14, color: '#6B7280' },
  label: { fontSize: 12, fontWeight: '900', color: '#9CA3AF', marginBottom: 8, letterSpacing: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { padding: 6, borderRadius: 8 },
  dosisCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  dosisInputMain: { fontSize: 18, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', paddingBottom: 5, marginBottom: 15, color: '#111827' },
  row: { flexDirection: 'row', gap: 10 },
  dateSelector: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateSelectorFull: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', marginTop: 10 },
  dateSelectorText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  tratamientoBox: { backgroundColor: '#FEF2F2', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FECACA' },
  inputRed: { backgroundColor: 'white', height: 55, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, fontWeight: '700', marginBottom: 10, borderWidth: 1, borderColor: '#FECACA', color: '#111827' },
  saveBtn: { flexDirection: 'row', height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 10, elevation: 3 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },

  // ESTILOS DEL MODAL DE ALERTA
  modalAlertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalAlertContent: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalAlertIconBox: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalAlertTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 10, textAlign: 'center' },
  modalAlertMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalAlertBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  modalAlertBtnText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});