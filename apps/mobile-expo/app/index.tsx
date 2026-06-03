import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;

  return accessToken ? (
    <Redirect href="/(tabs)/deliveries" />
  ) : (
    <Redirect href="/login" />
  );
}
