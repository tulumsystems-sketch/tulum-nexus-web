import React, { useEffect } from 'react';
import { forceLogoutToLogin, isSessionExpired, touchSessionActivity } from '../../utils/session';

/**
 * Cierra la sesión si el JWT venció o si no hubo actividad (mouse, teclado, click).
 */
export const IdleSessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    touchSessionActivity();

    const onActivity = () => touchSessionActivity();
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      if (isSessionExpired()) {
        forceLogoutToLogin();
      }
    }, 15000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
    };
  }, []);

  return <>{children}</>;
};
