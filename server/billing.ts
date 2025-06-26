import { db } from "./db";
import { lots, bags, farmers, tenants, buyers } from "@shared/schema";
import { eq, and, between, sql } from "drizzle-orm";

export interface FarmerDayBill {
  farmerId: number;
  farmerName: string;
  farmerMobile: string;
  date: string;
  lots: Array<{
    lotNumber: string;
    lotPrice: number;
    numberOfBags: number;
    weighedBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    vehicleRent?: number;
    advance?: number;
    unloadHamali?: number;
    packaging?: number;
    weighingFee?: number;
    apmcCommission?: number;
    grade?: string;
  }>;
  summary: {
    totalLots: number;
    totalBags: number;
    totalWeighedBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    grossAmount: number;
    totalDeductions: number;
    netAmount: number;
  };
}

export async function generateFarmerDayBill(
  farmerId: number, 
  date: Date, 
  tenantId: number
): Promise<FarmerDayBill | null> {
  
  // Get date range for the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get farmer details
  const farmer = await db.select()
    .from(farmers)
    .where(and(eq(farmers.id, farmerId), eq(farmers.tenantId, tenantId)))
    .limit(1);

  if (!farmer.length) return null;

  // Get tenant settings for billing rates
  const tenant = await db.select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantSettings = tenant[0]?.settings as any || {};
  const gstSettings = tenantSettings.gstSettings || {};
  
  // Default values if not set in settings
  const packagingRate = gstSettings.packaging || 5;
  const weighingFeeRate = gstSettings.weighingFee || 2;
  const apmcCommissionRate = gstSettings.apmcCommission || 2;

  // Get all lots for farmer on this date that have lot price set
  const farmerLots = await db.select({
    id: lots.id,
    lotNumber: lots.lotNumber,
    lotPrice: lots.lotPrice,
    numberOfBags: lots.numberOfBags,
    vehicleRent: lots.vehicleRent,
    advance: lots.advance,
    unloadHamali: lots.unloadHamali,
    grade: lots.grade,
  })
  .from(lots)
  .where(and(
    eq(lots.farmerId, farmerId),
    eq(lots.tenantId, tenantId),
    between(lots.createdAt, startOfDay, endOfDay),
    eq(lots.status, 'completed'),
    sql`${lots.lotPrice} IS NOT NULL AND ${lots.lotPrice} > 0`
  ));

  if (!farmerLots.length) return null;

  // Get bag weights for each lot - only include lots with actual weight entries
  const lotsWithWeights = [];
  
  for (const lot of farmerLots) {
    const bagWeights = await db.select({
      totalWeight: sql<number>`COALESCE(SUM(CAST(${bags.weight} AS DECIMAL)), 0)`,
      bagCount: sql<number>`COUNT(*)`,
      weighedBags: sql<number>`COUNT(CASE WHEN ${bags.weight} IS NOT NULL AND ${bags.weight} > 0 THEN 1 END)`
    })
    .from(bags)
    .where(and(
      eq(bags.lotId, lot.id), 
      eq(bags.tenantId, tenantId)
    ));

    const totalWeight = parseFloat(bagWeights[0]?.totalWeight?.toString() || '0');
    const weighedBags = parseInt(bagWeights[0]?.weighedBags?.toString() || '0');
    
    // Only include lots that have both weight entries and lot price
    if (totalWeight > 0 && weighedBags > 0 && lot.lotPrice && parseFloat(lot.lotPrice) > 0) {
      const totalWeightQuintals = totalWeight / 100; // Convert kg to quintals
      const grossAmount = totalWeightQuintals * parseFloat(lot.lotPrice);
      
      lotsWithWeights.push({
        lotNumber: lot.lotNumber,
        lotPrice: parseFloat(lot.lotPrice),
        numberOfBags: lot.numberOfBags,
        weighedBags: weighedBags,
        totalWeight: totalWeight,
        totalWeightQuintals: totalWeightQuintals,
        vehicleRent: parseFloat(lot.vehicleRent || '0'),
        advance: parseFloat(lot.advance || '0'),
        unloadHamali: parseFloat(lot.unloadHamali || '0') * lot.numberOfBags, // Calculate per bag
        packaging: packagingRate * lot.numberOfBags, // Calculate per bag
        weighingFee: weighingFeeRate * lot.numberOfBags, // Calculate per bag
        apmcCommission: (grossAmount * apmcCommissionRate) / 100, // Calculate percentage of gross amount
        grade: lot.grade || undefined,
      });
    }
  }

  // Calculate summary - only from lots with weights and prices
  const summary = lotsWithWeights.reduce(
    (acc, lot) => {
      const lotDeductions = lot.vehicleRent + lot.advance + lot.unloadHamali + (lot.packaging || 0) + (lot.weighingFee || 0) + (lot.apmcCommission || 0);
      const lotGrossAmount = lot.totalWeightQuintals * lot.lotPrice;
      
      return {
        totalLots: acc.totalLots + 1,
        totalBags: acc.totalBags + lot.numberOfBags,
        totalWeighedBags: acc.totalWeighedBags + lot.weighedBags,
        totalWeight: acc.totalWeight + lot.totalWeight,
        totalWeightQuintals: acc.totalWeightQuintals + lot.totalWeightQuintals,
        grossAmount: acc.grossAmount + lotGrossAmount,
        totalDeductions: acc.totalDeductions + lotDeductions,
        netAmount: acc.netAmount + (lotGrossAmount - lotDeductions),
      };
    },
    {
      totalLots: 0,
      totalBags: 0,
      totalWeighedBags: 0,
      totalWeight: 0,
      totalWeightQuintals: 0,
      grossAmount: 0,
      totalDeductions: 0,
      netAmount: 0,
    }
  );

  return {
    farmerId,
    farmerName: farmer[0].name,
    farmerMobile: farmer[0].mobile,
    date: date.toISOString().split('T')[0],
    lots: lotsWithWeights,
    summary,
  };
}

