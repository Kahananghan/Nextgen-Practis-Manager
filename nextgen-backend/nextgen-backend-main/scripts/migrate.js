// ============================================
// scripts/migrate.js - Migration Runner
// Runs new migrations since last run
// ============================================
require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const useSSL = process.env.DB_SSL === 'true'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: useSSL ? { rejectUnauthorized: false } : false
})

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function getExecutedMigrations() {
  const result = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
  )
  return result.rows.map(row => row.migration_name)
}

async function runMigration(filePath, fileName) {
  const sql = fs.readFileSync(filePath, 'utf8')
  
  try {
    console.log(`   Running ${fileName}...`)
    
    // Run migration in a transaction
    await pool.query('BEGIN')
    await pool.query(sql)
    await pool.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
      [fileName]
    )
    await pool.query('COMMIT')
    
    console.log(`   ✅ ${fileName} completed`)
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error(`   ❌ ${fileName} failed:`, error.message)
    throw error
  }
}

async function migrate() {
  try {
    console.log('\n🔄 Starting database migration...\n')

    // Ensure migrations tracking table exists
    await ensureMigrationsTable()

    // Get list of executed migrations
    const executed = await getExecutedMigrations()
    console.log(`📋 Previously executed: ${executed.length} migrations\n`)

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../sql/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    // Filter out already executed migrations
    const pending = migrationFiles.filter(file => !executed.includes(file))

    if (pending.length === 0) {
      console.log('✅ No new migrations to run. Database is up to date!\n')
      process.exit(0)
    }

    console.log(`🆕 Found ${pending.length} new migration(s) to run:\n`)
    pending.forEach(file => console.log(`   - ${file}`))
    console.log('')

    // Run pending migrations
    console.log('🔄 Executing migrations:\n')
    for (const file of pending) {
      const filePath = path.join(migrationsDir, file)
      await runMigration(filePath, file)
    }

    console.log('\n✅ All migrations completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   ✓ Previously executed: ${executed.length}`)
    console.log(`   ✓ Newly executed: ${pending.length}`)
    console.log(`   ✓ Total migrations: ${executed.length + pending.length}\n`)

    process.exit(0)
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    console.error('\n💡 The failed migration has been rolled back.\n')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
