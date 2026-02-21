import { useState, useEffect, useCallback } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../api/client';
import EventModal from './EventModal';
import styles from './Events.module.css';

const STATUS_STYLES = {
  FINALIZADO:  { bg: '#4ade8022', color: 'var(--success)', border: '#4ade8044' },
  PROCESANDO:  { bg: '#60a5fa22', color: '#60a5fa',        border: '#60a5fa44' },
  PAUSADO:     { bg: '#6b728022', color: '#9ca3af',        border: '#6b728044' },
  ERRORES:     { bg: '#f8717122', color: 'var(--danger)',   border: '#f8717144' },
};

const NOTIFY_STYLES = {
  NO:       { bg: '#6b728022', color: '#9ca3af',        border: '#6b728044' },
  TELEGRAM: { bg: '#60a5fa22', color: '#60a5fa',        border: '#60a5fa44' },
  MAIL:     { bg: '#f9731622', color: '#fb923c',        border: '#f9731644' },
  SI:       { bg: '#a855f722', color: '#c084fc',        border: '#a855f744' },
};

function timeAgo(str) {
  if (!str) return '—';
  const diff = Date.now() - new Date(str).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function StatusBadge({ value }) {
  const s = STATUS_STYLES[value] || STATUS_STYLES.PAUSADO;
  return (
    <span
      className={styles.badge}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {value}
    </span>
  );
}

function NotifyBadge({ value }) {
  const s = NOTIFY_STYLES[value] || NOTIFY_STYLES.NO;
  return (
    <span
      className={styles.badge}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {value}
    </span>
  );
}

function EventRow({ event, onEdit, onDelete }) {
  const handleDelete = () => {
    if (window.confirm(`¿Eliminar el evento "${event.name}"?`)) {
      onDelete(event.id);
    }
  };

  return (
    <tr className={styles.tableRow}>
      <td className={styles.tdName}>
        <div className={styles.eventName}>{event.name}</div>
        {event.description && (
          <div className={styles.eventDesc}>{event.description}</div>
        )}
      </td>
      <td><StatusBadge value={event.status} /></td>
      <td className={styles.tdMeta}>{event.owner || '—'}</td>
      <td><NotifyBadge value={event.notify} /></td>
      <td className={styles.tdMeta}>{event.schedule || '—'}</td>
      <td className={styles.tdMeta}>{timeAgo(event.last_run)}</td>
      <td className={styles.tdActions}>
        <button className={styles.editBtn} onClick={() => onEdit(event)} title="Editar">
          ✏️
        </button>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Eliminar">
          🗑️
        </button>
      </td>
    </tr>
  );
}

export default function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { event? }

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.event) {
      const updated = await updateEvent(modal.event.id, form);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } else {
      const created = await createEvent(form);
      setEvents((prev) => [created, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>Cargando eventos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>⚠️ {error}</p>
        <button className={styles.retryBtn} onClick={load}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className={styles.panelWrapper}>
      <div className={styles.panelHeader}>
        <h1 className={styles.panelTitle}>⚡ Pulso de Eventos</h1>
        <button
          className={styles.newBtn}
          onClick={() => setModal({ event: null })}
        >
          + Nuevo Evento
        </button>
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay eventos registrados.</p>
          <button className={styles.newBtn} onClick={() => setModal({ event: null })}>
            + Crear primer evento
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Estado</th>
                <th>Owner</th>
                <th>Notificar</th>
                <th>Schedule</th>
                <th>Última ejecución</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={(ev) => setModal({ event: ev })}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <EventModal
          event={modal.event}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
