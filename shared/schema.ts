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
  gstNumber: text("gst_number"), // GST registration number
  fssaiNumber: text("fssai_number"), // FSSAI registration number
  panNumber: text("pan_number").notNull(), // PAN card number
  subscriptionPlan: text("subscription_plan").notNull(), // 'basic', 'gold', 'diamond'
  maxUsers: integer("max_users").notNull().default(1),
  logo: text("logo"),
  place: text("place"),
  address: text("address"),
  bankName: text("bank_name"), // Bank details for receiving payments
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  accountHolderName: text("account_holder_name"),
  branchName: text("branch_name"), // Bank branch name
  branchAddress: text("branch_address"), // Bank branch address
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
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  hsnCode: text("hsn_code").notNull(), // Mandatory HSN code for billing
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  grade: text("grade"),
  unloadHamali: decimal("unload_hamali", { precision: 10, scale: 2 }),
  lotPrice: decimal("lot_price", { precision: 10, scale: 2 }),
  buyerId: integer("buyer_id").references(() => buyers.id),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  billGenerated: boolean("bill_generated").notNull().default(false),
  billGeneratedAt: timestamp("bill_generated_at"),
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'partial', 'paid'
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default('0'),
  paymentDate: timestamp("payment_date"),
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
  notes: text("notes"),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  lotBagIdx: uniqueIndex("lot_bag_number_idx").on(table.lotId, table.bagNumber),
  tenantIdx: index("bag_tenant_idx").on(table.tenantId),
}));

// Draft storage for bag entry cross-device syncing
export const bagEntryDrafts = pgTable("bag_entry_drafts", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull().references(() => lots.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  draftData: jsonb("draft_data").notNull(), // Contains bag entries, prices, allocations
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  lotUserIdx: uniqueIndex("draft_lot_user_idx").on(table.lotId, table.userId),
  tenantIdx: index("draft_tenant_idx").on(table.tenantId),
}));

// Audit logs for tracking all operations
// Junction table for lot-buyer relationships (multiple buyers per lot)
export const lotBuyers = pgTable("lot_buyers", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull().references(() => lots.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => buyers.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bagAllocation: jsonb("bag_allocation"), // Store which specific bags belong to this buyer
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lot_buyers_lot_id").on(table.lotId),
  index("idx_lot_buyers_buyer_id").on(table.buyerId),
  index("idx_lot_buyers_tenant_id").on(table.tenantId),
]);

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

// Patti numbers for farmer bill management
export const pattis = pgTable("pattis", {
  id: serial("id").primaryKey(),
  pattiNumber: text("patti_number").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
}).extend({
  weight: z.string().optional().transform((val) => val === "" ? null : val),
});

