import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env['DB_PATH'] || './data/trip-computer.db';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(): void {
  const resolvedPath = path.resolve(DB_PATH);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  migrateDb();
  console.log(`Database initialized at ${resolvedPath}`);
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      registration TEXT,
      tank_capacity_litres REAL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00', 'now'))
    );

    CREATE TABLE IF NOT EXISTS fillups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      filled_at TEXT NOT NULL,
      litres_added REAL NOT NULL,
      price_per_litre REAL NOT NULL,
      total_price REAL NOT NULL,
      trip_km REAL,
      odometer REAL,
      location_name TEXT,
      latitude REAL,
      longitude REAL,
        notes TEXT,
        is_partial INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00', 'now'))
    );


    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00', 'now'))
    );
  `);
}

  function migrateDb(): void {
    const cols = (db.pragma('table_info(fillups)') as { name: string }[]).map(c => c.name);
    if (!cols.includes('is_partial')) {
      db.exec('ALTER TABLE fillups ADD COLUMN is_partial INTEGER NOT NULL DEFAULT 0');
    }
  }
