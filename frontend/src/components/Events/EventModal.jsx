import { useState, useEffect } from 'react';
import styles from './Events.module.css';

const STATUSES = ['PROCESANDO', 'FINALIZADO', 'PAUSADO', 'ERRORES'];
const NOTIFY_OPTIONS = ['NO', 'TELEGRAM', 'MAIL', 'SI'];

const EMPTY = {
  name: '',
  description: '',
  status: 'FINALIZADO',
  owner: 'Kai',
  notify: 'NO',
  schedule: '',
};

export default function EventModal({ event, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    event ? { ...event } : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{event ? '✏️ Editar Evento' : '➕ Nuevo Evento'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGroup}>
            <label>Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Nombre del evento"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Descripción</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Descripción del evento"
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Estado</label>
              <select value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Notificar</label>
              <select value={form.notify} onChange={set('notify')}>
                {NOTIFY_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Owner</label>
              <input
                type="text"
                value={form.owner}
                onChange={set('owner')}
                placeholder="ej. Kai, Guille"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={set('schedule')}
                placeholder="ej. cada 30 min, diario 9am"
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
