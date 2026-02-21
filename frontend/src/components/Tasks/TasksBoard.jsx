import { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../../api/client';
import TaskModal from './TaskModal';
import styles from './Tasks.module.css';

const STATUSES = [
  'BACKLOG',
  'ANALIZANDO',
  'LISTO PARA EMPEZAR',
  'EN PROGRESO',
  'PARA REVISAR',
  'FINALIZADO',
];

const PRIORITY_COLORS = {
  Alta: 'var(--danger)',
  Medio: 'var(--warning)',
  Baja: 'var(--success)',
};

const STATUS_COLORS = {
  BACKLOG: '#555',
  ANALIZANDO: '#7c6af7',
  'LISTO PARA EMPEZAR': '#06b6d4',
  'EN PROGRESO': '#f59e0b',
  'PARA REVISAR': '#ec4899',
  FINALIZADO: 'var(--success)',
};

function formatDate(str) {
  if (!str) return null;
  return new Date(str).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function TaskCard({ task, onEdit, onDelete, onMove }) {
  const nextStatus = STATUSES[STATUSES.indexOf(task.status) + 1];
  const priorityColor = PRIORITY_COLORS[task.priority] || '#888';

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{task.title}</span>
        {task.project && (
          <span className={styles.projectTag}>{task.project}</span>
        )}
      </div>

      {task.description && (
        <p className={styles.cardDesc}>{task.description}</p>
      )}

      <div className={styles.cardBadges}>
        <span
          className={styles.badge}
          style={{ background: `${priorityColor}22`, color: priorityColor, borderColor: `${priorityColor}44` }}
        >
          {task.priority}
        </span>
        <span className={styles.badgeNeutral}>{task.effort}</span>
        {task.task_type && (
          <span className={styles.badgeNeutral}>{task.task_type}</span>
        )}
      </div>

      {task.assignee && (
        <div className={styles.cardAssignee}>👤 {task.assignee}</div>
      )}

      {(task.started_at || task.finished_at) && (
        <div className={styles.cardDates}>
          {task.started_at && <span>▶ {formatDate(task.started_at)}</span>}
          {task.finished_at && <span>✓ {formatDate(task.finished_at)}</span>}
        </div>
      )}

      <div className={styles.cardActions}>
        {nextStatus && (
          <button
            className={styles.moveBtn}
            onClick={() => onMove(task, nextStatus)}
            title={`Mover a ${nextStatus}`}
          >
            → {nextStatus.length > 12 ? nextStatus.slice(0, 12) + '…' : nextStatus}
          </button>
        )}
        <button className={styles.editBtn} onClick={() => onEdit(task)} title="Editar">
          ✏️
        </button>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Eliminar">
          🗑️
        </button>
      </div>
    </div>
  );
}

function Column({ status, tasks, onNewTask, onEdit, onDelete, onMove }) {
  const color = STATUS_COLORS[status];

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader} style={{ borderTopColor: color }}>
        <span className={styles.columnTitle}>{status}</span>
        <span className={styles.columnCount} style={{ background: color }}>
          {tasks.length}
        </span>
      </div>

      <div className={styles.columnCards}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
      </div>

      <button
        className={styles.newTaskBtn}
        onClick={() => onNewTask(status)}
      >
        + Nueva tarea
      </button>
    </div>
  );
}

export default function TasksBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { task?, initialStatus? }

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.task) {
      const updated = await updateTask(modal.task.id, form);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await createTask(form);
      setTasks((prev) => [created, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMove = async (task, nextStatus) => {
    const updated = await updateTask(task.id, { status: nextStatus });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>Cargando tareas...</p>
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
    <div className={styles.boardWrapper}>
      <div className={styles.boardHeader}>
        <h1 className={styles.boardTitle}>📋 Registro de Tareas</h1>
        <button
          className={styles.newBtn}
          onClick={() => setModal({ task: null, initialStatus: 'BACKLOG' })}
        >
          + Nueva Tarea
        </button>
      </div>

      <div className={styles.board}>
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onNewTask={(s) => setModal({ task: null, initialStatus: s })}
            onEdit={(task) => setModal({ task })}
            onDelete={handleDelete}
            onMove={handleMove}
          />
        ))}
      </div>

      {modal !== null && (
        <TaskModal
          task={modal.task}
          initialStatus={modal.initialStatus}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