export const insertBuyerSchema = createInsertSchema(buyers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(), 
  address: z.string().optional(),
  hsnCode: z.string().min(1, "HSN code is required"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertPattiSchema = createInsertSchema(pattis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  pattiNumber: z.string().min(1, "Patti number is required"),
  description: z.string().optional(),
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
export type Patti = typeof pattis.$inferSelect;
export type InsertPatti = z.infer<typeof insertPattiSchema>;
export type LotBuyer = typeof lotBuyers.$inferSelect;
export type InsertLotBuyer = typeof lotBuyers.$inferInsert;

// Farmer Bill tracking table
export const farmerBills = pgTable("farmer_bills", {
  id: serial("id").primaryKey(),
  pattiNumber: text("patti_number").notNull().unique(),
  farmerId: integer("farmer_id").references(() => farmers.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  billDate: timestamp("bill_date").defaultNow(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  hamali: decimal("hamali", { precision: 10, scale: 2 }).default('0'),
  vehicleRent: decimal("vehicle_rent", { precision: 10, scale: 2 }).default('0'),
  emptyBagCharges: decimal("empty_bag_charges", { precision: 10, scale: 2 }).default('0'),
  advance: decimal("advance", { precision: 10, scale: 2 }).default('0'),
  commission: decimal("commission", { precision: 10, scale: 2 }).default('0'),
  otherCharges: decimal("other_charges", { precision: 10, scale: 2 }).default('0'),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).notNull(),
  netPayable: decimal("net_payable", { precision: 12, scale: 2 }).notNull(),
  totalBags: integer("total_bags").notNull(),
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }).notNull(),
  lotIds: jsonb("lot_ids").notNull(), // Store array of lot IDs included in this bill
  status: text("status").default("generated"), // generated, paid, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Invoice tracking table
export const taxInvoices = pgTable("tax_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  buyerId: integer("buyer_id").references(() => buyers.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  invoiceDate: timestamp("invoice_date").defaultNow(),
  basicAmount: decimal("basic_amount", { precision: 12, scale: 2 }).notNull(),
  packaging: decimal("packaging", { precision: 10, scale: 2 }).default('0'),
  hamali: decimal("hamali", { precision: 10, scale: 2 }).default('0'),
  weighingCharges: decimal("weighing_charges", { precision: 10, scale: 2 }).default('0'),
  commission: decimal("commission", { precision: 10, scale: 2 }).default('0'),
  cess: decimal("cess", { precision: 10, scale: 2 }).default('0'),
  sgst: decimal("sgst", { precision: 10, scale: 2 }).default('0'),
  cgst: decimal("cgst", { precision: 10, scale: 2 }).default('0'),
  igst: decimal("igst", { precision: 10, scale: 2 }).default('0'),
  totalGst: decimal("total_gst", { precision: 10, scale: 2 }).default('0'),
  totalBags: integer("total_bags"),
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }),
  invoiceData: jsonb("invoice_data"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  lotIds: jsonb("lot_ids").notNull(), // Store array of lot IDs included in this invoice
  status: text("status").default("generated"), // generated, paid, cancelled
  paymentStatus: text("payment_status").default("pending"), // pending, partial, paid
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default('0'),
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Accounting ledger for complete financial tracking
export const accountingLedger = pgTable("accounting_ledger", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  transactionType: text("transaction_type").notNull(), // 'sale', 'purchase', 'payment_received', 'payment_made', 'expense', 'income'
  entityType: text("entity_type").notNull(), // 'farmer', 'buyer', 'expense', 'income'
  entityId: integer("entity_id"), // farmer_id, buyer_id, etc.
  referenceType: text("reference_type"), // 'farmer_bill', 'tax_invoice', 'manual_entry'
  referenceId: integer("reference_id"), // bill_id, invoice_id, etc.
  debitAmount: decimal("debit_amount", { precision: 12, scale: 2 }).default('0'),
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default('0'),
  description: text("description").notNull(),
  accountHead: text("account_head").notNull(), // 'sales', 'purchases', 'accounts_receivable', 'accounts_payable', 'commission_income', 'expenses'
  fiscalYear: text("fiscal_year").notNull(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (table) => [
  index("idx_ledger_tenant_date").on(table.tenantId, table.transactionDate),
  index("idx_ledger_account_head").on(table.accountHead),
  index("idx_ledger_fiscal_year").on(table.fiscalYear),
]);

// Bank transactions tracking
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  transactionType: text("transaction_type").notNull(), // 'deposit', 'withdrawal', 'transfer'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  bankAccount: text("bank_account").notNull(),
  referenceNumber: text("reference_number"),
  description: text("description").notNull(),
  entityType: text("entity_type"), // 'farmer', 'buyer', 'expense'
  entityId: integer("entity_id"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (table) => [
  index("idx_bank_tenant_date").on(table.tenantId, table.transactionDate),
]);

// Final accounts summary per fiscal year
export const finalAccounts = pgTable("final_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  fiscalYear: text("fiscal_year").notNull(),
  
  // Profit & Loss Account
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).default('0'),
  totalPurchases: decimal("total_purchases", { precision: 15, scale: 2 }).default('0'),
  grossProfit: decimal("gross_profit", { precision: 15, scale: 2 }).default('0'),
  commissionIncome: decimal("commission_income", { precision: 12, scale: 2 }).default('0'),
  serviceCharges: decimal("service_charges", { precision: 12, scale: 2 }).default('0'),
  otherIncome: decimal("other_income", { precision: 12, scale: 2 }).default('0'),
  totalIncome: decimal("total_income", { precision: 15, scale: 2 }).default('0'),
  
  operatingExpenses: decimal("operating_expenses", { precision: 12, scale: 2 }).default('0'),
  bankCharges: decimal("bank_charges", { precision: 10, scale: 2 }).default('0'),
  otherExpenses: decimal("other_expenses", { precision: 12, scale: 2 }).default('0'),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).default('0'),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).default('0'),
  
  // Balance Sheet
  cash: decimal("cash", { precision: 12, scale: 2 }).default('0'),
  bankBalance: decimal("bank_balance", { precision: 12, scale: 2 }).default('0'),
  accountsReceivable: decimal("accounts_receivable", { precision: 12, scale: 2 }).default('0'),
  totalAssets: decimal("total_assets", { precision: 15, scale: 2 }).default('0'),
  
  accountsPayable: decimal("accounts_payable", { precision: 12, scale: 2 }).default('0'),
  taxLiabilities: decimal("tax_liabilities", { precision: 12, scale: 2 }).default('0'),
  totalLiabilities: decimal("total_liabilities", { precision: 15, scale: 2 }).default('0'),
  netWorth: decimal("net_worth", { precision: 15, scale: 2 }).default('0'),
  
  // Tax Information
  gstPayable: decimal("gst_payable", { precision: 12, scale: 2 }).default('0'),
  cessPayable: decimal("cess_payable", { precision: 12, scale: 2 }).default('0'),
  
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date").notNull(),
  status: text("status").default("draft"), // draft, finalized, audited
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: integer("finalized_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_final_accounts_tenant_year").on(table.tenantId, table.fiscalYear),
]);

// Expense categories for better tracking
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  categoryName: text("category_name").notNull(),
  description: text("description"),
  accountHead: text("account_head").notNull(), // maps to accounting_ledger.account_head
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Manual expenses tracking
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  categoryId: integer("category_id").references(() => expenseCategories.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  receiptNumber: text("receipt_number"),
  vendorName: text("vendor_name"),
  expenseDate: timestamp("expense_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Insert schemas for new tables
export const insertFarmerBillSchema = createInsertSchema(farmerBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxInvoiceSchema = createInsertSchema(taxInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// BUYER-SIDE INVOICE OCR SYSTEM TABLES - Production Grade for 1000+ Tenants

// Purchase invoices from Dalals/Suppliers
export const purchaseInvoices = pgTable("purchase_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dalalSupplierName: text("dalal_supplier_name").notNull(),
  dalalContact: text("dalal_contact"),
  dalalAddress: text("dalal_address"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, partial
  paymentDate: timestamp("payment_date"),
  notes: text("notes"),
  originalImagePath: text("original_image_path"), // Path to stored invoice image
  ocrProcessed: boolean("ocr_processed").default(false),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }), // OCR accuracy percentage
  buyerId: integer("buyer_id").notNull().references(() => buyers.id), // Which buyer purchased
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("purchase_invoice_tenant_idx").on(table.tenantId),
  buyerIdx: index("purchase_invoice_buyer_idx").on(table.buyerId),
  invoiceNumberIdx: index("purchase_invoice_number_idx").on(table.invoiceNumber),
  dateIdx: index("purchase_invoice_date_idx").on(table.invoiceDate),
  supplierIdx: index("purchase_invoice_supplier_idx").on(table.dalalSupplierName),
}));

// Individual items in each purchase invoice
export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description"),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // kg, bags, quintals, etc.
  ratePerUnit: decimal("rate_per_unit", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  hsnCode: text("hsn_code"),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  invoiceIdx: index("purchase_item_invoice_idx").on(table.invoiceId),
  tenantIdx: index("purchase_item_tenant_idx").on(table.tenantId),
  itemNameIdx: index("purchase_item_name_idx").on(table.itemName),
}));

