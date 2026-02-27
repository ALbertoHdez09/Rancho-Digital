import { View, Text, StyleSheet } from 'react-native';

export default function ReportesScreen() {
  return (
    <View style={styles.container}>
      <Text>Aquí irán las gráficas del rancho</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});