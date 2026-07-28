import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/auth.store';
import { BrandConfig, ROLE_LABELS } from '../../constants/labels';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const appVersion = Constants.expoConfig?.version ?? BrandConfig.version;

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil · {BrandConfig.shortName}</Text>
      {user && (
        <View style={styles.card}>
          <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>
            {ROLE_LABELS[user.role?.name] || user.role?.name || 'Sin rol'}
          </Text>
          <Text style={styles.version}>{BrandConfig.appName} v{appVersion}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  role: { fontSize: 12, color: '#2563eb', marginTop: 8, fontWeight: '600' },
  version: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: 8, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
