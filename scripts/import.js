/**
 * import.js — Full MongoDB → Neon PostgreSQL import
 *
 * Reads all 8 JSON files from ../mongodb-export/ and loads them into
 * the existing Neon database used by the Spring Boot API.
 *
 * Run:  node import.js
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING on unique keys.
 */

'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const DB_URL = 'postgresql://neondb_owner:npg_wWQz47ALcopb@ep-empty-wave-anxnq609-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const EXPORT_DIR = path.join(__dirname, '../mongodb-export');
const BATCH = 500; // rows per INSERT batch

// ── Helpers ───────────────────────────────────────────────────────────────────

function load(file) {
  const p = path.join(EXPORT_DIR, file);
  console.log(`  Loading ${file}...`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ts(val) {
  if (!val) return null;
  if (typeof val === 'object' && val.$date) return new Date(val.$date).toISOString();
  return new Date(val).toISOString();
}

async function batchInsert(client, table, cols, rows, onConflict = 'DO NOTHING') {
  if (!rows.length) { console.log(`    (0 rows — skipped)`); return; }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const placeholders = chunk.map((_, ri) =>
      '(' + cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ') + ')'
    ).join(', ');
    const values = chunk.flatMap(r => cols.map(c => r[c] ?? null));
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${placeholders} ON CONFLICT ${onConflict}`;
    await client.query(sql, values);
    inserted += chunk.length;
    process.stdout.write(`\r    Inserted ${inserted}/${rows.length}...`);
  }
  console.log(`\r    ✓ ${inserted} rows → ${table}          `);
}

// ── Migration: create missing tables ─────────────────────────────────────────

async function runMigration(client) {
  console.log('\n[1/8] Running migration 003 (commands, heartbeats, data_updates, master_logs)...');
  const sql = fs.readFileSync(
    path.join(__dirname, '../apps/api/migrations/003_import_tables.sql'),
    'utf8'
  );
  await client.query(sql);
  console.log('  ✓ Migration 003 applied');
}

// ── Import: nodes ─────────────────────────────────────────────────────────────

async function importNodes(client) {
  console.log('\n[2/8] Importing nodes...');
  const data = load('nodes.json');
  const rows = data.map(n => ({
    node_id:       String(n.node_id),
    name:          'Node ' + n.node_id,
    latitude:      n.latitude,
    longitude:     n.longitude,
    current_level: n.current_level ?? 0,
    is_dead:       n.is_dead ?? false,
    area:          'Kuching',
    location:      'Sarawak',
    state:         'Sarawak',
    last_updated:  ts(n.last_updated),
    created_at:    ts(n.created_at),
  }));
  await batchInsert(client, 'nodes',
    ['node_id','name','latitude','longitude','current_level','is_dead','area','location','state','last_updated','created_at'],
    rows,
    '(node_id) DO UPDATE SET current_level = EXCLUDED.current_level, is_dead = EXCLUDED.is_dead, last_updated = EXCLUDED.last_updated'
  );
}

// ── Import: events ────────────────────────────────────────────────────────────

async function importEvents(client) {
  console.log('\n[3/8] Importing events (200,500 records — this may take a minute)...');

  // Check existing count to skip if already imported
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*) as count FROM events');
  if (parseInt(count) > 100000) {
    console.log(`  ✓ Events already imported (${count} rows) — skipping`);
    return;
  }

  const data = load('events.json');
  const rows = data.map(e => ({
    node_id:    String(e.node_id),
    event_type: String(e.event_type),
    new_level:  e.new_level ?? null,
    created_at: ts(e.created_at) ?? new Date().toISOString(),
  }));
  await batchInsert(client, 'events',
    ['node_id','event_type','new_level','created_at'],
    rows,
    'DO NOTHING'
  );
}

// ── Import: commands ──────────────────────────────────────────────────────────

async function importCommands(client) {
  console.log('\n[4/8] Importing commands...');
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*) as count FROM commands');
  if (parseInt(count) > 0) { console.log(`  ✓ Already imported (${count} rows) — skipping`); return; }
  const data = load('commands.json');
  const rows = data.map(c => ({
    command_id:       c.command_id ?? null,
    node_id:          String(c.node_id),
    from_master:      String(c.from ?? ''),
    to_node:          String(c.to ?? ''),
    action:           String(c.action ?? ''),
    timestamp:        ts(c.timestamp),
    status:           String(c.status ?? ''),
    ack_received:     c.ack?.received ?? false,
    ack_response_time: ts(c.ack?.response_time),
  }));
  await batchInsert(client, 'commands',
    ['command_id','node_id','from_master','to_node','action','timestamp','status','ack_received','ack_response_time'],
    rows, 'DO NOTHING'
  );
}

// ── Import: heartbeats ────────────────────────────────────────────────────────

async function importHeartbeats(client) {
  console.log('\n[5/8] Importing heartbeats...');
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*) as count FROM heartbeats');
  if (parseInt(count) > 0) { console.log(`  ✓ Already imported (${count} rows) — skipping`); return; }
  const data = load('heartbeats.json');
  const rows = data.map(h => ({
    node_id:       String(h.node_id),
    timestamp:     ts(h.timestamp),
    status:        String(h.status ?? ''),
    checked_by:    h.master_check?.checkedBy ?? null,
    response_time: ts(h.master_check?.responseTime),
  }));
  await batchInsert(client, 'heartbeats',
    ['node_id','timestamp','status','checked_by','response_time'],
    rows, 'DO NOTHING'
  );
}

// ── Import: data_updates ──────────────────────────────────────────────────────

async function importDataUpdates(client) {
  console.log('\n[6/8] Importing data_updates...');
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*) as count FROM data_updates');
  if (parseInt(count) > 0) { console.log(`  ✓ Already imported (${count} rows) — skipping`); return; }
  const data = load('data_updates.json');
  const rows = data.map(d => ({
    node_id:     String(d.node_id),
    timestamp:   ts(d.timestamp),
    water_level: d.sensor_data?.water_level ?? null,
    temperature: d.sensor_data?.temperature ?? null,
    humidity:    d.sensor_data?.humidity ?? null,
    latitude:    d.gps_data?.latitude ?? null,
    longitude:   d.gps_data?.longitude ?? null,
    raw_message: d.raw_message ?? null,
  }));
  await batchInsert(client, 'data_updates',
    ['node_id','timestamp','water_level','temperature','humidity','latitude','longitude','raw_message'],
    rows, 'DO NOTHING'
  );
}

// ── Import: master_logs ───────────────────────────────────────────────────────

async function importMasterLogs(client) {
  console.log('\n[7/8] Importing master_logs...');
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*) as count FROM master_logs');
  if (parseInt(count) > 0) { console.log(`  ✓ Already imported (${count} rows) — skipping`); return; }
  const data = load('master_logs.json');
  const rows = data.map(m => ({
    log_id:          m.log_id ?? null,
    master_id:       String(m.master_id ?? ''),
    action:          String(m.action ?? ''),
    timestamp:       ts(m.timestamp),
    node_id:         m.details?.node_id ?? null,
    analysis_result: m.details?.analysis_result ?? null,
    issued_command:  m.details?.issued_command ?? null,
  }));
  await batchInsert(client, 'master_logs',
    ['log_id','master_id','action','timestamp','node_id','analysis_result','issued_command'],
    rows, 'DO NOTHING'
  );
}

// ── Import: users (skip — already have admin@floodmanagement.com) ─────────────

async function importUsers(client) {
  console.log('\n[8/8] Skipping user import — admin@floodmanagement.com already seeded.');
  console.log('  (user_admins.json and user_customers.json data preserved for reference)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

async function printSummary(client) {
  console.log('\n── Row counts ───────────────────────────────────────');
  const tables = ['users','nodes','events','commands','heartbeats','data_updates','master_logs','blogs','zones','broadcasts','reports','safety_content'];
  for (const t of tables) {
    try {
      const { rows: [{ count }] } = await client.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`  ${t.padEnd(20)} ${count.toString().padStart(8)} rows`);
    } catch { console.log(`  ${t.padEnd(20)} (table not found)`); }
  }
  console.log('─────────────────────────────────────────────────────\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Flood Monitoring — MongoDB → Neon Import ===\n');
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✓ Connected to Neon PostgreSQL');

  try {
    await runMigration(client);
    await importNodes(client);
    await importEvents(client);
    await importCommands(client);
    await importHeartbeats(client);
    await importDataUpdates(client);
    await importMasterLogs(client);
    await importUsers(client);
    await printSummary(client);
    console.log('✓ Import complete.');
  } catch (err) {
    console.error('\n✗ Import failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
