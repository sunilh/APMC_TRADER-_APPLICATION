interface APMCPrintData {
  place: string;
  traderName: string;
  traderCode: string;
  traderAddress: string;
  date: string;
  lots: Array<{
    lotNumber: string;
    farmerName: string;
    place: string;
    numberOfBags: number;
  }>;
}

interface BagEntryData {
  lot: {
    lotNumber: string;
    farmer: {
      name: string;
      mobile: string;
      place: string;
    };
    varietyGrade: string;
    numberOfBags: number;
  };
  bags: Array<{
    bagNumber: number;
    weight?: number;
    grade?: string;
    notes?: string;
  }>;
  summary: {
    totalBags: number;
    totalWeight: number;
    averageWeight: number;
  };
}

// Check if device is mobile
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
}

// Generate APMC format PDF
export async function generateAPMCPDF(data: APMCPrintData): Promise<void> {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // For mobile devices, create a downloadable HTML file
    generateDownloadableHTML(data, 'Trader_Lots_Report');
    return;
  }
  
  // For desktop, try popup window approach
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    // Fallback to download if popup blocked
    generateDownloadableHTML(data, 'Trader_Lots_Report');
    return;
  }

  const html = generateAPMCPopupHTML(data);
  printWindow.document.write(html);
  printWindow.document.close();
}

// Generate bag entry report PDF
export async function generateBagEntryPDF(data: BagEntryData): Promise<void> {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // For mobile devices, create a downloadable HTML file
    generateDownloadableBagEntryHTML(data, 'Bag_Entry_Report');
    return;
  }
  
  // For desktop, try popup window approach
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    // Fallback to download if popup blocked
    generateDownloadableBagEntryHTML(data, 'Bag_Entry_Report');
    return;
  }

  const html = generateBagEntryPopupHTML(data);
  printWindow.document.write(html);
  printWindow.document.close();
}