// Current stock levels for all items
export const stockInventory = pgTable("stock_inventory", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description"),
  currentQuantity: decimal("current_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  reservedQuantity: decimal("reserved_quantity", { precision: 12, scale: 3 }).notNull().default("0"), // For orders
  availableQuantity: decimal("available_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull(),
  avgPurchaseRate: decimal("avg_purchase_rate", { precision: 12, scale: 2 }), // Weighted average cost
  lastPurchaseRate: decimal("last_purchase_rate", { precision: 12, scale: 2 }),
  lastPurchaseDate: timestamp("last_purchase_date"),
  minimumStockLevel: decimal("minimum_stock_level", { precision: 12, scale: 3 }).default("0"),
  maximumStockLevel: decimal("maximum_stock_level", { precision: 12, scale: 3 }),
  reorderPoint: decimal("reorder_point", { precision: 12, scale: 3 }),
  category: text("category"), // Spices, Grains, etc.
  buyerId: integer("buyer_id").notNull().references(() => buyers.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantBuyerIdx: uniqueIndex("stock_tenant_buyer_item_idx").on(table.tenantId, table.buyerId, table.itemName),
  tenantIdx: index("stock_tenant_idx").on(table.tenantId),
  buyerIdx: index("stock_buyer_idx").on(table.buyerId),
  itemNameIdx: index("stock_item_name_idx").on(table.itemName),
  lowStockIdx: index("stock_low_stock_idx").on(table.availableQuantity, table.minimumStockLevel),
}));

// Stock movement tracking (in/out transactions)
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  stockId: integer("stock_id").notNull().references(() => stockInventory.id),
  movementType: text("movement_type").notNull(), // purchase_in, sale_out, adjustment, return
  referenceType: text("reference_type").notNull(), // purchase_invoice, sale_order, manual_adjustment
  referenceId: integer("reference_id"), // ID of the reference document
  quantityChange: decimal("quantity_change", { precision: 12, scale: 3 }).notNull(), // +ve for in, -ve for out
  balanceAfter: decimal("balance_after", { precision: 12, scale: 3 }).notNull(),
  ratePerUnit: decimal("rate_per_unit", { precision: 12, scale: 2 }),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  notes: text("notes"),
  buyerId: integer("buyer_id").notNull().references(() => buyers.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (table) => ({
  stockIdx: index("stock_movement_stock_idx").on(table.stockId),
  tenantIdx: index("stock_movement_tenant_idx").on(table.tenantId),
  buyerIdx: index("stock_movement_buyer_idx").on(table.buyerId),
  typeIdx: index("stock_movement_type_idx").on(table.movementType),
  dateIdx: index("stock_movement_date_idx").on(table.createdAt),
  referenceIdx: index("stock_movement_reference_idx").on(table.referenceType, table.referenceId),
}));

// OCR extraction results for audit and improvement
export const ocrExtractionLogs = pgTable("ocr_extraction_logs", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  originalImagePath: text("original_image_path").notNull(),
  extractedText: text("extracted_text"), // Full OCR text
  extractedData: jsonb("extracted_data"), // Structured data extracted
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  processingTimeMs: integer("processing_time_ms"),
  ocrEngine: text("ocr_engine").default("tesseract"), // tesseract, google, aws, etc.
  errorMessage: text("error_message"),
  userCorrected: boolean("user_corrected").default(false),
  correctedData: jsonb("corrected_data"), // User corrections for ML improvement
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  processedAt: timestamp("processed_at").defaultNow(),
  processedBy: integer("processed_by").references(() => users.id),
}, (table) => ({
  invoiceIdx: index("ocr_log_invoice_idx").on(table.invoiceId),
  tenantIdx: index("ocr_log_tenant_idx").on(table.tenantId),
  dateIdx: index("ocr_log_date_idx").on(table.processedAt),
}));

