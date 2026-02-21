const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middlewares/auth');

// Protect all routes
router.use(authMiddleware);

const ALLOWED_FIELDS = [
  'title', 'description', 'status', 'priority', 'effort',
  'task_type', 'project', 'assignee', 'started_at', 'finished_at', 'updated_at',
];

// ─── GET /api/tasks ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let tasks;
    if (status) {
      tasks = db.prepare(
        'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC'
      ).all(status);
    } else {
      tasks = db.prepare(
        'SELECT * FROM tasks ORDER BY created_at DESC'
      ).all();
    }
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// ─── GET /api/tasks/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tarea' });
  }
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { title, description, status, priority, effort, task_type, project, assignee } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, description, status, priority, effort, task_type, project, assignee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || '',
      status || 'BACKLOG',
      priority || 'Medio',
      effort || 'Medio',
      task_type || '',
      project || '',
      assignee || ''
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(task);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// ─── PATCH /api/tasks/:id ────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    const updates = { ...req.body };
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Auto-fill started_at when moving to EN PROGRESO
    if (updates.status === 'EN PROGRESO' && !existing.started_at) {
      updates.started_at = now;
    }

    // Auto-fill finished_at when moving to PARA REVISAR
    if (updates.status === 'PARA REVISAR' && !existing.finished_at) {
      updates.finished_at = now;
    }

    updates.updated_at = now;

    const fields = Object.keys(updates).filter(k => ALLOWED_FIELDS.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), req.params.id];

    db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(task);
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// ─── DELETE /api/tasks/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

module.exports = router;