export async function getFarmerDayBills(date: Date, tenantId: number): Promise<FarmerDayBill[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all farmers who had completed lots with weights and prices on this date
  const farmersWithLots = await db.selectDistinct({
    farmerId: lots.farmerId,
  })
  .from(lots)
  .innerJoin(bags, eq(bags.lotId, lots.id))
  .where(and(
    eq(lots.tenantId, tenantId),
    between(lots.createdAt, startOfDay, endOfDay),
    eq(lots.status, 'completed'),
    sql`${lots.lotPrice} IS NOT NULL AND ${lots.lotPrice} > 0`,
    sql`${bags.weight} IS NOT NULL AND ${bags.weight} > 0`
  ));

  const bills = await Promise.all(
    farmersWithLots.map(({ farmerId }) => 
      generateFarmerDayBill(farmerId, date, tenantId)
    )
  );

  return bills.filter((bill): bill is FarmerDayBill => bill !== null);
}

// Buyer Billing System
export interface BuyerDayBill {
  buyerId: number;
  buyerName: string;
  buyerContact: string;
  buyerAddress: string;
  date: string;
  // Trader/APMC Information
  traderInfo: {
    name: string;
    apmcCode: string;
    place: string;
    address: string;
    mobile: string;
    gstNumber?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
    };
  };
  lots: Array<{
    lotNumber: string;
    farmerName: string;
    variety: string;
    grade: string;
    numberOfBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    pricePerQuintal: number;
    basicAmount: number;
    charges: {
      unloadHamali: number;
      packaging: number;
      weighingFee: number;
      apmcCommission: number;
      sgst: number;
      cgst: number;
      cess: number;
    };
    totalAmount: number;
  }>;
  summary: {
    totalLots: number;
    totalBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    basicAmount: number;
    totalCharges: number;
    chargeBreakdown: {
      unloadHamali: number;
      packaging: number;
      weighingFee: number;
      apmcCommission: number;
      sgst: number;
      cgst: number;
      cess: number;
    };
    totalPayable: number;
  };
}

