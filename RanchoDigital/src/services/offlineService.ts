import AsyncStorage from '@react-native-async-storage/async-storage';

// Guardar datos en el celular
export const guardarCacheLocal = async (llave: string, datos: any) => {
  try {
    const jsonValue = JSON.stringify(datos);
    await AsyncStorage.setItem(llave, jsonValue);
  } catch (e) {
    console.log(`Error guardando en caché la llave ${llave}:`, e);
  }
};

// Leer datos del celular
export const obtenerCacheLocal = async (llave: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(llave);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.log(`Error leyendo caché de la llave ${llave}:`, e);
    return null;
  }
};