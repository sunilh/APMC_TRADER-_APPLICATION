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
    totalWeight: number;
    vehicleRent?: number;
    advance?: number;
    unloadHamali?: number;
    grade?: string;
  }>;
  summary: {
    totalLots: number;
    totalBags: number;
    totalWeight: number;
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

  // Get all lots for farmer on this date
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
    eq(lots.status, 'completed')
  ));

  if (!farmerLots.length) return null;

  // Get bag weights for each lot
  const lotsWithWeights = await Promise.all(
    farmerLots.map(async (lot) => {
      const bagWeights = await db.select({
        totalWeight: sql<number>`COALESCE(SUM(CAST(${bags.weight} AS DECIMAL)), 0)`,
        bagCount: sql<number>`COUNT(*)`
      })
      .from(bags)
      .where(and(eq(bags.lotId, lot.id), eq(bags.tenantId, tenantId)));

      return {
        lotNumber: lot.lotNumber,
        lotPrice: parseFloat(lot.lotPrice || '0'),
        numberOfBags: lot.numberOfBags,
        totalWeight: parseFloat(bagWeights[0]?.totalWeight?.toString() || '0'),
        vehicleRent: parseFloat(lot.vehicleRent || '0'),
        advance: parseFloat(lot.advance || '0'),
        unloadHamali: parseFloat(lot.unloadHamali || '0'),
        grade: lot.grade,
      };
    })
  );

  // Calculate summary
  const summary = lotsWithWeights.reduce(
    (acc, lot) => ({
      totalLots: acc.totalLots + 1,
      totalBags: acc.totalBags + lot.numberOfBags,
      totalWeight: acc.totalWeight + lot.totalWeight,
      grossAmount: acc.grossAmount + lot.lotPrice,
      totalDeductions: acc.totalDeductions + lot.vehicleRent + lot.advance + lot.unloadHamali,
      netAmount: acc.netAmount + (lot.lotPrice - lot.vehicleRent - lot.advance - lot.unloadHamali),
    }),
    {
      totalLots: 0,
      totalBags: 0,
      totalWeight: 0,
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

  // Get all farmers who had lots on this date
  const farmersWithLots = await db.selectDistinct({
    farmerId: lots.farmerId,
  })
  .from(lots)
  .where(and(
    eq(lots.tenantId, tenantId),
    between(lots.createdAt, startOfDay, endOfDay),
    eq(lots.status, 'completed')
  ));

  const bills = await Promise.all(
    farmersWithLots.map(({ farmerId }) => 
      generateFarmerDayBill(farmerId, date, tenantId)
    )
  );

  return bills.filter((bill): bill is FarmerDayBill => bill !== null);
}