import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { homeRouteForUser } from '../lib/roles';

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;

  return accessToken ? (
    <Redirect href={homeRouteForUser(user)} />
  ) : (
    <Redirect href="/login" />
  );
}
