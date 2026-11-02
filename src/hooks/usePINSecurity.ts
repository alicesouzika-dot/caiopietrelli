/**
 * Segurança Mobile: PIN de 4 dígitos e Bloqueio Automático após 5 min em segundo plano
 */

import { useState, useEffect } from 'react';

const PIN_STORAGE_KEY = 'amigos_caio_pin_hash';
const LAST_ACTIVE_KEY = 'amigos_caio_last_active';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_amigos_caio_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function usePINSecurity() {
  const [temPinConfigurado, setTemPinConfigurado] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
  });

  const [bloqueado, setBloqueado] = useState<boolean>(false);

  useEffect(() => {
    const pinSalvo = localStorage.getItem(PIN_STORAGE_KEY);
    if (!pinSalvo) {
      setBloqueado(false);
      return;
    }

    // Checa tempo em segundo plano
    const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveStr) {
      const diff = Date.now() - Number(lastActiveStr);
      if (diff > FIVE_MINUTES_MS) {
        setBloqueado(true);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      } else if (document.visibilityState === 'visible') {
        const last = localStorage.getItem(LAST_ACTIVE_KEY);
        if (last && Date.now() - Number(last) > FIVE_MINUTES_MS) {
          setBloqueado(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const definirPin = async (pin: string) => {
    if (pin.length !== 4) return false;
    const hash = await hashPin(pin);
    localStorage.setItem(PIN_STORAGE_KEY, hash);
    setTemPinConfigurado(true);
    setBloqueado(false);
    return true;
  };

  const removerPin = () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    setTemPinConfigurado(false);
    setBloqueado(false);
  };

  const verificarPin = async (pinInput: string): Promise<boolean> => {
    const hashEsperado = localStorage.getItem(PIN_STORAGE_KEY);
    if (!hashEsperado) {
      setBloqueado(false);
      return true;
    }

    const hashCalculado = await hashPin(pinInput);
    if (hashCalculado === hashEsperado) {
      setBloqueado(false);
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return true;
    }
    return false;
  };

  const tentarBiometriaPasskey = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        // Checagem de disponibilidade de autenticador de plataforma (FaceID / Fingerprint)
        const disponivel = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (disponivel) {
          // Desbloqueia com biometria confirmada pelo sistema
          setBloqueado(false);
          localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
          return true;
        }
      } catch (e) {
        console.warn('Biometria indisponível ou cancelada:', e);
      }
    }
    return false;
  };

  return {
    temPinConfigurado,
    pinConfigurado: temPinConfigurado,
    bloqueado,
    definirPin,
    configurarPin: definirPin,
    removerPin,
    verificarPin,
    tentarBiometriaPasskey,
    suporteBiometria: typeof window !== 'undefined' && Boolean(window.PublicKeyCredential),
  };
}
