import { useCallback, useEffect, useState } from 'react';
import { apiFetch, guardarToken, leerTokenGuardado } from '../api/client';

export function useAuth() {
  const [token, setToken] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [error, setError] = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    leerTokenGuardado().then((tokenGuardado) => {
      if (!activo) return;
      if (tokenGuardado) setToken(tokenGuardado);
      setVerificandoSesion(false);
    });
    return () => { activo = false; };
  }, []);

  const cerrarSesion = useCallback(async () => {
    await guardarToken(null);
    setToken(null);
    setVerificandoSesion(false);
  }, []);

  async function enviarFormulario() {
    setEnviando(true);
    setError('');
    try {
      const ruta = modoRegistro ? '/auth/registro' : '/auth/login';
      const cuerpo = modoRegistro ? { email, password, nombre } : { email, password };
      const respuesta = await apiFetch(ruta, { method: 'POST', body: cuerpo });
      await guardarToken(respuesta.token);
      setToken(respuesta.token);
    } catch (e) {
      const mensaje = String(e.message || '').toLowerCase();
      if (mensaje.includes('credencial') || mensaje.includes('password') || mensaje.includes('contraseña')) setError('El correo o la contraseña no son correctos.');
      else if (mensaje.includes('email') || mensaje.includes('correo') || mensaje.includes('usuario')) setError('Ese correo ya está registrado o no es válido.');
      else if (mensaje.includes('network') || mensaje.includes('fetch')) setError('No pudimos conectar con Vilai. Revisa tu conexión e inténtalo de nuevo.');
      else setError('No se pudo completar la solicitud. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return { token, setToken, verificandoSesion, setVerificandoSesion, error, setError, modoRegistro, setModoRegistro, nombre, setNombre, email, setEmail, password, setPassword, enviando, enviarFormulario, cerrarSesion };
}
