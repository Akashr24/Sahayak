/**
 * database/init_db.js
 * Sahayak Community Assistance Platform — Database Verification & Init Tool
 *
 * Run with: node database/init_db.js
 * This script is SAFE to run multiple times (all operations use IF NOT EXISTS / INSERT OR IGNORE).
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, 'sahayak.db');
const schemaPath = join(__dirname, 'schema.sql');

console.log('──────────────────────────────────────────────');
console.log('  Sahayak Database Initializer');
console.log('──────────────────────────────────────────────');
console.log(`  DB Path     : ${dbPath}`);
console.log(`  Schema Path : ${schemaPath}`);
console.log('──────────────────────────────────────────────');

if (!existsSync(dbPath)) {
  console.log('⚡ Database file not found. Creating new sahayak.db...');
} else {
  console.log('✅ Database file exists.');
}

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');

// Verify core tables
const tables = ['senior_citizens', 'volunteers', 'requests', 'emergency_records', 'audit_logs', 'shirva_locations'];
const existing = sqlite.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${tables.map(() => '?').join(',')})`
).all(...tables).map(r => r.name);

console.log('\n📋 Table Status:');
for (const t of tables) {
  const found = existing.includes(t);
  console.log(`   ${found ? '✅' : '❌'} ${t}${found ? '' : ' — MISSING'}`);
}

const missingTables = tables.filter(t => !existing.includes(t));
if (missingTables.length > 0) {
  console.log('\n⚠️  Missing tables detected. Please start the backend server once to auto-initialize.');
  console.log('   Run: cd backend && node server.js');
} else {
  const volunteerCount = sqlite.prepare('SELECT COUNT(*) as c FROM volunteers').get().c;
  const seniorCount    = sqlite.prepare('SELECT COUNT(*) as c FROM senior_citizens').get().c;
  const requestCount   = sqlite.prepare('SELECT COUNT(*) as c FROM requests').get().c;

  console.log('\n📊 Record Counts:');
  console.log(`   Volunteers      : ${volunteerCount}`);
  console.log(`   Senior Citizens : ${seniorCount}`);
  console.log(`   Requests        : ${requestCount}`);
  console.log('\n✅ Database is healthy and ready.');
}

sqlite.close();
console.log('──────────────────────────────────────────────\n');
