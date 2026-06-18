import * as Network from 'expo-network';

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!(state.isConnected && state.isInternetReachable !== false);
}
