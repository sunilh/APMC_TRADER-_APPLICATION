import { db } from './db';
import { 
  tenants, users, farmers, buyers, lots, bags, suppliers,
  stockInventory, stockMovements, purchaseInvoices, purchaseInvoiceItems
} from '@shared/schema';
import bcrypt from 'bcrypt';

export interface TestDataOptions {
  clearExisting?: boolean;
  tenantCount?: number;
  farmersPerTenant?: number;
  buyersPerTenant?: number;
  lotsPerTenant?: number;
  bagsPerLot?: number;
  invoicesPerTenant?: number;
}

export class TestDataGenerator {
  
  static async generateCompleteTestData(options: TestDataOptions = {}) {
    const {
      clearExisting = false,
      tenantCount = 3,
      farmersPerTenant = 10,
      buyersPerTenant = 8,
      lotsPerTenant = 15,
      bagsPerLot = 12,
      invoicesPerTenant = 6
    } = options;

    console.log('🚀 Starting comprehensive test data generation...');

    try {
      if (clearExisting) {
        await this.clearExistingData();
      }

      // Step 1: Create Test Tenants
      const testTenants = await this.createTestTenants(tenantCount);
      console.log(`✅ Created ${testTenants.length} test tenants`);

      // Step 2: Create Test Users for each tenant
      const testUsers = await this.createTestUsers(testTenants);
      console.log(`✅ Created ${testUsers.length} test users`);

      // Step 3: Create Farmers for each tenant
      const testFarmers = await this.createTestFarmers(testTenants, farmersPerTenant);
      console.log(`✅ Created ${testFarmers.length} test farmers`);

      // Step 4: Create Buyers for each tenant
      const testBuyers = await this.createTestBuyers(testTenants, buyersPerTenant);
      console.log(`✅ Created ${testBuyers.length} test buyers`);

      // Step 5: Create Lots for each tenant
      const testLots = await this.createTestLots(testTenants, testFarmers, lotsPerTenant);
      console.log(`✅ Created ${testLots.length} test lots`);

      // Step 6: Create Bags for each lot
      const testBags = await this.createTestBags(testLots, bagsPerLot);
      console.log(`✅ Created ${testBags.length} test bags`);

      // Step 7: Create Suppliers
      const testSuppliers = await this.createTestSuppliers(testTenants);
      console.log(`✅ Created ${testSuppliers.length} test suppliers`);

      // Step 8: Create Stock Inventory
      const testInventory = await this.createTestInventory(testTenants);
      console.log(`✅ Created ${testInventory.length} test inventory items`);

      // Step 9: Create Stock Movements
      const testMovements = await this.createTestStockMovements(testTenants, testInventory);
      console.log(`✅ Created ${testMovements.length} test stock movements`);

      // Step 10: Create Purchase Invoices
      const testInvoices = await this.createTestPurchaseInvoices(testTenants, testSuppliers, invoicesPerTenant);
      console.log(`✅ Created ${testInvoices.length} test purchase invoices`);

      return {
        tenants: testTenants,
        users: testUsers,
        farmers: testFarmers,
        buyers: testBuyers,
        lots: testLots,
        bags: testBags,
        suppliers: testSuppliers,
        inventory: testInventory,
        movements: testMovements,
        invoices: testInvoices,
        summary: {
          totalRecords: testTenants.length + testUsers.length + testFarmers.length + 
                      testBuyers.length + testLots.length + testBags.length + 
                      testSuppliers.length + testInventory.length + testMovements.length + testInvoices.length
        }
      };

    } catch (error) {
      console.error('❌ Error generating test data:', error);
      throw error;
    }
  }

  private static async clearExistingData() {
    console.log('🧹 Clearing existing test data...');
    
    // Clear in reverse dependency order
    await db.delete(purchaseInvoiceItems);
    await db.delete(purchaseInvoices);
    await db.delete(stockMovements);
    await db.delete(stockInventory);
    await db.delete(bags);
    await db.delete(lots);
    await db.delete(buyers);
    await db.delete(farmers);
    await db.delete(suppliers);
    await db.delete(users);
    // Don't delete existing tenants to preserve real data
  }

