import { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import {
  webauthnRegisterStart,
  webauthnRegisterFinish,
  getWebauthnCredentials,
  deleteWebauthnCredential,
} from '../../api/client';
import styles from './BiometricSettings.module.css';

export default function BiometricSettings({ onClose }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  useEffect(() => {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function'
    ) {
      setWebauthnSupported(true);
    }
    loadCredentials();
  }, []);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWebauthnCredentials();
      setCredentials(data.credentials || []);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    setMessage(null);

    try {
      // Step 1: Get registration options from server
      const options = await webauthnRegisterStart();

      // Step 2: Trigger browser biometric enrollment
      let attestation;
      try {
        attestation = await startRegistration(options);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setMessage({ type: 'error', text: 'Registro cancelado o no autorizado.' });
        } else if (err.name === 'InvalidStateError') {
          setMessage({ type: 'error', text: 'Este dispositivo ya está registrado.' });
        } else {
          setMessage({ type: 'error', text: 'Error del dispositivo: ' + err.message });
        }
        return;
      }

      // Step 3: Verify and save on server
      await webauthnRegisterFinish(attestation);

      setMessage({ type: 'success', text: '✅ Huella registrada correctamente' });
      await loadCredentials();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error registrando huella' });
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta huella registrada?')) return;
    setMessage(null);

    try {
      await deleteWebauthnCredential(id);
      setMessage({ type: 'success', text: '🗑️ Huella eliminada' });
      await loadCredentials();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error eliminando huella' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'Z').toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>🔐 Autenticación biométrica</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.body}>
          {!webauthnSupported ? (
            <div className={styles.unsupported}>
              <p>⚠️ Tu navegador no soporta autenticación biométrica (WebAuthn).</p>
              <p>Usa Chrome, Safari o Edge en un dispositivo moderno.</p>
            </div>
          ) : (
            <>
              {message && (
                <div className={message.type === 'success' ? styles.success : styles.error}>
                  {message.text}
                </div>
              )}

              {loading ? (
                <p className={styles.hint}>Cargando...</p>
              ) : credentials.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.hint}>No tienes ninguna huella registrada.</p>
                  <p className={styles.hint}>
                    Al registrar tu huella, podrás entrar a la app sin escribir tu contraseña.
                  </p>
                </div>
              ) : (
                <div className={styles.credentialsList}>
                  <p className={styles.sectionLabel}>Dispositivos registrados</p>
                  {credentials.map((cred) => (
                    <div key={cred.id} className={styles.credentialItem}>
                      <div className={styles.credentialInfo}>
                        <span className={styles.credIcon}>📱</span>
                        <div>
                          <div className={styles.credType}>
                            {cred.device_type === 'multiDevice' ? 'Multi-dispositivo' : 'Dispositivo único'}
                          </div>
                          <div className={styles.credDate}>
                            Registrado el {formatDate(cred.created_at)}
                          </div>
                        </div>
                      </div>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(cred.id)}
                        title="Eliminar huella"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className={styles.registerBtn}
                onClick={handleRegister}
                disabled={registering}
              >
                {registering
                  ? '⏳ Registrando...'
                  : credentials.length > 0
                  ? '➕ Registrar otro dispositivo'
                  : '🔐 Registrar huella digital'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
