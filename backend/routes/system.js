const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();

// Auth middleware
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  if (!verifyToken(authHeader.slice(7))) return res.status(401).json({ error: 'Invalid token' });
  next();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * CPU usage via /proc/stat sampling (500ms delta)
 * Works inside Docker — /proc/stat reflects the host kernel
 */
function getCpuUsage() {
  return new Promise((resolve) => {
    const readStat = () => {
      try {
        const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
        const parts = line.split(/\s+/).slice(1).map(Number);
        const idle = parts[3] + (parts[4] || 0); // idle + iowait
        const total = parts.reduce((a, b) => a + b, 0);
        return { idle, total };
      } catch { return { idle: 0, total: 1 }; }
    };

    const s1 = readStat();
    setTimeout(() => {
      const s2 = readStat();
      const idleDiff = s2.idle - s1.idle;
      const totalDiff = s2.total - s1.total;
      const usage = totalDiff === 0 ? 0 : ((totalDiff - idleDiff) / totalDiff) * 100;
      resolve(Math.round(usage * 10) / 10);
    }, 500);
  });
}

/**
 * RAM from /proc/meminfo — reflects host even inside Docker
 */
function getMemoryInfo() {
  try {
    const raw = fs.readFileSync('/proc/meminfo', 'utf8');
    const get = (key) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
      return m ? parseInt(m[1]) * 1024 : 0; // kB → bytes
    };
    const total = get('MemTotal');
    const available = get('MemAvailable');
    const used = total - available;
    return {
      total: Math.round(total / 1024 / 1024),       // MB
      used: Math.round(used / 1024 / 1024),
      free: Math.round(available / 1024 / 1024),
      percent: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 };
  }
}

/**
 * System uptime from /proc/uptime — reflects host
 */
function getUptime() {
  try {
    return Math.floor(parseFloat(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0]));
  } catch { return 0; }
}

/**
 * CPU model from /proc/cpuinfo
 */
function getCpuInfo() {
  try {
    const raw = fs.readFileSync('/proc/cpuinfo', 'utf8');
    const model = (raw.match(/^model name\s*:\s*(.+)$/m) || [])[1] || 'Unknown';
    const cores = (raw.match(/^processor\s*:/gm) || []).length;
    return { model: model.replace(/\s+/g, ' ').trim(), cores };
  } catch { return { model: 'Unknown', cores: 0 }; }
}

/**
 * Disk via df on /workspace (mounted host volume) — shows real host FS
 * Physical disk size from env var PHYSICAL_DISK_GB (set in docker-compose)
 */
function getDiskUsage() {
  return new Promise((resolve) => {
    exec('df -PBG /workspace 2>/dev/null', (err, stdout) => {
      if (err) return resolve({ total: 0, used: 0, free: 0, percent: 0 });
      try {
        // -P (POSIX) ensures no line wrapping. Format: FS Total Used Avail Use% Mounted
        const parts = stdout.trim().split('\n')[1].split(/\s+/);
        const partitionTotal = parseInt(parts[1]) || 0;
        const used = parseInt(parts[2]) || 0;
        const free = parseInt(parts[3]) || 0;
        const percent = parseInt(parts[4]) || 0;

        // If physical disk size is configured, use it as the "total"
        const physicalGB = parseInt(process.env.PHYSICAL_DISK_GB) || partitionTotal;

        resolve({ total: physicalGB, used, free: physicalGB - used, percent });
      } catch { resolve({ total: 0, used: 0, free: 0, percent: 0 }); }
    });
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/system/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const [cpuUsage, disk] = await Promise.all([getCpuUsage(), getDiskUsage()]);
    const { model, cores } = getCpuInfo();
    const memory = getMemoryInfo();
    const uptime = getUptime();

    res.json({
      cpu: { usage: cpuUsage, cores, model },
      memory,
      disk,
      uptime,
      platform: process.env.PLATFORM || 'linux',
      hostname: process.env.HOSTNAME || 'kai-pc',
    });
  } catch (err) {
    console.error('System metrics error:', err);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

/**
 * GET /api/system/subagents
 * TODO: Query OpenClaw internal API when available
 */
router.get('/subagents', (_req, res) => {
  res.json({ count: 0 });
});

module.exports = router;