  private static async createTestTenants(count: number) {
    const tenantData = [
      {
        name: "MYSORE SPICE TRADING CO",
        apmcCode: "MST001",
        mobileNumber: "9876543210",
        gstNumber: "29ABCDE1234F1Z5",
        fssaiNumber: "12345678901234",
        panNumber: "ABCDE1234F",
        subscriptionPlan: "gold",
        maxUsers: 15,
        place: "Mysore",
        address: "123 Spice Market Road, Mysore, Karnataka",
        bankName: "State Bank of India",
        bankAccountNumber: "1234567890123456",
        ifscCode: "SBIN0001234",
        accountHolderName: "MYSORE SPICE TRADING CO",
        branchName: "Mysore Main Branch",
        branchAddress: "MG Road, Mysore, Karnataka",
        settings: {
          sgstRate: 2.5,
          cgstRate: 2.5,
          cessRate: 0.6,
          unloadHamaliPerBag: 3,
          packagingPerBag: 2,
          weighingFeePerBag: 1,
          apmcCommissionPercent: 3
        }
      },
      {
        name: "HUBLI AGRICULTURAL TRADERS",
        apmcCode: "HAT002", 
        mobileNumber: "8765432109",
        gstNumber: "29FGHIJ5678K2L6",
        fssaiNumber: "56789012345678",
        panNumber: "FGHIJ5678K",
        subscriptionPlan: "diamond",
        maxUsers: 25,
        place: "Hubli",
        address: "456 Market Yard, Hubli, Karnataka",
        bankName: "Canara Bank",
        bankAccountNumber: "6543210987654321",
        ifscCode: "CNRB0005678",
        accountHolderName: "HUBLI AGRICULTURAL TRADERS",
        branchName: "Hubli Market Branch",
        branchAddress: "Market Road, Hubli, Karnataka",
        settings: {
          sgstRate: 2.5,
          cgstRate: 2.5,
          cessRate: 0.6,
          unloadHamaliPerBag: 4,
          packagingPerBag: 3,
          weighingFeePerBag: 1.5,
          apmcCommissionPercent: 3.5
        }
      },
      {
        name: "BANGALORE COMMODITY EXCHANGE",
        apmcCode: "BCE003",
        mobileNumber: "7654321098", 
        gstNumber: "29KLMNO9012P3Q7",
        fssaiNumber: "90123456789012",
        panNumber: "KLMNO9012P",
        subscriptionPlan: "basic",
        maxUsers: 5,
        place: "Bangalore",
        address: "789 Commodity Circle, Bangalore, Karnataka",
        bankName: "HDFC Bank",
        bankAccountNumber: "9876543210987654",
        ifscCode: "HDFC0009876",
        accountHolderName: "BANGALORE COMMODITY EXCHANGE",
        branchName: "Bangalore Central Branch",
        branchAddress: "Commercial Street, Bangalore, Karnataka",
        settings: {
          sgstRate: 2.5,
          cgstRate: 2.5,
          cessRate: 0.6,
          unloadHamaliPerBag: 2.5,
          packagingPerBag: 2.5,
          weighingFeePerBag: 1,
          apmcCommissionPercent: 2.5
        }
      }
    ];

    const createdTenants = [];
    for (let i = 0; i < count && i < tenantData.length; i++) {
      const [tenant] = await db.insert(tenants).values(tenantData[i]).returning();
      createdTenants.push(tenant);
    }

    return createdTenants;
  }

  private static async createTestUsers(testTenants: any[]) {
    const hashedPassword = await bcrypt.hash('test123', 10);
    const userData = [];

    for (const tenant of testTenants) {
      // Admin user for each tenant
      userData.push({
        username: `admin_${tenant.apmcCode.toLowerCase()}`,
        password: hashedPassword,
        name: `Admin ${tenant.name}`,
        email: `admin@${tenant.apmcCode.toLowerCase()}.com`,
        role: 'admin',
        tenantId: tenant.id
      });

      // Staff users
      userData.push({
        username: `staff1_${tenant.apmcCode.toLowerCase()}`,
        password: hashedPassword,
        name: `Staff Manager ${tenant.name}`,
        email: `staff1@${tenant.apmcCode.toLowerCase()}.com`,
        role: 'staff',
        tenantId: tenant.id
      });

      userData.push({
        username: `staff2_${tenant.apmcCode.toLowerCase()}`,
        password: hashedPassword,
        name: `Operations Staff ${tenant.name}`,
        email: `staff2@${tenant.apmcCode.toLowerCase()}.com`,
        role: 'staff',
        tenantId: tenant.id
      });
    }

    return await db.insert(users).values(userData).returning();
  }