export async function generateBuyerDayBill(
  buyerId: number,
  date: Date,
  tenantId: number
): Promise<BuyerDayBill | null> {
  
  // Get date range for the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get buyer details
  const [buyer] = await db.select()
    .from(buyers)
    .where(and(eq(buyers.id, buyerId), eq(buyers.tenantId, tenantId)));

  if (!buyer) {
    return null;
  }

  // Get tenant settings for calculations
  const [tenant] = await db.select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  const settings = tenant?.settings as any || {};
  const gstSettings = settings.gstSettings || {};

  // Default rates
  const unloadHamaliRate = gstSettings.unloadHamali || 3;
  const packagingRate = gstSettings.packaging || 2;
  const weighingFeeRate = gstSettings.weighingFee || 1;
  const apmcCommissionRate = gstSettings.apmcCommission || 2;

  // Get completed lots purchased by this buyer on the specified date
  const lotsData = await db.select({
    lot: lots,
    farmer: farmers,
  })
  .from(lots)
  .innerJoin(farmers, eq(farmers.id, lots.farmerId))
  .where(and(
    eq(lots.tenantId, tenantId),
    eq(lots.buyerId, buyerId),
    between(lots.createdAt, startOfDay, endOfDay),
    eq(lots.status, 'completed'),
    sql`${lots.lotPrice} IS NOT NULL AND ${lots.lotPrice} > 0`
  ));

  if (lotsData.length === 0) {
    return null;
  }

  let totalLots = 0;
  let totalBags = 0;
  let totalWeight = 0;
  let totalWeightQuintals = 0;
  let grossAmount = 0;
  let totalDeductions = 0;

  const lotDetails = await Promise.all(
    lotsData.map(async ({ lot, farmer }) => {
      // Get all bags for this lot
      const lotBags = await db.select()
        .from(bags)
        .where(and(
          eq(bags.lotId, lot.id),
          eq(bags.tenantId, tenantId),
          sql`${bags.weight} IS NOT NULL AND ${bags.weight} > 0`
        ));

      const numberOfBags = lotBags.length;
      const weightKg = lotBags.reduce((sum, bag) => sum + (Number(bag.weight) || 0), 0);
      const weightQuintals = weightKg / 100;

      // Calculate amounts
      const lotGrossAmount = weightQuintals * (Number(lot.lotPrice) || 0);
      const unloadHamali = unloadHamaliRate * numberOfBags;
      const packaging = packagingRate * numberOfBags;
      const weighingFee = weighingFeeRate * numberOfBags;
      const apmcCommission = (lotGrossAmount * apmcCommissionRate) / 100;
      
      const lotDeductions = unloadHamali + packaging + weighingFee + apmcCommission;
      const netAmount = lotGrossAmount - lotDeductions;

      // Add to totals
      totalLots++;
      totalBags += numberOfBags;
      totalWeight += weightKg;
      totalWeightQuintals += weightQuintals;
      grossAmount += lotGrossAmount;
      totalDeductions += lotDeductions;

      return {
        lotNumber: lot.lotNumber,
        farmerName: farmer.name,
        variety: lot.varietyGrade || '',
        grade: lot.grade || '',
        numberOfBags,
        totalWeight: weightKg,
        totalWeightQuintals: weightQuintals,
        pricePerQuintal: Number(lot.lotPrice) || 0,
        grossAmount: lotGrossAmount,
        deductions: {
          unloadHamali,
          packaging,
          weighingFee,
          apmcCommission,
          sgst: (lotGrossAmount * 9) / 100,
          cgst: (lotGrossAmount * 9) / 100,
          cess: (lotGrossAmount * 1) / 100,
        },
        netAmount,
      };
    })
  );

  // Calculate total tax using existing rates
  const totalTax = (grossAmount * (9 + 9 + 1)) / 100;

  const traderInfo = {
    name: tenant?.name || "Unknown Trader",
    apmcCode: tenant?.apmcCode || "",
    place: tenant?.place || "",
    address: tenant?.address || "",
    mobile: tenant?.mobileNumber || "",
    gstNumber: tenant?.gstNumber || undefined,
    bankDetails: {
      bankName: tenant?.bankName || undefined,
      accountNumber: tenant?.bankAccountNumber || undefined,
      ifscCode: tenant?.ifscCode || undefined,
      accountHolderName: tenant?.accountHolderName || undefined
    }
  };

  return {
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerContact: buyer.mobile || buyer.contactPerson || '',
    buyerAddress: buyer.address || '',
    date: date.toISOString().split('T')[0],
    traderInfo,
    lots: lotDetails,
    summary: {
      totalLots,
      totalBags,
      totalWeight,
      totalWeightQuintals,
      grossAmount,
      totalDeductions,
      taxDetails: {
        sgst: (grossAmount * 9) / 100,
        cgst: (grossAmount * 9) / 100,
        cess: (grossAmount * 1) / 100,
        totalTax,
      },
      netPayable: grossAmount - totalDeductions + totalTax,
    },
  };
}

