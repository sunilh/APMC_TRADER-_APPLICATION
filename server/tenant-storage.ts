import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql, eq, and, desc } from 'drizzle-orm';

// Define schema-agnostic table references
export class TenantStorage {
  private db: any;
  private schemaName: string;

  constructor(schemaName: string) {
    this.schemaName = schemaName;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle({ client: pool });
  }

  // Helper to execute schema-specific queries
  private async query(sqlString: string, params: any[] = []) {
    return await this.db.execute(sql.raw(sqlString, params));
  }

  // Farmers operations
  async getFarmers(search?: string) {
    let query = `SELECT * FROM "${this.schemaName}".farmers ORDER BY created_at DESC`;
    if (search) {
      query = `SELECT * FROM "${this.schemaName}".farmers 
               WHERE name ILIKE $1 OR mobile ILIKE $1 OR place ILIKE $1 
               ORDER BY created_at DESC`;
      const result = await this.db.execute(sql.raw(query, [`%${search}%`]));
      return result.rows;
    }
    const result = await this.db.execute(sql.raw(query));
    return result.rows;
  }

  async getFarmer(id: number) {
    const result = await this.db.execute(
      sql.raw(`SELECT * FROM "${this.schemaName}".farmers WHERE id = $1`, [id])
    );
    return result.rows[0];
  }

