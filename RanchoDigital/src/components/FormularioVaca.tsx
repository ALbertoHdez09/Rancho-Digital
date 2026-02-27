import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../constants/Colors';
import { BotonRudo } from './BotonRudo';
import { supabase } from '../services/supabase';

export const FormularioVaca = () => {
  const [arete, setArete] = useState('');
  const [raza, setRaza] = useState('Holstein');
  const [genero, setGenero] = useState('Hembra');
  const [peso, setPeso] = useState('');

  const guardarAnimal = async () => {
    if (!arete || !peso) {
      Alert.alert('¡Cuidado!', 'El arete y el peso son obligatorios.');
      return;
    }

    const { error } = await supabase.from('animales').insert([
      { 
        arete_siniiga: arete, 
        raza, 
        genero, 
        peso_inicial: parseFloat(peso),
        proposito: 'Carne' 
      },
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Listo!', `Vaca ${arete} registrada correctamente.`);
      setArete('');
      setPeso('');
    }
  };

  return (
    <ScrollView style={styles.form}>
      <Text style={styles.label}>Número de Arete (SINIIGA)</Text>
      <TextInput 
        style={styles.input} 
        value={arete} 
        onChangeText={setArete} 
        placeholder="Ej: JAL-5421"
      />

      <Text style={styles.label}>Raza</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={raza} onValueChange={(item) => setRaza(item)}>
          <Picker.Item label="Holstein" value="Holstein" />
          <Picker.Item label="Angus" value="Angus" />
          <Picker.Item label="Charolais" value="Charolais" />
          <Picker.Item label="Beefmaster" value="Beefmaster" />
          <Picker.Item label="Brangus" value="Brangus" />
        </Picker>
      </View>

      <Text style={styles.label}>Peso Inicial (Kg)</Text>
      <TextInput 
        style={styles.input} 
        value={peso} 
        onChangeText={setPeso} 
        keyboardType="numeric" 
        placeholder="0.00"
      />

      <BotonRudo titulo="Guardar en Inventario" onPress={guardarAnimal} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  form: { padding: 10 },
  label: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
  input: { 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#DDD' 
  },
  pickerContainer: { 
    backgroundColor: 'white', 
    borderRadius: 10, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#DDD' 
  }
});