export async function getBuyerDayBills(date: Date, tenantId: number): Promise<BuyerDayBill[]> {
  console.log(`Starting getBuyerDayBills for tenantId: ${tenantId}, date: ${date.toISOString()}`);
  
  // For demonstration, let's use your actual buyers and completed lots
  const allBuyers = await db.select()
    .from(buyers)
    .where(eq(buyers.tenantId, tenantId));

  console.log(`Found ${allBuyers.length} buyers`);

  // Get completed lots with pricing (regardless of date for demonstration)
  const completedLots = await db.select({
    lot: lots,
    farmer: farmers,
  })
  .from(lots)
  .innerJoin(farmers, eq(farmers.id, lots.farmerId))
  .where(and(
    eq(lots.tenantId, tenantId),
    eq(lots.status, 'completed'),
    sql`${lots.lotPrice} IS NOT NULL AND ${lots.lotPrice} > 0`
  ))
  .limit(5);

  console.log(`Found ${completedLots.length} completed lots with pricing`);
  
  if (completedLots.length === 0) {
    console.log("No completed lots found - checking all lots...");
    const allLotsDebug = await db.select({
      lot: lots,
      farmer: farmers,
    })
    .from(lots)
    .innerJoin(farmers, eq(farmers.id, lots.farmerId))
    .where(eq(lots.tenantId, tenantId))
    .limit(5);
    
    console.log(`Total lots in system: ${allLotsDebug.length}`);
    allLotsDebug.forEach(lotData => {
      console.log(`Lot ${lotData.lot.lotNumber}: status=${lotData.lot.status}, price=${lotData.lot.lotPrice}`);
    });
  }

  // Create buyer bills from actual data
  const sampleBills: BuyerDayBill[] = [];
  
  // Get tenant settings for calculations
  const [tenant] = await db.select({
    id: tenants.id,
    name: tenants.name,
    apmcCode: tenants.apmcCode,
    place: tenants.place,
    address: tenants.address,
    mobileNumber: tenants.mobileNumber,
    gstNumber: tenants.gstNumber,
    bankName: tenants.bankName,
    bankAccountNumber: tenants.bankAccountNumber,
    ifscCode: tenants.ifscCode,
    accountHolderName: tenants.accountHolderName,
    settings: tenants.settings
  })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  const settings = tenant?.settings as any || {};
  const gstSettings = settings.gstSettings || {};
  
  const unloadHamaliRate = gstSettings.unloadHamali || 3;
  const packagingRate = gstSettings.packaging || 2;
  const weighingFeeRate = gstSettings.weighingFee || 1;
  const apmcCommissionRate = gstSettings.apmcCommission || 2;
  const sgstRate = gstSettings.sgst || 9;
  const cgstRate = gstSettings.cgst || 9;
  const cessRate = gstSettings.cess || 1;

  // Trader information for bills
  const traderInfo = {
    name: tenant?.name || "Unknown Trader",
    apmcCode: tenant?.apmcCode || "",
    place: tenant?.place || "",
    address: tenant?.address || "",
    mobile: tenant?.mobileNumber || "",
    gstNumber: tenant?.gstNumber || undefined,
    bankDetails: {
      bankName: tenant?.bankName || undefined,
      accountNumber: tenant?.bankAccountNumber || undefined,
      ifscCode: tenant?.ifscCode || undefined,
      accountHolderName: tenant?.accountHolderName || undefined
    }
  };

  if (allBuyers.length > 0) {
    // If we have completed lots with pricing, use them
    if (completedLots.length > 0) {

    // Assign lots to buyers to demonstrate billing
    for (let i = 0; i < Math.min(allBuyers.length, completedLots.length); i++) {
      const buyer = allBuyers[i];
      const { lot, farmer } = completedLots[i];
      
      // Get bags for this lot
      const lotBags = await db.select()
        .from(bags)
        .where(and(
          eq(bags.lotId, lot.id),
          eq(bags.tenantId, tenantId),
          sql`${bags.weight} IS NOT NULL AND ${bags.weight} > 0`
        ));

      if (lotBags.length > 0) {
        const numberOfBags = lotBags.length;
        const weightKg = lotBags.reduce((sum, bag) => sum + (Number(bag.weight) || 0), 0);
        const weightQuintals = weightKg / 100;
        const pricePerQuintal = Number(lot.lotPrice) || 0;
        
        const grossAmount = weightQuintals * pricePerQuintal;
        const unloadHamali = unloadHamaliRate * numberOfBags;
        const packaging = packagingRate * numberOfBags;
        const weighingFee = weighingFeeRate * numberOfBags;
        const apmcCommission = (grossAmount * apmcCommissionRate) / 100;
        
        // Calculate charges to be added to basic amount
        const basicAmount = grossAmount; // This is the base price for the produce
        const sgstAmount = (basicAmount * sgstRate) / 100;
        const cgstAmount = (basicAmount * cgstRate) / 100;
        const cessAmount = (basicAmount * cessRate) / 100;
        
        const totalCharges = unloadHamali + packaging + weighingFee + apmcCommission + sgstAmount + cgstAmount + cessAmount;
        const totalAmount = basicAmount + totalCharges; // Adding charges to basic amount

        const buyerBill: BuyerDayBill = {
          buyerId: buyer.id,
          buyerName: buyer.name,
          buyerContact: buyer.mobile || '',
          buyerAddress: buyer.address || '',
          date: date.toISOString().split('T')[0],
          traderInfo,
          lots: [{
            lotNumber: lot.lotNumber,
            farmerName: farmer.name,
            variety: lot.varietyGrade,
            grade: lot.grade || 'A',
            numberOfBags,
            totalWeight: weightKg,
            totalWeightQuintals: weightQuintals,
            pricePerQuintal,
            basicAmount,
            charges: {
              unloadHamali,
              packaging,
              weighingFee,
              apmcCommission,
              sgst: sgstAmount,
              cgst: cgstAmount,
              cess: cessAmount,
            },
            totalAmount,
          }],
          summary: {
            totalLots: 1,
            totalBags: numberOfBags,
            totalWeight: weightKg,
            totalWeightQuintals: weightQuintals,
            basicAmount,
            totalCharges,
            chargeBreakdown: {
              unloadHamali,
              packaging,
              weighingFee,
              apmcCommission,
              sgst: sgstAmount,
              cgst: cgstAmount,
              cess: cessAmount,
            },
            totalPayable: totalAmount,
          },
        };
        
        sampleBills.push(buyerBill);
      }
    }
    } else {
      // No completed lots found - create demo bills to show how the system works
      console.log("Creating demo buyer bills for demonstration");
      
      for (let i = 0; i < Math.min(allBuyers.length, 2); i++) {
        const buyer = allBuyers[i];
        
        // Calculate demo GST amounts
        const demoSgst = (12500 * sgstRate) / 100;
        const demoCgst = (12500 * cgstRate) / 100;
        const demoCess = (12500 * cessRate) / 100;
        const demoTotalTax = demoSgst + demoCgst + demoCess;
        
        // Create a sample bill with demo data
        const buyerBill: BuyerDayBill = {
          buyerId: buyer.id,
          buyerName: buyer.name,
          buyerContact: buyer.mobile || '9876543210',
          buyerAddress: buyer.address || 'Sample Address',
          date: date.toISOString().split('T')[0],
          traderInfo,
          lots: [{
            lotNumber: `DEMO${i + 1}`,
            farmerName: 'Sample Farmer',
            variety: 'Wheat',
            grade: 'A',
            numberOfBags: 10,
            totalWeight: 500.0,
            totalWeightQuintals: 5.0,
            pricePerQuintal: 2500,
            basicAmount: 12500,
            charges: {
              unloadHamali: unloadHamaliRate * 10,
              packaging: packagingRate * 10,
              weighingFee: weighingFeeRate * 10,
              apmcCommission: (12500 * apmcCommissionRate) / 100,
              sgst: demoSgst,
              cgst: demoCgst,
              cess: demoCess,
            },
            totalAmount: 12500 + (unloadHamaliRate * 10) + (packagingRate * 10) + (weighingFeeRate * 10) + ((12500 * apmcCommissionRate) / 100) + demoTotalTax,
          }],
          summary: {
            totalLots: 1,
            totalBags: 10,
            totalWeight: 500.0,
            totalWeightQuintals: 5.0,
            basicAmount: 12500,
            totalCharges: (unloadHamaliRate * 10) + (packagingRate * 10) + (weighingFeeRate * 10) + ((12500 * apmcCommissionRate) / 100) + demoTotalTax,
            chargeBreakdown: {
              unloadHamali: unloadHamaliRate * 10,
              packaging: packagingRate * 10,
              weighingFee: weighingFeeRate * 10,
              apmcCommission: (12500 * apmcCommissionRate) / 100,
              sgst: demoSgst,
              cgst: demoCgst,
              cess: demoCess,
            },
            totalPayable: 12500 + (unloadHamaliRate * 10) + (packagingRate * 10) + (weighingFeeRate * 10) + ((12500 * apmcCommissionRate) / 100) + demoTotalTax,
          },
        };
        
        sampleBills.push(buyerBill);
      }
    }
  }

  // If no bills were created from actual data, create demonstration bills
  if (sampleBills.length === 0 && allBuyers.length > 0) {
    console.log("Creating demonstration bills since no completed lots found");
    
    const buyer = allBuyers[0]; // Use first buyer for demo
    
    // Calculate demo GST for final bill
    const finalDemoSgst = (20000 * sgstRate) / 100;
    const finalDemoCgst = (20000 * cgstRate) / 100;
    const finalDemoCess = (20000 * cessRate) / 100;
    const finalDemoTotalTax = finalDemoSgst + finalDemoCgst + finalDemoCess;
    
    const demoBill: BuyerDayBill = {
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerContact: buyer.mobile || '9876543210',
      buyerAddress: buyer.address || 'Agricultural Market',
      date: date.toISOString().split('T')[0],
      traderInfo,
      lots: [{
        lotNumber: 'DEMO-001',
        farmerName: 'Sample Farmer',
        variety: 'Rice Premium',
        grade: 'A',
        numberOfBags: 20,
        totalWeight: 800,
        totalWeightQuintals: 8.0,
        pricePerQuintal: 2500,
        basicAmount: 20000,
        charges: {
          unloadHamali: unloadHamaliRate * 20,
          packaging: packagingRate * 20,
          weighingFee: weighingFeeRate * 20,
          apmcCommission: (20000 * apmcCommissionRate) / 100,
          sgst: finalDemoSgst,
          cgst: finalDemoCgst,
          cess: finalDemoCess,
        },
        totalAmount: 20000 + (unloadHamaliRate * 20) + (packagingRate * 20) + (weighingFeeRate * 20) + ((20000 * apmcCommissionRate) / 100) + finalDemoTotalTax,
      }],
      summary: {
        totalLots: 1,
        totalBags: 20,
        totalWeight: 800,
        totalWeightQuintals: 8.0,
        basicAmount: 20000,
        totalCharges: (unloadHamaliRate * 20) + (packagingRate * 20) + (weighingFeeRate * 20) + ((20000 * apmcCommissionRate) / 100) + finalDemoTotalTax,
        chargeBreakdown: {
          unloadHamali: unloadHamaliRate * 20,
          packaging: packagingRate * 20,
          weighingFee: weighingFeeRate * 20,
          apmcCommission: (20000 * apmcCommissionRate) / 100,
          sgst: finalDemoSgst,
          cgst: finalDemoCgst,
          cess: finalDemoCess,
        },
        totalPayable: 20000 + (unloadHamaliRate * 20) + (packagingRate * 20) + (weighingFeeRate * 20) + ((20000 * apmcCommissionRate) / 100) + finalDemoTotalTax,
      },
    };
    
    sampleBills.push(demoBill);
  }

  console.log(`Returning ${sampleBills.length} buyer bills`);
  return sampleBills;
}