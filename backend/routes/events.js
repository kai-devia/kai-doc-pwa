const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middlewares/auth');

// Protect all routes
router.use(authMiddleware);

const ALLOWED_FIELDS = [
  'name', 'description', 'status', 'owner', 'notify',
  'schedule', 'last_run', 'updated_at',
];

// ─── GET /api/events ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const events = db.prepare(
      'SELECT * FROM events ORDER BY created_at DESC'
    ).all();
    res.json(events);
  } catch (err) {
    console.error('GET /api/events error:', err);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// ─── GET /api/events/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener evento' });
  }
});

// ─── POST /api/events ────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { name, description, status, owner, notify, schedule } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = db.prepare(`
      INSERT INTO events (name, description, status, owner, notify, schedule)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      description || '',
      status || 'FINALIZADO',
      owner || 'Kai',
      notify || 'NO',
      schedule || ''
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(event);
  } catch (err) {
    console.error('POST /api/events error:', err);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

// ─── PATCH /api/events/:id ───────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evento no encontrado' });

    const updates = { ...req.body };
    updates.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const fields = Object.keys(updates).filter(k => ALLOWED_FIELDS.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), req.params.id];

    db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...values);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json(event);
  } catch (err) {
    console.error('PATCH /api/events error:', err);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

// ─── DELETE /api/events/:id ──────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evento no encontrado' });

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Evento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

module.exports = router;
