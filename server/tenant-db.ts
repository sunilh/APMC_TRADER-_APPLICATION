import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export async function createTenantSchema(schemaName: string): Promise<void> {
  try {
    // Create the schema
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
    
    // Create all tenant tables
    await createTenantTables(schemaName);
    
    console.log(`Created schema and tables for: ${schemaName}`);
  } catch (error) {
    console.error(`Failed to create tenant schema ${schemaName}:`, error);
    throw error;
  }
}

async function createTenantTables(schema: string): Promise<void> {
  const tables = [
    `CREATE TABLE IF NOT EXISTS "${schema}".farmers (
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
    
    `CREATE TABLE IF NOT EXISTS "${schema}".buyers (
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
    
    `CREATE TABLE IF NOT EXISTS "${schema}".lots (
      id SERIAL PRIMARY KEY,
      lot_number TEXT NOT NULL UNIQUE,
      farmer_id INTEGER NOT NULL REFERENCES "${schema}".farmers(id),
      number_of_bags INTEGER NOT NULL,
      vehicle_rent DECIMAL(10,2),
      advance DECIMAL(10,2),
      variety_grade TEXT NOT NULL,
      unload_hamali DECIMAL(10,2),
      lot_price DECIMAL(10,2),
      buyer_id INTEGER REFERENCES "${schema}".buyers(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS "${schema}".bags (
      id SERIAL PRIMARY KEY,
      lot_id INTEGER NOT NULL REFERENCES "${schema}".lots(id),
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
    
    `CREATE TABLE IF NOT EXISTS "${schema}".audit_logs (
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

  for (const tableSQL of tables) {
    await db.execute(sql.raw(tableSQL));
  }

  // Create indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_${schema.replace(/[^a-zA-Z0-9]/g, '_')}_farmer_mobile ON "${schema}".farmers(mobile)`,
    `CREATE INDEX IF NOT EXISTS idx_${schema.replace(/[^a-zA-Z0-9]/g, '_')}_lot_farmer ON "${schema}".lots(farmer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schema.replace(/[^a-zA-Z0-9]/g, '_')}_bag_lot ON "${schema}".bags(lot_id)`
  ];

  for (const indexSQL of indexes) {
    await db.execute(sql.raw(indexSQL));
  }
}

export class TenantDB {
  private db: any;
  private schema: string;

  constructor(schemaName: string) {
    this.schema = schemaName;
    this.db = db; // Use the shared connection
  }

  // Farmers
  async getFarmers(search?: string): Promise<any[]> {
    let query = `SELECT * FROM "${this.schema}".farmers ORDER BY created_at DESC`;
    let params: any[] = [];
    
    if (search) {
      query = `SELECT * FROM "${this.schema}".farmers 
               WHERE name ILIKE $1 OR mobile ILIKE $1 OR place ILIKE $1 
               ORDER BY created_at DESC`;
      params = [`%${search}%`];
    }
    
    const result = await this.db.execute(sql.raw(query, params));
    return result.rows;
  }

  async getFarmer(id: number): Promise<any> {
    const result = await this.db.execute(
      sql.raw(`SELECT * FROM "${this.schema}".farmers WHERE id = $1`, [id])
    );
    return result.rows[0];
  }

  async createFarmer(farmer: any, userId?: number): Promise<any> {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schema}".farmers 
      (name, name_as_in_bank, mobile, place, bank_name, account_number, ifsc_code, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      farmer.name, farmer.nameAsInBank || farmer.name, farmer.mobile, farmer.place,
      farmer.bankName || null, farmer.accountNumber || null, farmer.ifscCode || null, userId, userId
    ]));
    return result.rows[0];
  }

  async updateFarmer(id: number, farmer: any, userId?: number): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (farmer.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(farmer.name); }
    if (farmer.nameAsInBank !== undefined) { fields.push(`name_as_in_bank = $${paramIndex++}`); values.push(farmer.nameAsInBank); }
    if (farmer.mobile !== undefined) { fields.push(`mobile = $${paramIndex++}`); values.push(farmer.mobile); }
    if (farmer.place !== undefined) { fields.push(`place = $${paramIndex++}`); values.push(farmer.place); }
    if (farmer.bankName !== undefined) { fields.push(`bank_name = $${paramIndex++}`); values.push(farmer.bankName); }
    if (farmer.accountNumber !== undefined) { fields.push(`account_number = $${paramIndex++}`); values.push(farmer.accountNumber); }
    if (farmer.ifscCode !== undefined) { fields.push(`ifsc_code = $${paramIndex++}`); values.push(farmer.ifscCode); }
    
    fields.push(`updated_by = $${paramIndex++}`, `updated_at = NOW()`);
    values.push(userId, id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schema}".farmers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteFarmer(id: number): Promise<void> {
    await this.db.execute(sql.raw(`DELETE FROM "${this.schema}".farmers WHERE id = $1`, [id]));
  }

  // Buyers
  async getBuyers(): Promise<any[]> {
    const result = await this.db.execute(sql.raw(`SELECT * FROM "${this.schema}".buyers ORDER BY created_at DESC`));
    return result.rows;
  }

  async createBuyer(buyer: any, userId?: number): Promise<any> {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schema}".buyers 
      (name, contact_person, mobile, address, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [buyer.name, buyer.contactPerson, buyer.mobile, buyer.address, userId, userId]));
    return result.rows[0];
  }

  async updateBuyer(id: number, buyer: any, userId?: number): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (buyer.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(buyer.name); }
    if (buyer.contactPerson !== undefined) { fields.push(`contact_person = $${paramIndex++}`); values.push(buyer.contactPerson); }
    if (buyer.mobile !== undefined) { fields.push(`mobile = $${paramIndex++}`); values.push(buyer.mobile); }
    if (buyer.address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(buyer.address); }
    
    fields.push(`updated_by = $${paramIndex++}`, `updated_at = NOW()`);
    values.push(userId, id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schema}".buyers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteBuyer(id: number): Promise<void> {
    await this.db.execute(sql.raw(`DELETE FROM "${this.schema}".buyers WHERE id = $1`, [id]));
  }

  // Lots
  async getLots(search?: string): Promise<any[]> {
    const query = `
      SELECT l.*, 
             f.name as farmer_name, f.mobile as farmer_mobile, f.place as farmer_place,
             b.name as buyer_name
      FROM "${this.schema}".lots l
      LEFT JOIN "${this.schema}".farmers f ON l.farmer_id = f.id
      LEFT JOIN "${this.schema}".buyers b ON l.buyer_id = b.id
      ORDER BY l.created_at DESC
    `;
    
    const result = await this.db.execute(sql.raw(query));
    return result.rows.map(row => ({
      id: row.id,
      lotNumber: row.lot_number,
      farmerId: row.farmer_id,
      numberOfBags: row.number_of_bags,
      vehicleRent: row.vehicle_rent,
      advance: row.advance,
      varietyGrade: row.variety_grade,
      unloadHamali: row.unload_hamali,
      lotPrice: row.lot_price,
      buyerId: row.buyer_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      farmer: { 
        id: row.farmer_id, 
        name: row.farmer_name, 
        mobile: row.farmer_mobile, 
        place: row.farmer_place 
      },
      buyer: row.buyer_id ? { id: row.buyer_id, name: row.buyer_name } : undefined
    }));
  }

  async getLot(id: number): Promise<any> {
    const query = `
      SELECT l.*, 
             f.name as farmer_name, f.mobile as farmer_mobile, f.place as farmer_place,
             b.name as buyer_name
      FROM "${this.schema}".lots l
      LEFT JOIN "${this.schema}".farmers f ON l.farmer_id = f.id
      LEFT JOIN "${this.schema}".buyers b ON l.buyer_id = b.id
      WHERE l.id = $1
    `;
    
    const result = await this.db.execute(sql.raw(query, [id]));
    if (!result.rows[0]) return undefined;
    
    const row = result.rows[0];
    return {
      id: row.id,
      lotNumber: row.lot_number,
      farmerId: row.farmer_id,
      numberOfBags: row.number_of_bags,
      vehicleRent: row.vehicle_rent,
      advance: row.advance,
      varietyGrade: row.variety_grade,
      unloadHamali: row.unload_hamali,
      lotPrice: row.lot_price,
      buyerId: row.buyer_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      farmer: { 
        id: row.farmer_id, 
        name: row.farmer_name, 
        mobile: row.farmer_mobile, 
        place: row.farmer_place 
      },
      buyer: row.buyer_id ? { id: row.buyer_id, name: row.buyer_name } : undefined
    };
  }

  async createLot(lot: any, userId?: number): Promise<any> {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schema}".lots 
      (lot_number, farmer_id, number_of_bags, vehicle_rent, advance, variety_grade, 
       unload_hamali, lot_price, buyer_id, status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      lot.lotNumber, lot.farmerId, lot.numberOfBags, lot.vehicleRent, 
      lot.advance, lot.varietyGrade, lot.unloadHamali, lot.lotPrice, 
      lot.buyerId, lot.status || 'active', userId, userId
    ]));
    return result.rows[0];
  }

  async updateLot(id: number, lot: any, userId?: number): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (lot.lotNumber !== undefined) { fields.push(`lot_number = $${paramIndex++}`); values.push(lot.lotNumber); }
    if (lot.farmerId !== undefined) { fields.push(`farmer_id = $${paramIndex++}`); values.push(lot.farmerId); }
    if (lot.numberOfBags !== undefined) { fields.push(`number_of_bags = $${paramIndex++}`); values.push(lot.numberOfBags); }
    if (lot.vehicleRent !== undefined) { fields.push(`vehicle_rent = $${paramIndex++}`); values.push(lot.vehicleRent); }
    if (lot.advance !== undefined) { fields.push(`advance = $${paramIndex++}`); values.push(lot.advance); }
    if (lot.varietyGrade !== undefined) { fields.push(`variety_grade = $${paramIndex++}`); values.push(lot.varietyGrade); }
    if (lot.unloadHamali !== undefined) { fields.push(`unload_hamali = $${paramIndex++}`); values.push(lot.unloadHamali); }
    if (lot.lotPrice !== undefined) { fields.push(`lot_price = $${paramIndex++}`); values.push(lot.lotPrice); }
    if (lot.buyerId !== undefined) { fields.push(`buyer_id = $${paramIndex++}`); values.push(lot.buyerId); }
    if (lot.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(lot.status); }
    
    fields.push(`updated_by = $${paramIndex++}`, `updated_at = NOW()`);
    values.push(userId, id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schema}".lots 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteLot(id: number): Promise<void> {
    await this.db.execute(sql.raw(`DELETE FROM "${this.schema}".lots WHERE id = $1`, [id]));
  }

  // Bags
  async getBagsByLot(lotId: number): Promise<any[]> {
    const result = await this.db.execute(
      sql.raw(`SELECT * FROM "${this.schema}".bags WHERE lot_id = $1 ORDER BY bag_number`, [lotId])
    );
    return result.rows;
  }

  async createBag(bag: any, userId?: number): Promise<any> {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schema}".bags 
      (lot_id, bag_number, weight, grade, notes, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [bag.lotId, bag.bagNumber, bag.weight, bag.grade, bag.notes, userId, userId]));
    return result.rows[0];
  }

  async updateBag(id: number, bag: any, userId?: number): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (bag.weight !== undefined) { fields.push(`weight = $${paramIndex++}`); values.push(bag.weight); }
    if (bag.grade !== undefined) { fields.push(`grade = $${paramIndex++}`); values.push(bag.grade); }
    if (bag.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(bag.notes); }
    
    fields.push(`updated_by = $${paramIndex++}`, `updated_at = NOW()`);
    values.push(userId, id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schema}".bags 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteBag(id: number): Promise<void> {
    await this.db.execute(sql.raw(`DELETE FROM "${this.schema}".bags WHERE id = $1`, [id]));
  }

  // Audit logs
  async createAuditLog(log: any): Promise<any> {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schema}".audit_logs 
      (user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [log.userId, log.action, log.entityType, log.entityId, 
        JSON.stringify(log.oldData), JSON.stringify(log.newData)]));
    return result.rows[0];
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const [farmersResult, lotsResult, bagsResult] = await Promise.all([
      this.db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${this.schema}".farmers`)),
      this.db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${this.schema}".lots WHERE status = 'active'`)),
      this.db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${this.schema}".bags WHERE DATE(created_at) = CURRENT_DATE`))
    ]);

    return {
      totalFarmers: parseInt(farmersResult.rows[0].count),
      activeLots: parseInt(lotsResult.rows[0].count),
      totalBagsToday: parseInt(bagsResult.rows[0].count),
      revenueToday: 0
    };
  }
}