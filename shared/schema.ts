import { pgTable, serial, text, integer, boolean, timestamp, numeric, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simple schema without multi-tenancy
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const farmers = pgTable("farmers", {
  id: serial("id").primaryKey(),
  farmerId: text("farmer_id").notNull().unique(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  place: text("place").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  lotNumber: text("lot_number").notNull().unique(),
  farmerId: integer("farmer_id").notNull().references(() => farmers.id),
  buyerId: integer("buyer_id").references(() => buyers.id),
  varietyGrade: text("variety_grade").notNull(),
  numberOfBags: integer("number_of_bags").notNull(),
  estimatedWeight: numeric("estimated_weight", { precision: 10, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bags = pgTable("bags", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull().references(() => lots.id),
  bagNumber: integer("bag_number").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  grade: text("grade"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (bags) => ({
  uniqueBagNumberPerLot: unique().on(bags.bagNumber, bags.lotId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const farmerRelations = relations(farmers, ({ many }) => ({
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
  bags: many(bags),
}));

export const bagRelations = relations(bags, ({ one }) => ({
  lot: one(lots, {
    fields: [bags.lotId],
    references: [lots.id],
  }),
}));

export const buyerRelations = relations(buyers, ({ many }) => ({
  lots: many(lots),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  createdAt: true,
});

// Types
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