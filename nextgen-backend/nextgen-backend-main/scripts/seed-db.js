// ============================================
// scripts/seed-db.js - Database Seed Script
// Runs all seed files in order
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

async function runSeed(filePath) {
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

async function seedDatabase() {
  try {
    console.log('\n🌱 Starting Practis Manager Database Seeding...\n')

    // Check if running in production
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  WARNING: You are seeding in PRODUCTION environment!')
      console.log('   Demo data should only be seeded in development.\n')
      
      // Require explicit confirmation
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise(resolve => {
        readline.question('   Continue? (yes/no): ', resolve)
      })
      readline.close()

      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Seeding cancelled\n')
        process.exit(0)
      }
    }

    // Get all seed files
    const seedsDir = path.join(__dirname, '../sql/seeds')
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Ensure correct order

    console.log(`📋 Found ${seedFiles.length} seed files\n`)

    // Run each seed
    console.log('🌱 Running seeds:\n')
    for (const file of seedFiles) {
      const filePath = path.join(seedsDir, file)
      await runSeed(filePath)
    }

    console.log('\n✅ All seeds completed successfully!\n')

    // Verify seeded data
    console.log('📊 Verifying seeded data:\n')

    // Check subscription plans
    const plansResult = await pool.query('SELECT tier, name FROM subscription_plans ORDER BY tier')
    console.log(`   ✓ Subscription Plans: ${plansResult.rows.length}`)
    plansResult.rows.forEach(row => {
      console.log(`     - ${row.tier}: ${row.name}`)
    })

    // Check demo tenant (if exists)
    const tenantResult = await pool.query("SELECT name FROM tenants WHERE domain = 'demo.nextgen.local'")
    if (tenantResult.rows.length > 0) {
      console.log(`\n   ✓ Demo Tenant: ${tenantResult.rows[0].name}`)
      
      // Check demo user
      const userResult = await pool.query("SELECT email, name FROM users WHERE email = 'admin@demo.nextgen.local'")
      if (userResult.rows.length > 0) {
        console.log(`   ✓ Demo User: ${userResult.rows[0].name} (${userResult.rows[0].email})`)
        console.log(`\n   📝 Demo Login Credentials:`)
        console.log(`      Email: admin@demo.nextgen.local`)
        console.log(`      Password: Demo123!`)
      }
    }

    console.log('\n🎉 Database seeding completed successfully!\n')
    console.log('💡 Next step:')
    console.log('   Start the server: npm run dev\n')

    process.exit(0)
  } catch (err) {
    console.error('\n❌ Database seeding failed:', err.message)
    console.error('\n💡 Troubleshooting tips:')
    console.error('   1. Ensure migrations have been run: npm run db:setup')
    console.error('   2. Check database connection')
    console.error('   3. Verify seed SQL syntax\n')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seedDatabase()