  private static async createTestFarmers(testTenants: any[], farmersPerTenant: number) {
    const farmerNames = [
      "Rajesh Kumar", "Suresh Patil", "Manjunath Gowda", "Krishnamurthy", "Basavaraj",
      "Gangadhar Reddy", "Nagaraj Rao", "Shivaraj", "Ramesh Babu", "Venkatesh",
      "Mahesh Kumar", "Jagadish", "Ravi Kumar", "Santosh", "Dinesh Gowda"
    ];

    const places = [
      "Mandya", "Hassan", "Tumkur", "Kolar", "Chikkamagaluru", 
      "Davangere", "Bellary", "Raichur", "Gulbarga", "Bijapur"
    ];

    const banks = [
      "State Bank of India", "Canara Bank", "Karnataka Bank", "Vijaya Bank", 
      "HDFC Bank", "ICICI Bank", "Axis Bank"
    ];

    const allFarmers = [];
    
    for (const tenant of testTenants) {
      for (let i = 0; i < farmersPerTenant; i++) {
        const farmerData = {
          name: farmerNames[i % farmerNames.length],
          nameAsInBank: farmerNames[i % farmerNames.length],
          mobile: `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          place: places[i % places.length],
          bankName: banks[i % banks.length],
          bankAccountNumber: `${Math.floor(Math.random() * 9000000000000000) + 1000000000000000}`,
          ifscCode: `${banks[i % banks.length].substring(0, 4).toUpperCase()}000${String(i).padStart(4, '0')}`,
          tenantId: tenant.id
        };
        
        const [farmer] = await db.insert(farmers).values(farmerData).returning();
        allFarmers.push(farmer);
      }
    }

    return allFarmers;
  }

  private static async createTestBuyers(testTenants: any[], buyersPerTenant: number) {
    const buyerCompanies = [
      "Karnataka Spice Traders", "Bangalore Export House", "Mumbai Masala Co", 
      "Chennai Chilies Ltd", "Delhi Dry Fruits", "Hyderabad Herbs", 
      "Pune Procurement Co", "Kolkata Commodities"
    ];

    const contactPersons = [
      "Ravi Sharma", "Amit Patel", "Sunil Kumar", "Manoj Singh", 
      "Rajesh Gupta", "Sanjay Joshi", "Vinod Agarwal", "Deepak Mehta"
    ];

    const cities = [
      "Bangalore", "Mumbai", "Chennai", "Delhi", "Hyderabad", 
      "Pune", "Kolkata", "Ahmedabad"
    ];

    const allBuyers = [];

    for (const tenant of testTenants) {
      for (let i = 0; i < buyersPerTenant; i++) {
        const buyerData = {
          name: buyerCompanies[i % buyerCompanies.length],
          contactPerson: contactPersons[i % contactPersons.length],
          mobile: `8${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          address: `${Math.floor(Math.random() * 999) + 1} Commercial Complex, ${cities[i % cities.length]}`,
          panNumber: `${String.fromCharCode(65 + i)}${String.fromCharCode(66 + i)}${String.fromCharCode(67 + i)}${String.fromCharCode(68 + i)}${String.fromCharCode(69 + i)}${String(1000 + i)}${String.fromCharCode(70 + i)}`,
          gstNumber: `29${String.fromCharCode(65 + i)}${String.fromCharCode(66 + i)}${String.fromCharCode(67 + i)}${String.fromCharCode(68 + i)}${String.fromCharCode(69 + i)}${String(1000 + i)}${String.fromCharCode(70 + i)}1Z${i}`,
          hsnCode: "09042110",
          tenantId: tenant.id
        };

        const [buyer] = await db.insert(buyers).values(buyerData).returning();
        allBuyers.push(buyer);
      }
    }

    return allBuyers;
  }

  private static async createTestLots(testTenants: any[], testFarmers: any[], lotsPerTenant: number) {
    const varieties = ["ARABICA-A", "ARABICA-B", "ROBUSTA-A", "ROBUSTA-B", "CHERRY-A"];
    const grades = ["A", "B", "C", "Premium"];
    
    const allLots = [];
    
    for (const tenant of testTenants) {
      const tenantFarmers = testFarmers.filter(f => f.tenantId === tenant.id);
      
      for (let i = 0; i < lotsPerTenant; i++) {
        const farmer = tenantFarmers[i % tenantFarmers.length];
        const isCompleted = Math.random() > 0.3; // 70% completed lots
        
        const lotData = {
          lotNumber: `LOT${String(i + 1).padStart(4, '0')}`,
          farmerId: farmer.id,
          variety: varieties[i % varieties.length],
          grade: grades[i % grades.length],
          lotPrice: Math.floor(Math.random() * 2000) + 8000, // 8000-10000 range
          vehicleRent: Math.floor(Math.random() * 500) + 200,
          advance: Math.floor(Math.random() * 1000) + 500,
          isCompleted: isCompleted,
          tenantId: tenant.id,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        };

        const [lot] = await db.insert(lots).values(lotData).returning();
        allLots.push(lot);
      }
    }

    return allLots;
  }

  private static async createTestBags(testLots: any[], bagsPerLot: number) {
    const allBags = [];
    
    for (const lot of testLots) {
      for (let i = 0; i < bagsPerLot; i++) {
        const bagData = {
          lotId: lot.id,
          bagNumber: i + 1,
          weight: Math.floor(Math.random() * 20) + 30, // 30-50 kg range
          tenantId: lot.tenantId
        };

        const [bag] = await db.insert(bags).values(bagData).returning();
        allBags.push(bag);
      }
    }

    return allBags;
  }

  private static async createTestSuppliers(testTenants: any[]) {
    const supplierData = [
      {
        name: "SRI GURU MAHANTESHWAR TRADING COMPANY",
        contactPerson: "Mahantesh Kumar",
        mobile: "9876543210",
        address: "123 Main Market, Mysore, Karnataka",
        gstNumber: "29ABCDE1234F1Z5"
      },
      {
        name: "KARNATAKA COFFEE BOARD",
        contactPerson: "Rajesh Gowda", 
        mobile: "8765432109",
        address: "Coffee Board Building, Bangalore, Karnataka",
        gstNumber: "29FGHIJ5678K2L6"
      },
      {
        name: "SOUTH INDIAN SPICE TRADERS",
        contactPerson: "Suresh Patil",
        mobile: "7654321098", 
        address: "Spice Market Complex, Hubli, Karnataka",
        gstNumber: "29KLMNO9012P3Q7"
      }
    ];

    const allSuppliers = [];
    
    for (const tenant of testTenants) {
      for (const supplierInfo of supplierData) {
        const [supplier] = await db.insert(suppliers).values({
          ...supplierInfo,
          tenantId: tenant.id
        }).returning();
        allSuppliers.push(supplier);
      }
    }

    return allSuppliers;
  }

  private static async createTestInventory(testTenants: any[]) {
    const inventoryItems = [
      { itemName: "ARABICA-A", description: "Premium Arabica Coffee Grade A", unit: "Quintal", minStockLevel: 50 },
      { itemName: "ARABICA-B", description: "Arabica Coffee Grade B", unit: "Quintal", minStockLevel: 30 },
      { itemName: "ROBUSTA-A", description: "Robusta Coffee Grade A", unit: "Quintal", minStockLevel: 40 },
      { itemName: "CHERRY-A", description: "Coffee Cherry Grade A", unit: "Quintal", minStockLevel: 25 },
      { itemName: "BLACK-PEPPER", description: "Premium Black Pepper", unit: "Quintal", minStockLevel: 15 }
    ];

    const allInventory = [];

    for (const tenant of testTenants) {
      for (const item of inventoryItems) {
        const currentStock = Math.floor(Math.random() * 100) + 20; // 20-120 range
        
        const [inventory] = await db.insert(stockInventory).values({
          ...item,
          currentStock,
          totalValue: currentStock * (Math.floor(Math.random() * 2000) + 8000), // Random value
          tenantId: tenant.id
        }).returning();
        allInventory.push(inventory);
      }
    }

    return allInventory;
  }

  private static async createTestStockMovements(testTenants: any[], testInventory: any[]) {
    const movementTypes = ["IN", "OUT"] as const;
    const allMovements = [];

    for (const tenant of testTenants) {
      const tenantInventory = testInventory.filter(inv => inv.tenantId === tenant.id);
      
      // Generate 20 random movements per tenant
      for (let i = 0; i < 20; i++) {
        const inventory = tenantInventory[Math.floor(Math.random() * tenantInventory.length)];
        const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
        
        const [movement] = await db.insert(stockMovements).values({
          stockInventoryId: inventory.id,
          movementType,
          quantity: Math.floor(Math.random() * 20) + 5, // 5-25 range
          unitPrice: Math.floor(Math.random() * 2000) + 8000,
          totalAmount: 0, // Will be calculated
          description: `${movementType === 'IN' ? 'Purchase from supplier' : 'Sale to buyer'}`,
          referenceNumber: `REF${String(i + 1).padStart(6, '0')}`,
          tenantId: tenant.id,
          createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) // Random date within last 15 days
        }).returning();
        allMovements.push(movement);
      }
    }

    return allMovements;
  }

  private static async createTestPurchaseInvoices(testTenants: any[], testSuppliers: any[], invoicesPerTenant: number) {
    const allInvoices = [];

    for (const tenant of testTenants) {
      const tenantSuppliers = testSuppliers.filter(s => s.tenantId === tenant.id);
      
      for (let i = 0; i < invoicesPerTenant; i++) {
        const supplier = tenantSuppliers[i % tenantSuppliers.length];
        const invoiceNumber = `INV${tenant.apmcCode}${String(i + 1).padStart(4, '0')}`;
        
        const [invoice] = await db.insert(purchaseInvoices).values({
          invoiceNumber,
          supplierId: supplier.id,
          invoiceDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000), // Random date within last 20 days
          totalAmount: Math.floor(Math.random() * 50000) + 10000, // 10k-60k range
          taxAmount: Math.floor(Math.random() * 5000) + 1000,
          netAmount: 0, // Will be calculated
          status: Math.random() > 0.2 ? 'processed' : 'pending', // 80% processed
          tenantId: tenant.id
        }).returning();
        allInvoices.push(invoice);
      }
    }

    return allInvoices;
  }
}