  async createFarmer(farmer: any, userId?: number) {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schemaName}".farmers 
      (name, name_as_in_bank, mobile, place, bank_name, account_number, ifsc_code, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      farmer.name, farmer.nameAsInBank, farmer.mobile, farmer.place,
      farmer.bankName, farmer.accountNumber, farmer.ifscCode, userId, userId
    ]));
    return result.rows[0];
  }

  async updateFarmer(id: number, farmer: any, userId?: number) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (farmer.name) { fields.push(`name = $${paramIndex++}`); values.push(farmer.name); }
    if (farmer.nameAsInBank) { fields.push(`name_as_in_bank = $${paramIndex++}`); values.push(farmer.nameAsInBank); }
    if (farmer.mobile) { fields.push(`mobile = $${paramIndex++}`); values.push(farmer.mobile); }
    if (farmer.place) { fields.push(`place = $${paramIndex++}`); values.push(farmer.place); }
    if (farmer.bankName) { fields.push(`bank_name = $${paramIndex++}`); values.push(farmer.bankName); }
    if (farmer.accountNumber) { fields.push(`account_number = $${paramIndex++}`); values.push(farmer.accountNumber); }
    if (farmer.ifscCode) { fields.push(`ifsc_code = $${paramIndex++}`); values.push(farmer.ifscCode); }
    
    fields.push(`updated_by = $${paramIndex++}`); values.push(userId);
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schemaName}".farmers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteFarmer(id: number) {
    await this.db.execute(
      sql.raw(`DELETE FROM "${this.schemaName}".farmers WHERE id = $1`, [id])
    );
  }

  // Buyers operations
  async getBuyers() {
    const result = await this.db.execute(
      sql.raw(`SELECT * FROM "${this.schemaName}".buyers ORDER BY created_at DESC`)
    );
    return result.rows;
  }

  async createBuyer(buyer: any, userId?: number) {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schemaName}".buyers 
      (name, contact_person, mobile, address, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [buyer.name, buyer.contactPerson, buyer.mobile, buyer.address, userId, userId]));
    return result.rows[0];
  }

  async updateBuyer(id: number, buyer: any, userId?: number) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (buyer.name) { fields.push(`name = $${paramIndex++}`); values.push(buyer.name); }
    if (buyer.contactPerson !== undefined) { fields.push(`contact_person = $${paramIndex++}`); values.push(buyer.contactPerson); }
    if (buyer.mobile !== undefined) { fields.push(`mobile = $${paramIndex++}`); values.push(buyer.mobile); }
    if (buyer.address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(buyer.address); }
    
    fields.push(`updated_by = $${paramIndex++}`); values.push(userId);
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schemaName}".buyers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  async deleteBuyer(id: number) {
    await this.db.execute(
      sql.raw(`DELETE FROM "${this.schemaName}".buyers WHERE id = $1`, [id])
    );
  }

  // Lots operations
  async getLots(search?: string) {
    const query = `
      SELECT l.*, f.name as farmer_name, f.mobile as farmer_mobile, f.place as farmer_place,
             b.name as buyer_name
      FROM "${this.schemaName}".lots l
      LEFT JOIN "${this.schemaName}".farmers f ON l.farmer_id = f.id
      LEFT JOIN "${this.schemaName}".buyers b ON l.buyer_id = b.id
      ORDER BY l.created_at DESC
    `;
    const result = await this.db.execute(sql.raw(query));
    return result.rows.map(row => ({
      ...row,
      farmer: { id: row.farmer_id, name: row.farmer_name, mobile: row.farmer_mobile, place: row.farmer_place },
      buyer: row.buyer_id ? { id: row.buyer_id, name: row.buyer_name } : undefined
    }));
  }

  async getLot(id: number) {
    const query = `
      SELECT l.*, f.name as farmer_name, f.mobile as farmer_mobile, f.place as farmer_place,
             b.name as buyer_name
      FROM "${this.schemaName}".lots l
      LEFT JOIN "${this.schemaName}".farmers f ON l.farmer_id = f.id
      LEFT JOIN "${this.schemaName}".buyers b ON l.buyer_id = b.id
      WHERE l.id = $1
    `;
    const result = await this.db.execute(sql.raw(query, [id]));
    if (!result.rows[0]) return undefined;
    
    const row = result.rows[0];
    return {
      ...row,
      farmer: { id: row.farmer_id, name: row.farmer_name, mobile: row.farmer_mobile, place: row.farmer_place },
      buyer: row.buyer_id ? { id: row.buyer_id, name: row.buyer_name } : undefined
    };
  }

  async createLot(lot: any, userId?: number) {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schemaName}".lots 
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

  // Bags operations
  async getBagsByLot(lotId: number) {
    const result = await this.db.execute(
      sql.raw(`SELECT * FROM "${this.schemaName}".bags WHERE lot_id = $1 ORDER BY bag_number`, [lotId])
    );
    return result.rows;
  }

  async createBag(bag: any, userId?: number) {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schemaName}".bags 
      (lot_id, bag_number, weight, grade, notes, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [bag.lotId, bag.bagNumber, bag.weight, bag.grade, bag.notes, userId, userId]));
    return result.rows[0];
  }

  async updateBag(id: number, bag: any, userId?: number) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (bag.weight !== undefined) { fields.push(`weight = $${paramIndex++}`); values.push(bag.weight); }
    if (bag.grade !== undefined) { fields.push(`grade = $${paramIndex++}`); values.push(bag.grade); }
    if (bag.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(bag.notes); }
    
    fields.push(`updated_by = $${paramIndex++}`); values.push(userId);
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.execute(sql.raw(`
      UPDATE "${this.schemaName}".bags 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values));
    return result.rows[0];
  }

  // Audit logs
  async createAuditLog(log: any) {
    const result = await this.db.execute(sql.raw(`
      INSERT INTO "${this.schemaName}".audit_logs 
      (user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [log.userId, log.action, log.entityType, log.entityId, 
        JSON.stringify(log.oldData), JSON.stringify(log.newData)]));
    return result.rows[0];
  }

  async getDashboardStats() {
    const farmersResult = await this.db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM "${this.schemaName}".farmers`)
    );
    const lotsResult = await this.db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM "${this.schemaName}".lots WHERE status = 'active'`)
    );
    const bagsResult = await this.db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM "${this.schemaName}".bags WHERE DATE(created_at) = CURRENT_DATE`)
    );

    return {
      totalFarmers: parseInt(farmersResult.rows[0].count),
      activeLots: parseInt(lotsResult.rows[0].count),
      totalBagsToday: parseInt(bagsResult.rows[0].count),
      revenueToday: 0
    };
  }
}