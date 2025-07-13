import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  traderName?: string;
  traderContact?: string;
  traderAddress?: string;
  items: Array<{
    itemName: string;
    quantity: string;
    unit: string;
    ratePerUnit: string;
    amount: string;
  }>;
  totalAmount?: string;
  taxAmount?: string;
  netAmount?: string;
  confidence: number;
}

interface OCRResult {
  extractedText: string;
  extractedData: ExtractedInvoiceData;
  confidence: number;
  processingTime: number;
}

export class OCRService {
  private static readonly UPLOAD_DIR = 'uploads/invoices';
  private static readonly PROCESSED_DIR = 'uploads/processed';

  static async initializeDirectories() {
    try {
      await fs.access(this.UPLOAD_DIR);
    } catch {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    }

    try {
      await fs.access(this.PROCESSED_DIR);
    } catch {
      await fs.mkdir(this.PROCESSED_DIR, { recursive: true });
    }
  }

  /**
   * Process uploaded invoice image with OCR
   */
  static async processInvoiceImage(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      await this.initializeDirectories();

      // Preprocess image for better OCR accuracy
      const processedImagePath = await this.preprocessImage(imagePath);

      // Extract text using Tesseract
      const ocrResult = await Tesseract.recognize(processedImagePath, 'eng', {
        logger: m => console.log(`OCR Progress: ${m.status} ${Math.round(m.progress * 100)}%`)
      });

      const extractedText = ocrResult.data.text;
      const confidence = ocrResult.data.confidence;

      // Parse extracted text into structured data
      const extractedData = this.parseInvoiceText(extractedText, confidence);

      const processingTime = Date.now() - startTime;

      return {
        extractedText,
        extractedData,
        confidence,
        processingTime
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private static async preprocessImage(imagePath: string): Promise<string> {
    const processedPath = path.join(this.PROCESSED_DIR, `processed_${Date.now()}.png`);

    await sharp(imagePath)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toFile(processedPath);

    return processedPath;
  }

  /**
   * Parse OCR text into structured invoice data
   */
  private static parseInvoiceText(text: string, confidence: number): ExtractedInvoiceData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const extractedData: ExtractedInvoiceData = {
      items: [],
      confidence
    };

    let currentSection = 'header';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Extract invoice number
      if (lowerLine.includes('invoice') && lowerLine.includes('no')) {
        const invoiceMatch = line.match(/(?:invoice\s*(?:no|number|#)?[:\s]*)([\w\-\/]+)/i);
        if (invoiceMatch) {
          extractedData.invoiceNumber = invoiceMatch[1];
        }
      }

      // Extract date
      if (lowerLine.includes('date')) {
        const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
        if (dateMatch) {
          extractedData.invoiceDate = dateMatch[1];
        }
      }

      // Extract supplier name (usually at top or after "From:")
      if (i < 5 && line.length > 3 && !lowerLine.includes('invoice') && !lowerLine.includes('date')) {
        if (!extractedData.traderName && this.isLikelyBusinessName(line)) {
          extractedData.traderName = line;
        }
      }

      // Extract contact number
      if (lowerLine.includes('mobile') || lowerLine.includes('phone') || lowerLine.includes('contact')) {
        const phoneMatch = line.match(/(\d{10,12})/);
        if (phoneMatch) {
          extractedData.traderContact = phoneMatch[1];
        }
      }

      // Extract address (lines with common address words)
      if (this.isLikelyAddress(lowerLine) && !extractedData.traderAddress) {
        extractedData.traderAddress = line;
      }

      // Extract items table
      if (this.isLikelyItemRow(line)) {
        const item = this.parseItemRow(line);
        if (item) {
          extractedData.items.push(item);
        }
      }

      // Extract total amount
      if (lowerLine.includes('total') && !lowerLine.includes('qty')) {
        const amountMatch = line.match(/(\d+(?:\.\d{2})?)/);
        if (amountMatch) {
          if (lowerLine.includes('gross') || lowerLine.includes('sub')) {
            extractedData.totalAmount = amountMatch[1];
          } else if (lowerLine.includes('net') || lowerLine.includes('final')) {
            extractedData.netAmount = amountMatch[1];
          } else {
            extractedData.totalAmount = amountMatch[1];
          }
        }
      }

      // Extract tax amount
      if (lowerLine.includes('tax') || lowerLine.includes('gst')) {
        const taxMatch = line.match(/(\d+(?:\.\d{2})?)/);
        if (taxMatch) {
          extractedData.taxAmount = taxMatch[1];
        }
      }
    }

    // If no net amount found, use total amount
    if (!extractedData.netAmount && extractedData.totalAmount) {
      extractedData.netAmount = extractedData.totalAmount;
    }

    return extractedData;
  }

  /**
   * Check if line is likely a business name
   */
  private static isLikelyBusinessName(line: string): boolean {
    const businessKeywords = ['traders', 'enterprises', 'company', 'corp', 'ltd', 'pvt', 'co', 'stores', 'mart', 'agency'];
    const lowerLine = line.toLowerCase();
    return businessKeywords.some(keyword => lowerLine.includes(keyword)) || 
           (line.length > 5 && line.length < 50 && /^[A-Z]/.test(line));
  }

  /**
   * Check if line is likely an address
   */
  private static isLikelyAddress(line: string): boolean {
    const addressKeywords = ['street', 'road', 'lane', 'area', 'city', 'state', 'pin', 'pincode', 'dist', 'district'];
    return addressKeywords.some(keyword => line.includes(keyword));
  }

  /**
   * Check if line is likely an item row
   */
  private static isLikelyItemRow(line: string): boolean {
    // Look for patterns like: item_name quantity unit rate amount
    const numberCount = (line.match(/\d+/g) || []).length;
    const words = line.split(/\s+/);
    
    return numberCount >= 2 && 
           words.length >= 3 && 
           words.length <= 10 && 
           !line.toLowerCase().includes('total') &&
           !line.toLowerCase().includes('subtotal');
  }

  /**
   * Parse item row into structured data
   */
  private static parseItemRow(line: string): {
    itemName: string;
    quantity: string;
    unit: string;
    ratePerUnit: string;
    amount: string;
  } | null {
    const parts = line.split(/\s+/);
    const numbers = line.match(/\d+(?:\.\d+)?/g) || [];
    
    if (numbers.length < 2) return null;

    // Basic parsing - this can be enhanced based on actual invoice formats
    const quantity = numbers[0];
    const ratePerUnit = numbers[numbers.length - 2] || numbers[0];
    const amount = numbers[numbers.length - 1];
    
    // Extract item name (non-numeric parts at the beginning)
    const itemParts = [];
    for (const part of parts) {
      if (!/^\d+(\.\d+)?$/.test(part)) {
        itemParts.push(part);
      } else {
        break;
      }
    }
    
    const itemName = itemParts.join(' ') || 'Unknown Item';
    const unit = this.extractUnit(line) || 'Kg';

    return {
      itemName,
      quantity,
      unit,
      ratePerUnit,
      amount
    };
  }

  /**
   * Extract unit from text
   */
  private static extractUnit(text: string): string {
    const units = ['kg', 'gram', 'quintal', 'bag', 'bags', 'piece', 'pcs', 'liter', 'ml'];
    const lowerText = text.toLowerCase();
    
    for (const unit of units) {
      if (lowerText.includes(unit)) {
        return unit;
      }
    }
    
    return 'Kg'; // Default unit
  }

  /**
   * Save uploaded file
   */
  static async saveUploadedFile(file: Express.Multer.File, tenantId: number): Promise<string> {
    await this.initializeDirectories();
    
    const filename = `${tenantId}_${Date.now()}_${file.originalname}`;
    const filepath = path.join(this.UPLOAD_DIR, filename);
    
    await fs.writeFile(filepath, file.buffer);
    
    return filepath;
  }

  /**
   * Clean up processed files older than 24 hours
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const dirs = [this.UPLOAD_DIR, this.PROCESSED_DIR];
      
      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          const ageMs = now - stats.mtime.getTime();
          
          // Delete files older than 24 hours
          if (ageMs > 24 * 60 * 60 * 1000) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }
}

// Auto-cleanup on startup
OCRService.cleanupOldFiles();