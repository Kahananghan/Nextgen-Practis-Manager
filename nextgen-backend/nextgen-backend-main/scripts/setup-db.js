// ============================================
// scripts/setup-db.js - Database Setup Script
// Runs all migrations in order
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

async function runMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  const fileName = path.basename(filePath)
  
  try {
    console.log(`   Running ${fileName}...`)
    await pool.query(sql)
    console.log(`   ✅ ${fileName} completed`)
  } catch (error) {
    console.error(`   ❌ ${fileName} failed:`, error.message)
    throw error
  }
}

async function setupDatabase() {
  try {
    console.log('\n🚀 Starting Practis Manager Database Setup...\n')

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../sql/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Ensure correct order (001, 002, 003, etc.)

    console.log(`📋 Found ${migrationFiles.length} migration files\n`)

    // Run each migration
    console.log('📊 Running migrations:\n')
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file)
      await runMigration(filePath)
    }

    console.log('\n✅ All migrations completed successfully!\n')

    // Verify table creation
    console.log('📋 Verifying database schema...\n')
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log(`✅ Created ${result.rows.length} tables:\n`)
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    console.log('\n🎉 Database setup completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   ✓ Tables: ${result.rows.length}`)
    console.log(`   ✓ Migrations: ${migrationFiles.length}`)
    console.log(`   ✓ Database: ${process.env.DB_NAME}\n`)

    console.log('💡 Next steps:')
    console.log('   1. Run seed data: npm run db:seed')
    console.log('   2. Start the server: npm run dev\n')

    process.exit(0)
  } catch (err) {
    console.error('\n❌ Database setup failed:', err.message)
    console.error('\n💡 Troubleshooting tips:')
    console.error('   1. Ensure PostgreSQL is running')
    console.error('   2. Check database credentials in .env file')
    console.error('   3. Verify database exists: createdb', process.env.DB_NAME)
    console.error('   4. Check user permissions\n')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

setupDatabase()
