import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { syncOfflineQueue, performFullSync, isOnline } from '../../sync/syncManager';
import { getPendingSyncCount } from '../../database/deliveries.repo';

export default function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSync = async () => {
    setSyncing(true);
    setResult('');
    try {
      const online = await isOnline();
      if (!online) {
        setResult('Sin conexión a internet');
        return;
      }
      const syncResult = await syncOfflineQueue();
      await performFullSync();
      const pending = await getPendingSyncCount();
      setResult(`Sincronizado: ${syncResult.synced} | Fallidos: ${syncResult.failed} | Pendientes: ${pending}`);
    } catch {
      setResult('Error en sincronización');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sincronización Offline</Text>
      <Text style={styles.description}>
        Los cambios realizados sin internet se guardan localmente en SQLite y se sincronizan automáticamente al reconectar.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSync} disabled={syncing}>
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sincronizar ahora</Text>
        )}
      </TouchableOpacity>

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 24 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  result: { marginTop: 16, fontSize: 14, color: '#334155', textAlign: 'center' },
});
