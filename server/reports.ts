import { db } from "./db";
import { lots, bags, tenants } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface TaxReportData {
  period: string;
  totalTransactions: number;
  totalWeight: number;
  totalWeightQuintals: number;
  basicAmount: number;
  packaging: number;
  weighingCharges: number;
  commission: number;
  cessAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

export interface DetailedTaxReport {
  summary: TaxReportData;
  transactions: Array<{
    date: string;
    lotNumber: string;
    farmerName: string;
    buyerName: string;
    weight: number;
    weightQuintals: number;
    basicAmount: number;
    cessAmount: number;
    sgstAmount: number;
    cgstAmount: number;
    totalTaxAmount: number;
    totalAmount: number;
  }>;
}

export async function generateTaxReport(
  tenantId: number,
  startDate: Date,
  endDate: Date,
  reportType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
): Promise<DetailedTaxReport> {
  
  // Get tenant settings for tax rates
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Parse settings from JSON field
  const settings = tenant.settings as any || {};
  const sgstRate = parseFloat(settings.sgstRate || "2.5") / 100;
  const cgstRate = parseFloat(settings.cgstRate || "2.5") / 100;
  const cessRate = parseFloat(settings.cessRate || "0.6") / 100;
  const packagingRate = parseFloat(settings.packagingPerBag || "5");
  const weighingRate = parseFloat(settings.weighingFeePerBag || "2");
  const commissionRate = parseFloat(settings.apmcCommissionPercentage || "3") / 100;

  // Get completed lots within date range
  const completedLots = await db
    .select({
      lot: lots,
    })
    .from(lots)
    .where(
      and(
        eq(lots.tenantId, tenantId),
        eq(lots.status, "completed"),
        gte(lots.createdAt, startDate),
        lte(lots.createdAt, endDate)
      )
    );

  const transactions = [];
  let totalWeight = 0;
  let totalBasicAmount = 0;
  let totalPackaging = 0;
  let totalWeighingCharges = 0;
  let totalCommission = 0;
  let totalCessAmount = 0;
  let totalSgstAmount = 0;
  let totalCgstAmount = 0;

  for (const { lot } of completedLots) {
    // Get bags for this lot
    const lotBags = await db
      .select()
      .from(bags)
      .where(eq(bags.lotId, lot.id));

    const lotWeight = lotBags.reduce((sum, bag) => sum + parseFloat(bag.weight), 0);
    const lotWeightQuintals = lotWeight / 100;
    const lotPrice = parseFloat(lot.lotPrice || "0");
    const basicAmount = lotWeightQuintals * lotPrice;

    // Calculate charges
    const packaging = lotBags.length * packagingRate;
    const weighingCharges = lotBags.length * weighingRate;
    const commission = basicAmount * commissionRate;
    
    // Calculate taxes
    const cessAmount = basicAmount * cessRate;
    const taxableAmount = basicAmount + packaging + weighingCharges + commission;
    const sgstAmount = taxableAmount * sgstRate;
    const cgstAmount = taxableAmount * cgstRate;
    const totalTaxAmount = cessAmount + sgstAmount + cgstAmount;
    const totalAmount = taxableAmount + totalTaxAmount;

    transactions.push({
      date: lot.createdAt?.toISOString().split('T')[0] || '',
      lotNumber: lot.lotNumber || '',
      farmerName: "Farmer", // Will be populated with actual farmer data
      buyerName: "Buyer",   // Will be populated with actual buyer data
      weight: lotWeight,
      weightQuintals: lotWeightQuintals,
      basicAmount,
      cessAmount,
      sgstAmount,
      cgstAmount,
      totalTaxAmount,
      totalAmount
    });

    // Add to totals
    totalWeight += lotWeight;
    totalBasicAmount += basicAmount;
    totalPackaging += packaging;
    totalWeighingCharges += weighingCharges;
    totalCommission += commission;
    totalCessAmount += cessAmount;
    totalSgstAmount += sgstAmount;
    totalCgstAmount += cgstAmount;
  }

  const summary: TaxReportData = {
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    totalTransactions: transactions.length,
    totalWeight,
    totalWeightQuintals: totalWeight / 100,
    basicAmount: totalBasicAmount,
    packaging: totalPackaging,
    weighingCharges: totalWeighingCharges,
    commission: totalCommission,
    cessAmount: totalCessAmount,
    sgstAmount: totalSgstAmount,
    cgstAmount: totalCgstAmount,
    totalTaxAmount: totalCessAmount + totalSgstAmount + totalCgstAmount,
    totalAmount: totalBasicAmount + totalPackaging + totalWeighingCharges + totalCommission + totalCessAmount + totalSgstAmount + totalCgstAmount
  };

  return {
    summary,
    transactions
  };
}

export function getDateRange(reportType: 'daily' | 'weekly' | 'monthly' | 'yearly', date?: Date): { startDate: Date; endDate: Date } {
  const today = date || new Date();
  
  switch (reportType) {
    case 'daily':
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return { startDate: startOfDay, endDate: endOfDay };
      
    case 'weekly':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { startDate: startOfWeek, endDate: endOfWeek };
      
    case 'monthly':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return { startDate: startOfMonth, endDate: endOfMonth };
      
    case 'yearly':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      return { startDate: startOfYear, endDate: endOfYear };
      
    default:
      throw new Error("Invalid report type");
  }
}