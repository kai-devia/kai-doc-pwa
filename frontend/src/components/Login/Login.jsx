import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Login.module.css';

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(user, password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.logo}>🧠</div>
        <h1 className={styles.title}>KAI DOC</h1>
        <p className={styles.subtitle}>Ventana a la mente de Kai</p>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.field}>
          <label htmlFor="user">Usuario</label>
          <input
            id="user"
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            required
          />
        </div>
        
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            required
          />
        </div>
        
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
