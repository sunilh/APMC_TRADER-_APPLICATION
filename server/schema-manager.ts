import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export async function createTenantSchema(schemaName: string): Promise<void> {
  try {
    // Create the schema
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
    
    // Create tables in the new schema
    await createTenantTables(schemaName);
    
    console.log(`Created schema and tables for tenant: ${schemaName}`);
  } catch (error) {
    console.error(`Failed to create tenant schema ${schemaName}:`, error);
    throw error;
  }
}

async function createTenantTables(schemaName: string): Promise<void> {
  const tables = [
    // Farmers table
    `CREATE TABLE IF NOT EXISTS "${schemaName}".farmers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_as_in_bank TEXT NOT NULL,
      mobile TEXT NOT NULL,
      place TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Buyers table
    `CREATE TABLE IF NOT EXISTS "${schemaName}".buyers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      mobile TEXT,
      address TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Lots table
    `CREATE TABLE IF NOT EXISTS "${schemaName}".lots (
      id SERIAL PRIMARY KEY,
      lot_number TEXT NOT NULL,
      farmer_id INTEGER NOT NULL REFERENCES "${schemaName}".farmers(id),
      number_of_bags INTEGER NOT NULL,
      vehicle_rent DECIMAL(10,2),
      advance DECIMAL(10,2),
      variety_grade TEXT NOT NULL,
      unload_hamali DECIMAL(10,2),
      lot_price DECIMAL(10,2),
      buyer_id INTEGER REFERENCES "${schemaName}".buyers(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(lot_number)
    )`,
    
    // Bags table
    `CREATE TABLE IF NOT EXISTS "${schemaName}".bags (
      id SERIAL PRIMARY KEY,
      lot_id INTEGER NOT NULL REFERENCES "${schemaName}".lots(id),
      bag_number INTEGER NOT NULL,
      weight DECIMAL(8,2),
      grade TEXT,
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(lot_id, bag_number)
    )`,
    
    // Audit logs table
    `CREATE TABLE IF NOT EXISTS "${schemaName}".audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_data JSONB,
      new_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ];

  // Create indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_farmer_mobile ON "${schemaName}".farmers(mobile)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_lot_farmer ON "${schemaName}".lots(farmer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_bag_lot ON "${schemaName}".bags(lot_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_user ON "${schemaName}".audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_entity ON "${schemaName}".audit_logs(entity_type, entity_id)`
  ];

  // Execute table creation
  for (const tableSQL of tables) {
    await db.execute(sql.raw(tableSQL));
  }

  // Execute index creation
  for (const indexSQL of indexes) {
    await db.execute(sql.raw(indexSQL));
  }
}

export async function dropTenantSchema(schemaName: string): Promise<void> {
  try {
    await db.execute(sql.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`));
    console.log(`Dropped schema: ${schemaName}`);
  } catch (error) {
    console.error(`Failed to drop tenant schema ${schemaName}:`, error);
    throw error;
  }
}

export async function getTenantConnection(schemaName: string) {
  const tenantPool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    options: {
      schema: schemaName
    }
  });
  
  return drizzle({ client: tenantPool });
}