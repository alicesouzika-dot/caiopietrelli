/**
 * Feedback Háptico para Mobile (Vibration API)
 * Respeita preferências do usuário e não quebra em dispositivos sem suporte
 */

export function hapticTouch() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(10);
    } catch {}
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(25);
    } catch {}
  }
}

export function hapticError() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 50, 40]);
    } catch {}
  }
}
