import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apmcCode: text("apmc_code").notNull().unique(),
  mobileNumber: text("mobile_number").notNull(),
  subscriptionPlan: text("subscription_plan").notNull(), // 'basic', 'gold', 'diamond'
  maxUsers: integer("max_users").notNull().default(1),
  logo: text("logo"),
  schemaName: text("schema_name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  settings: jsonb("settings").default({}), // GST rates, unload hamali, etc.
});

// Users table with tenant association
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("staff"), // 'super_admin', 'admin', 'staff'
  tenantId: integer("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  usernameIdx: uniqueIndex("username_tenant_idx").on(table.username, table.tenantId),
}));

// Farmers table
export const farmers = pgTable("farmers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAsInBank: text("name_as_in_bank"),
  mobile: text("mobile").notNull(),
  place: text("place").notNull(),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  mobileIdx: index("farmer_mobile_idx").on(table.mobile),
  tenantIdx: index("farmer_tenant_idx").on(table.tenantId),
}));

// Buyers table
export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  mobile: text("mobile"),
  address: text("address"),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lots table
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  lotNumber: text("lot_number").notNull(),
  farmerId: integer("farmer_id").notNull().references(() => farmers.id),
  numberOfBags: integer("number_of_bags").notNull(),
  vehicleRent: decimal("vehicle_rent", { precision: 10, scale: 2 }),
  advance: decimal("advance", { precision: 10, scale: 2 }),
  varietyGrade: text("variety_grade").notNull(),
  unloadHamali: decimal("unload_hamali", { precision: 10, scale: 2 }),
  lotPrice: decimal("lot_price", { precision: 10, scale: 2 }),
  buyerId: integer("buyer_id").references(() => buyers.id),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  lotNumberIdx: uniqueIndex("lot_number_tenant_idx").on(table.lotNumber, table.tenantId),
  tenantIdx: index("lot_tenant_idx").on(table.tenantId),
}));

// Bags table for individual bag entries
export const bags = pgTable("bags", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull().references(() => lots.id),
  bagNumber: integer("bag_number").notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  grade: text("grade"),
  notes: text("notes"),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  lotBagIdx: uniqueIndex("lot_bag_number_idx").on(table.lotId, table.bagNumber),
  tenantIdx: index("bag_tenant_idx").on(table.tenantId),
}));

// Audit logs for tracking all operations
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  action: text("action").notNull(), // 'login', 'logout', 'create', 'update', 'delete'
  entityType: text("entity_type"), // 'farmer', 'lot', 'bag', etc.
  entityId: integer("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  farmers: many(farmers),
  lots: many(lots),
  bags: many(bags),
  buyers: many(buyers),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  auditLogs: many(auditLogs),
}));

export const farmerRelations = relations(farmers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [farmers.tenantId],
    references: [tenants.id],
  }),
  lots: many(lots),
}));

export const lotRelations = relations(lots, ({ one, many }) => ({
  farmer: one(farmers, {
    fields: [lots.farmerId],
    references: [farmers.id],
  }),
  buyer: one(buyers, {
    fields: [lots.buyerId],
    references: [buyers.id],
  }),
  tenant: one(tenants, {
    fields: [lots.tenantId],
    references: [tenants.id],
  }),
  bags: many(bags),
}));

export const bagRelations = relations(bags, ({ one }) => ({
  lot: one(lots, {
    fields: [bags.lotId],
    references: [lots.id],
  }),
  tenant: one(tenants, {
    fields: [bags.tenantId],
    references: [tenants.id],
  }),
}));

export const buyerRelations = relations(buyers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [buyers.tenantId],
    references: [tenants.id],
  }),
  lots: many(lots),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  schemaName: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertFarmerSchema = createInsertSchema(farmers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLotSchema = createInsertSchema(lots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBagSchema = createInsertSchema(bags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyerSchema = createInsertSchema(buyers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Farmer = typeof farmers.$inferSelect;
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type Bag = typeof bags.$inferSelect;
export type InsertBag = z.infer<typeof insertBagSchema>;
export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