// Supplier/Dalal master for auto-suggestions
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  mobile: text("mobile"),
  email: text("email"),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  bankDetails: jsonb("bank_details"), // Bank account information
  paymentTerms: text("payment_terms"), // 30 days, COD, etc.
  rating: decimal("rating", { precision: 3, scale: 2 }), // Supplier rating 1-5
  isActive: boolean("is_active").default(true),
  totalPurchases: decimal("total_purchases", { precision: 15, scale: 2 }).default("0"),
  lastPurchaseDate: timestamp("last_purchase_date"),
  buyerId: integer("buyer_id").notNull().references(() => buyers.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantBuyerIdx: index("supplier_tenant_buyer_idx").on(table.tenantId, table.buyerId),
  nameIdx: index("supplier_name_idx").on(table.name),
  mobileIdx: index("supplier_mobile_idx").on(table.mobile),
  gstIdx: index("supplier_gst_idx").on(table.gstNumber),
}));

// Insert schemas for buyer-side inventory system
export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  dalalSupplierName: z.string().min(1, "Supplier name is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
  netAmount: z.string().min(1, "Net amount is required"),
});

export const insertPurchaseInvoiceItemSchema = createInsertSchema(purchaseInvoiceItems).omit({
  id: true,
  createdAt: true,
}).extend({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  ratePerUnit: z.string().min(1, "Rate per unit is required"),
  amount: z.string().min(1, "Amount is required"),
});

export const insertStockInventorySchema = createInsertSchema(stockInventory).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
}).extend({
  itemName: z.string().min(1, "Item name is required"),
  unit: z.string().min(1, "Unit is required"),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Supplier name is required"),
});

// Types for new tables
export type FarmerBill = typeof farmerBills.$inferSelect;
export type InsertFarmerBill = typeof farmerBills.$inferInsert;
export type TaxInvoiceRecord = typeof taxInvoices.$inferSelect;
export type InsertTaxInvoice = typeof taxInvoices.$inferInsert;

// New buyer-side inventory types
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type InsertPurchaseInvoiceItem = z.infer<typeof insertPurchaseInvoiceItemSchema>;
export type StockInventory = typeof stockInventory.$inferSelect;
export type InsertStockInventory = z.infer<typeof insertStockInventorySchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;
export type OcrExtractionLog = typeof ocrExtractionLogs.$inferSelect;
export type InsertOcrExtractionLog = typeof ocrExtractionLogs.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