// Generate downloadable HTML file for mobile devices
function generateDownloadableHTML(data: APMCPrintData, filename: string): void {
  const html = generateAPMCMobileHTML(data);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Generate downloadable HTML file for bag entry report
function generateDownloadableBagEntryHTML(data: BagEntryData, filename: string): void {
  const html = generateBagEntryMobileHTML(data);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Generate the mobile-friendly HTML content for trader report
function generateAPMCMobileHTML(data: APMCPrintData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trader Lots Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #000;
          background: white;
          padding: 20px;
        }
        
        .trader-container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #000;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .header h1 {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .header h2 {
          font-size: 16px;
          font-weight: normal;
        }
        
        .details-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
        }
        
        .detail-item {
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        
        .detail-item strong {
          min-width: 120px;
          margin-right: 10px;
        }
        
        .underline {
          border-bottom: 1px solid #000;
          min-width: 150px;
          padding-bottom: 2px;
        }
        
        .lots-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .lots-table th,
        .lots-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        
        .lots-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .total-row {
          font-weight: bold;
          background-color: #f9f9f9;
        }
        
        .signatures-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 60px;
        }
        
        .signature-box {
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 1px solid #000;
          height: 60px;
          margin-bottom: 10px;
        }
        
        .mobile-controls {
          margin-bottom: 20px;
          text-align: center;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .mobile-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          margin: 0 5px;
          min-width: 120px;
        }
        
        .mobile-btn:hover {
          background: #0056b3;
        }
        
        .mobile-btn.secondary {
          background: #6c757d;
        }
        
        .mobile-btn.secondary:hover {
          background: #545b62;
        }
        
        @media print {
          body { margin: 0; padding: 10px; }
          .trader-container { border: 2px solid #000; }
          .mobile-controls { display: none; }
        }
        
        @media (max-width: 768px) {
          .details-section {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .signatures-section {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          
          .lots-table {
            font-size: 12px;
          }
          
          .lots-table th,
          .lots-table td {
            padding: 6px;
          }
          
          .trader-container {
            padding: 15px;
          }
          
          body {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="mobile-controls">
        <button class="mobile-btn" onclick="window.print()">Print</button>
        <button class="mobile-btn secondary" onclick="window.print()">Save as PDF</button>
      </div>
      
      <div class="trader-container">
        <div class="header">
          <h1>${data.traderName.toUpperCase()}</h1>
          <h2>${data.traderAddress}</h2>
        </div>
        
        <div class="details-section">
          <div>
            <div class="detail-item">
              <strong>Trader Code:</strong>
              <span class="underline">${data.traderCode}</span>
            </div>
            <div class="detail-item">
              <strong>Mobile Number:</strong>
              <span class="underline">${data.traderName}</span>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <strong>Date:</strong>
              <span class="underline">${data.date}</span>
            </div>
            <div class="detail-item">
              <strong>Place:</strong>
              <span class="underline">${data.place}</span>
            </div>
          </div>
        </div>
        
        <table class="lots-table">
          <thead>
            <tr>
              <th>Lot Number</th>
              <th>Farmer Name</th>
              <th>Place</th>
              <th>Number of Bags</th>
            </tr>
          </thead>
          <tbody>
            ${data.lots.map(lot => `
              <tr>
                <td>${lot.lotNumber}</td>
                <td>${lot.farmerName}</td>
                <td>${lot.place}</td>
                <td>${lot.numberOfBags}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>Total</strong></td>
              <td><strong>${data.lots.reduce((sum, lot) => sum + lot.numberOfBags, 0)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div>Trader Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div>APMC Officer Signature</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate popup HTML for desktop trader report
function generateAPMCPopupHTML(data: APMCPrintData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Trader Receipt - ${data.date}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        
        .trader-container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #000;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        
        .header h2 {
          font-size: 18px;
          margin: 0;
        }
        
        .details-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
        }
        
        .detail-item {
          margin-bottom: 15px;
        }
        
        .detail-item strong {
          display: inline-block;
          width: 120px;
        }
        
        .detail-item .underline {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 150px;
          padding-bottom: 2px;
        }
        
        .lots-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .lots-table th,
        .lots-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        
        .lots-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .total-row {
          font-weight: bold;
          background-color: #f9f9f9;
        }
        
        .signatures-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 60px;
        }
        
        .signature-box {
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 1px solid #000;
          height: 60px;
          margin-bottom: 10px;
        }
        
        @media print {
          body { margin: 0; padding: 10px; }
          .trader-container { border: 2px solid #000; }
        }
      </style>
    </head>
    <body>
      <div class="trader-container">
        <div class="header">
          <h1>${data.traderName.toUpperCase()}</h1>
          <h2>${data.traderAddress}</h2>
        </div>
        
        <div class="details-section">
          <div>
            <div class="detail-item">
              <strong>Trader Code:</strong>
              <span class="underline">${data.traderCode}</span>
            </div>
            <div class="detail-item">
              <strong>Mobile Number:</strong>
              <span class="underline">${data.traderName}</span>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <strong>Date:</strong>
              <span class="underline">${data.date}</span>
            </div>
            <div class="detail-item">
              <strong>Place:</strong>
              <span class="underline">${data.place}</span>
            </div>
          </div>
        </div>
        
        <table class="lots-table">
          <thead>
            <tr>
              <th>Lot No.</th>
              <th>Farmer Name</th>
              <th>Place</th>
              <th>No. of Bags</th>
            </tr>
          </thead>
          <tbody>
            ${data.lots.map(lot => `
              <tr>
                <td>${lot.lotNumber}</td>
                <td>${lot.farmerName}</td>
                <td>${lot.place}</td>
                <td>${lot.numberOfBags}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Total No. of Bags:</td>
              <td>${data.lots.reduce((sum, lot) => sum + lot.numberOfBags, 0)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Trader Signature</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>APMC Official</p>
          </div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;
}

// Generate mobile-friendly HTML for bag entry report
function generateBagEntryMobileHTML(data: BagEntryData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bag Entry Report - ${data.lot.lotNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #000;
          background: white;
          padding: 20px;
        }
        
        .report-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        
        .lot-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        
        .info-item {
          margin-bottom: 10px;
        }
        
        .bags-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .bags-table th,
        .bags-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        
        .bags-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .summary-section {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        
        .mobile-controls {
          margin-bottom: 20px;
          text-align: center;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .mobile-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          margin: 0 5px;
          min-width: 120px;
        }
        
        .mobile-btn:hover {
          background: #0056b3;
        }
        
        .mobile-btn.secondary {
          background: #6c757d;
        }
        
        .mobile-btn.secondary:hover {
          background: #545b62;
        }
        
        @media print {
          body { margin: 0; padding: 10px; }
          .mobile-controls { display: none; }
        }
        
        @media (max-width: 768px) {
          .lot-info {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .bags-table {
            font-size: 12px;
          }
          
          .bags-table th,
          .bags-table td {
            padding: 6px;
          }
          
          body {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="mobile-controls">
        <button class="mobile-btn" onclick="window.print()">Print</button>
        <button class="mobile-btn secondary" onclick="window.print()">Save as PDF</button>
      </div>
      
      <div class="report-container">
        <div class="header">
          <h1>BAG ENTRY REPORT</h1>
          <h2>Lot: ${data.lot.lotNumber}</h2>
        </div>
        
        <div class="lot-info">
          <div>
            <div class="info-item">
              <strong>Farmer:</strong> ${data.lot.farmer.name}
            </div>
            <div class="info-item">
              <strong>Mobile:</strong> ${data.lot.farmer.mobile}
            </div>
            <div class="info-item">
              <strong>Place:</strong> ${data.lot.farmer.place}
            </div>
          </div>
          <div>
            <div class="info-item">
              <strong>Variety:</strong> ${data.lot.varietyGrade}
            </div>
            <div class="info-item">
              <strong>Total Bags:</strong> ${data.lot.numberOfBags}
            </div>
            <div class="info-item">
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <table class="bags-table">
          <thead>
            <tr>
              <th>Bag No.</th>
              <th>Weight (kg)</th>
              <th>Grade</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.bags.map(bag => `
              <tr>
                <td>${bag.bagNumber}</td>
                <td>${bag.weight ? bag.weight.toFixed(1) : '-'}</td>
                <td>${bag.grade || '-'}</td>
                <td>${bag.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary-section">
          <h3>Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${data.summary.totalBags}</div>
              <div>Total Bags</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${data.summary.totalWeight.toFixed(1)} kg</div>
              <div>Total Weight</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${data.summary.averageWeight.toFixed(1)} kg</div>
              <div>Average Weight</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${Math.round((data.bags.filter(b => b.weight).length / data.summary.totalBags) * 100)}%</div>
              <div>Completion</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate popup HTML for desktop bag entry report
function generateBagEntryPopupHTML(data: BagEntryData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bag Entry Report - ${data.lot.lotNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        
        .report-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        
        .lot-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        
        .info-item {
          margin-bottom: 10px;
        }
        
        .bags-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .bags-table th,
        .bags-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        
        .bags-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .summary-section {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        
        @media print {
          body { margin: 0; padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <h1>BAG ENTRY REPORT</h1>
          <h2>Lot: ${data.lot.lotNumber}</h2>
        </div>
        
        <div class="lot-info">
          <div>
            <div class="info-item">
              <strong>Farmer:</strong> ${data.lot.farmer.name}
            </div>
            <div class="info-item">
              <strong>Mobile:</strong> ${data.lot.farmer.mobile}
            </div>
            <div class="info-item">
              <strong>Place:</strong> ${data.lot.farmer.place}
            </div>
          </div>
          <div>
            <div class="info-item">
              <strong>Variety:</strong> ${data.lot.varietyGrade}
            </div>
            <div class="info-item">
              <strong>Total Bags:</strong> ${data.lot.numberOfBags}
            </div>
            <div class="info-item">
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <table class="bags-table">
          <thead>
            <tr>
              <th>Bag No.</th>
              <th>Weight (kg)</th>
              <th>Grade</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.bags.map(bag => `
              <tr>
                <td>${bag.bagNumber}</td>
                <td>${bag.weight ? bag.weight.toFixed(1) : '-'}</td>
                <td>${bag.grade || '-'}</td>
                <td>${bag.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary-section">
          <h3>Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${data.summary.totalBags}</div>
              <div>Total Bags</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${data.summary.totalWeight.toFixed(1)} kg</div>
              <div>Total Weight</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${data.summary.averageWeight.toFixed(1)} kg</div>
              <div>Average Weight</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${Math.round((data.bags.filter(b => b.weight).length / data.summary.totalBags) * 100)}%</div>
              <div>Completion</div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;
}

// Utility function to format date for APMC format
export function formatDateForAPMC(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '/');
}

// Generate CSV export for farmers
export function exportFarmersToCSV(farmers: any[]): void {
  const headers = ['Name', 'Mobile', 'Place', 'Name as in Bank', 'Bank Name', 'Account Number', 'IFSC Code'];
  const csvContent = [
    headers.join(','),
    ...farmers.map(farmer => [
      farmer.name,
      farmer.mobile,
      farmer.place,
      farmer.nameAsInBank || '',
      farmer.bankName || '',
      farmer.bankAccountNumber || '',
      farmer.ifscCode || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `farmers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Generate Excel-like CSV export for lots
export function exportLotsToCSV(lots: any[]): void {
  const headers = [
    'Lot Number', 'Farmer Name', 'Mobile', 'Place', 'Number of Bags', 
    'Vehicle Rent', 'Advance', 'Variety/Grade', 'Unload Hamali', 'Status', 'Created Date'
  ];
  
  const csvContent = [
    headers.join(','),
    ...lots.map(lot => [
      lot.lotNumber,
      lot.farmer.name,
      lot.farmer.mobile,
      lot.farmer.place,
      lot.numberOfBags,
      lot.vehicleRent,
      lot.advance,
      lot.varietyGrade,
      lot.unloadHamali,
      lot.status,
      new Date(lot.createdAt).toLocaleDateString()
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lots_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}