import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../src/services/supabase'; 
import { useTheme } from '../src/context/ThemeContext'; 
import { ChevronLeft, CheckCircle, PlusCircle, Stethoscope, Users } from 'lucide-react-native';
import { useNetwork } from '../src/context/NetworkContext';
import { obtenerCacheLocal } from '../src/services/offlineService';

export default function EscanerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const { isConnected } = useNetwork();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ tipo: 'nuevo', titulo: '', mensaje: '', arete: '', id: '' });

  const router = useRouter();
  const { color } = useTheme();
  
  // ATRAPAMOS DE DÓNDE VENIMOS Y A DÓNDE VAMOS A REGRESAR
  const { origin, returnPath, animalId } = useLocalSearchParams(); 

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color={color} style={{marginTop: 100}} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Ocupamos usar la cámara para escanear los aretes, mi pa.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Dar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setProcesando(true);

    try {
      let animalEncontrado = null;

      if (isConnected) {
        // 🟢 PLAN A: Hay internet, buscamos en Supabase
        try {
          const { data: animal, error } = await supabase
            .from('animales')
            .select('id')
            .eq('arete_siniiga', data)
            .single();
            
          // Si no hay error, lo encontramos
          if (!error && animal) animalEncontrado = animal;
        } catch (e) {
          console.log("Fallo red buscando arete, usando caché local...");
          const cache = await obtenerCacheLocal('animales_cache') || [];
          animalEncontrado = cache.find((a: any) => String(a.arete_siniiga) === String(data));
        }
      } else {
        // 🔴 PLAN B: Modo Offline, buscamos en la memoria del celular
        console.log("Escáner Offline: Buscando en caché...");
        const cache = await obtenerCacheLocal('animales_cache') || [];
        animalEncontrado = cache.find((a: any) => String(a.arete_siniiga) === String(data));
      }

      // 👨‍👩‍👦 LÓGICA DE PADRE O MADRE
      if (origin === 'padre' || origin === 'madre') {
        const titulo = origin === 'padre' ? 'Toro Encontrado' : 'Vaca Encontrada';
        if (animalEncontrado) {
          setModalData({
            tipo: 'familiar_encontrado',
            titulo: titulo,
            mensaje: `Listo para enlazar como ${origin}.`,
            arete: data,
            id: animalEncontrado.id
          });
        } else {
          setModalData({
            tipo: 'nuevo',
            titulo: 'No registrado',
            mensaje: `Este arete no está en tu inventario.`,
            arete: data,
            id: ''
          });
        }
        setModalVisible(true);
        setProcesando(false);
        return;
      }

      // 💉 LÓGICA NORMAL Y SALUD
      if (animalEncontrado) {
        setModalData({
          tipo: 'encontrado',
          titulo: '¡Arete Encontrado!',
          mensaje: origin === 'salud' ? 'Animal listo para registro médico.' : 'Se encontró la ficha del animal.',
          arete: data,
          id: animalEncontrado.id
        });
      } else {
        setModalData({
          tipo: 'nuevo',
          titulo: origin === 'salud' ? 'Animal no registrado' : 'Nuevo Registro',
          mensaje: `Este arete no está en tu inventario.`,
          arete: data,
          id: ''
        });
      }
      setModalVisible(true);
      
    } catch (e) {
      console.log('Error general en escáner:', e);
      setModalData({
        tipo: 'nuevo',
        titulo: origin === 'salud' ? 'Animal no registrado' : 'Nuevo Registro',
        mensaje: `Este arete no está en tu inventario.`,
        arete: data,
        id: ''
      });
      setModalVisible(true);
    } finally {
      setProcesando(false);
    }
  };
  const handleModalAction = () => {
    setModalVisible(false);
    
    // 1. Si venimos de Salud
    if (origin === 'salud') {
      router.replace({ pathname: '/nuevo-registro-medico', params: { areteEscaneado: modalData.arete } });
      return;
    }

    // 2. Si venimos a buscar un Padre/Madre
    if (origin === 'padre' || origin === 'madre') {
      if (modalData.tipo === 'familiar_encontrado') {
        // Regresamos al formulario o al perfil pasándole el arete leído
        router.navigate({
          pathname: returnPath as any,
          params: { areteFamiliarEscaneado: modalData.arete, tipoFamiliar: origin, id: animalId }
        });
      } else {
        // Si no existe, lo mandamos a registrar un nuevo animal
        router.replace({ pathname: '/nuevo-animal', params: { areteEscaneado: modalData.arete } });
      }
      return;
    }

    // 3. Comportamiento Normal
    if (modalData.tipo === 'encontrado') {
      router.replace(`/animal/${modalData.id}`);
    } else {
      router.replace({ pathname: '/nuevo-animal', params: { areteEscaneado: modalData.arete } });
    }
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setTimeout(() => setScanned(false), 500); 
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />

      <View style={[styles.overlay, StyleSheet.absoluteFillObject]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><ChevronLeft color="white" size={36} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear Arete</Text>
          <View style={{ width: 46 }} />
        </View>

        <View style={styles.scannerWindow}>
          <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
          {procesando && <ActivityIndicator size="large" color={color} />}
        </View>

        <View style={styles.footer}><Text style={styles.instructionText}>Apunta al código del arete</Text></View>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={handleCerrarModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalIconContainer}>
              {origin === 'salud' ? (
                <Stethoscope color={color} size={60} />
              ) : modalData.tipo === 'familiar_encontrado' ? (
                <Users color={color} size={60} />
              ) : modalData.tipo === 'encontrado' ? (
                <CheckCircle color={color} size={60} />
              ) : (
                <PlusCircle color="#F59E0B" size={60} />
              )}
            </View>

            <Text style={styles.modalTitle}>{modalData.titulo}</Text>
            <Text style={styles.modalSubtitle}>{modalData.mensaje}</Text>
            
            <View style={styles.areteTag}><Text style={styles.areteTagText}>{modalData.arete}</Text></View>

            <TouchableOpacity style={[styles.modalBtnAction, { backgroundColor: (modalData.tipo === 'encontrado' || modalData.tipo === 'familiar_encontrado' || origin === 'salud') ? color : '#F59E0B' }]} onPress={handleModalAction}>
              <Text style={styles.modalBtnActionText}>
                {origin === 'salud' ? 'Usar en Área Médica' : modalData.tipo === 'familiar_encontrado' ? 'Regresar y Enlazar' : modalData.tipo === 'encontrado' ? 'Ver Ficha del Animal' : 'Registrar Animal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={handleCerrarModal}>
              <Text style={styles.modalBtnCancelText}>Volver a escanear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { color: 'white', textAlign: 'center', marginBottom: 20 },
  btn: { padding: 15, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', zIndex: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  iconBtn: { padding: 10 },
  scannerWindow: { alignSelf: 'center', width: 250, height: 250, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  footer: { padding: 40, alignItems: 'center', marginBottom: 20 },
  instructionText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 20 },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalIconContainer: { marginBottom: 15 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 5 },
  modalSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  areteTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#E5E7EB' },
  areteTagText: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: 2 },
  modalBtnAction: { width: '100%', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
  modalBtnActionText: { color: 'white', fontSize: 16, fontWeight: '800' },
  modalBtnCancel: { width: '100%', padding: 15, borderRadius: 16, alignItems: 'center' },
  modalBtnCancelText: { color: '#6B7280', fontSize: 16, fontWeight: '700' }
});