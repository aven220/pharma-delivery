import * as Network from 'expo-network';

/**
 * ¿Hay interfaz de red usable para hablar con el API?
 * En WiFi LAN a veces isInternetReachable=false aunque el servidor local sí responda.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) return false;
    // false estricto = sin ruta; en LAN igual intentamos (el login valida de verdad)
    return true;
  } catch {
    return true;
  }
}

export async function hasInternet(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable);
  } catch {
    return false;
  }
}
