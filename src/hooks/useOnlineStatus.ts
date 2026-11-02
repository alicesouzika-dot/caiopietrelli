/**
 * Hook de Estado de Conectividade e Fila de Sincronização Offline
 */

import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { sincronizarPush } from '../lib/sync';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [filaCount, setFilaCount] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const atualizarFila = async () => {
    try {
      const count = await db.fila.count();
      setFilaCount(count);
    } catch {
      setFilaCount(0);
    }
  };

  useEffect(() => {
    atualizarFila();

    const handleOnline = async () => {
      setIsOnline(true);
      setSincronizando(true);
      await sincronizarPush();
      setSincronizando(false);
      atualizarFila();
    };

    const handleOffline = () => {
      setIsOnline(false);
      atualizarFila();
    };

    const handleStorageUpdate = () => {
      atualizarFila();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('amigos_caio_storage_update', handleStorageUpdate);
    window.addEventListener('amigos_caio_sync_completed', handleStorageUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('amigos_caio_storage_update', handleStorageUpdate);
      window.removeEventListener('amigos_caio_sync_completed', handleStorageUpdate);
    };
  }, []);

  const forcarSincronizacao = async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    await sincronizarPush();
    setSincronizando(false);
    atualizarFila();
  };

  return { isOnline, filaCount, sincronizando, forcarSincronizacao };
}
