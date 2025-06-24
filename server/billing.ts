import { db } from "./db";
import { lots, bags, farmers } from "@shared/schema";
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
      lotsWithWeights.push({
        lotNumber: lot.lotNumber,
        lotPrice: parseFloat(lot.lotPrice),
        numberOfBags: lot.numberOfBags,
        weighedBags: weighedBags,
        totalWeight: totalWeight,
        totalWeightQuintals: totalWeightQuintals,
        vehicleRent: parseFloat(lot.vehicleRent || '0'),
        advance: parseFloat(lot.advance || '0'),
        unloadHamali: parseFloat(lot.unloadHamali || '0'),
        grade: lot.grade,
      });
    }
  }

  // Calculate summary - only from lots with weights and prices
  const summary = lotsWithWeights.reduce(
    (acc, lot) => ({
      totalLots: acc.totalLots + 1,
      totalBags: acc.totalBags + lot.numberOfBags,
      totalWeighedBags: acc.totalWeighedBags + lot.weighedBags,
      totalWeight: acc.totalWeight + lot.totalWeight,
      totalWeightQuintals: acc.totalWeightQuintals + lot.totalWeightQuintals,
      grossAmount: acc.grossAmount + (lot.totalWeightQuintals * lot.lotPrice),
      totalDeductions: acc.totalDeductions + lot.vehicleRent + lot.advance + lot.unloadHamali,
      netAmount: acc.netAmount + ((lot.totalWeightQuintals * lot.lotPrice) - lot.vehicleRent - lot.advance - lot.unloadHamali),
    }),
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