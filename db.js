const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class Database {
  constructor(dbPath, config) {
    this.config = config;
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath);
    this.init();
    
    // Setup backup if enabled
    if (config.database.backup.enabled) {
      this.setupBackup();
    }
  }

  init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS strikes (
        user_id TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS bans (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        banned_by TEXT,
        banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        user_id TEXT,
        moderator_id TEXT,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getStrikes(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT count FROM strikes WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          resolve(row ? row.count : 0);
        }
      );
    });
  }

  async addStrike(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO strikes (user_id, count) 
         VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET 
         count = count + 1,
         last_updated = CURRENT_TIMESTAMP`,
        [userId],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  async resetStrikes(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM strikes WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  async getAllStrikes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT user_id, count, last_updated FROM strikes',
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }

  async banUser(userId, reason, moderatorId, expiresAt = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO bans (user_id, reason, banned_by, expires_at)
         VALUES (?, ?, ?, ?)`,
        [userId, reason, moderatorId, expiresAt],
        (err) => {
          if (err) reject(err);
          this.logModeration('ban', userId, moderatorId, reason);
          resolve();
        }
      );
    });
  }

  async unbanUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM bans WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) reject(err);
          this.logModeration('unban', userId, 'system', 'Ban lifted');
          resolve();
        }
      );
    });
  }

  async isBanned(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM bans WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
        [userId],
        (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        }
      );
    });
  }

  async logModeration(action, userId, moderatorId, reason) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO moderation_logs (action, user_id, moderator_id, reason)
         VALUES (?, ?, ?, ?)`,
        [action, userId, moderatorId, reason],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  async getModerationLogs(userId = null, limit = 100) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM moderation_logs';
      const params = [];

      if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  async backup() {
    const backupDir = this.config.database.backup.path;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    try {
      await execAsync(`sqlite3 ${this.config.database.path} ".backup '${backupPath}'"`);
      console.log(`Backup created: ${backupPath}`);
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  setupBackup() {
    setInterval(() => {
      this.backup();
    }, this.config.database.backup.interval * 1000);
  }

  close() {
    this.db.close();
  }
}

module.exports = Database; 