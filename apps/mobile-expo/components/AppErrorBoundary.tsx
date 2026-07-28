import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { API_URL } from '../config/api';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Evita cierre forzado: muestra el error en pantalla en lugar de tumbar el proceso. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[A-AS] ErrorBoundary', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.box}>
        <Text style={styles.title}>Error al iniciar</Text>
        <Text style={styles.msg}>{this.state.error.message}</Text>
        <Text style={styles.meta}>API: {API_URL}</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.btnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  msg: { color: '#fca5a5', fontSize: 14, marginBottom: 12 },
  meta: { color: '#94a3b8', fontSize: 12, marginBottom: 24 },
  btn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
