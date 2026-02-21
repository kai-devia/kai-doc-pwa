import { useState } from 'react';
import styles from './Header.module.css';
import LiveBadge from './LiveBadge';
import BiometricSettings from '../../BiometricSettings/BiometricSettings';

export default function Header({ isConnected, onMenuClick, showMenuButton }) {
  const [showBiometric, setShowBiometric] = useState(false);

  const webauthnSupported =
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function';

  return (
    <>
      <header className={styles.header}>
        {showMenuButton && (
          <button className={styles.menuButton} onClick={onMenuClick} aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
        <div className={styles.title}>
          <span className={styles.logo}>🧠</span>
          <span className={styles.text}>KAI DOC</span>
        </div>

        <div className={styles.actions}>
          {webauthnSupported && (
            <button
              className={styles.biometricBtn}
              onClick={() => setShowBiometric(true)}
              title="Autenticación biométrica"
              aria-label="Ajustes de huella digital"
            >
              🔐
            </button>
          )}
          <LiveBadge isConnected={isConnected} />
        </div>
      </header>

      {showBiometric && (
        <BiometricSettings onClose={() => setShowBiometric(false)} />
      )}
    </>
  );
}
