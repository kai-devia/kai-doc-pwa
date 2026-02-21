import { useState, useEffect } from 'react';
import styles from './Tasks.module.css';

const STATUSES = [
  'BACKLOG', 'ANALIZANDO', 'LISTO PARA EMPEZAR',
  'EN PROGRESO', 'PARA REVISAR', 'FINALIZADO',
];

const PRIORITIES = ['Alta', 'Medio', 'Baja'];
const EFFORTS = ['Pequeño', 'Medio', 'Grande'];

const EMPTY = {
  title: '',
  description: '',
  status: 'BACKLOG',
  priority: 'Medio',
  effort: 'Medio',
  task_type: '',
  project: '',
  assignee: '',
};

export default function TaskModal({ task, initialStatus, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    task ? { ...task } : { ...EMPTY, status: initialStatus || 'BACKLOG' }
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
    if (!form.title.trim()) {
      setError('El título es requerido');
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
          <h2>{task ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGroup}>
            <label>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder="Título de la tarea"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Descripción</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Descripción opcional"
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
              <label>Prioridad</label>
              <select value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Esfuerzo</label>
              <select value={form.effort} onChange={set('effort')}>
                {EFFORTS.map((ef) => (
                  <option key={ef} value={ef}>{ef}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tipo de tarea</label>
              <input
                type="text"
                value={form.task_type}
                onChange={set('task_type')}
                placeholder="ej. Bug, Feature..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Proyecto</label>
              <input
                type="text"
                value={form.project}
                onChange={set('project')}
                placeholder="Nombre del proyecto"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Asignado a</label>
            <input
              type="text"
              value={form.assignee}
              onChange={set('assignee')}
              placeholder="ej. Kai, Guille"
            />
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
