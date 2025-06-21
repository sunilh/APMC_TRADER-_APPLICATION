interface APMCPrintData {
  place: string;
  traderName: string;
  traderCode: string;
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

// Generate APMC format PDF
export async function generateAPMCPDF(data: APMCPrintData): Promise<void> {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>APMC Receipt - ${data.date}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        
        .apmc-container {
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
          grid-template-columns: 1fr 1fr 1fr;
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
          .apmc-container { border: 2px solid #000; }
        }
      </style>
    </head>
    <body>
      <div class="apmc-container">
        <div class="header">
          <h1>AGRICULTURAL PRODUCE MARKET COMMITTEE</h1>
          <h2>${data.place.toUpperCase()} APMC</h2>
        </div>
        
        <div class="details-section">
          <div>
            <div class="detail-item">
              <strong>Place:</strong>
              <span class="underline">${data.place}</span>
            </div>
            <div class="detail-item">
              <strong>Trader Name:</strong>
              <span class="underline">${data.traderName}</span>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <strong>Date:</strong>
              <span class="underline">${data.date}</span>
            </div>
            <div class="detail-item">
              <strong>Trader Code:</strong>
              <span class="underline">${data.traderCode}</span>
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
            <p>Farmer Signature</p>
          </div>
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

  printWindow.document.write(html);
  printWindow.document.close();
}

// Generate bag entry report PDF
export async function generateBagEntryPDF(data: BagEntryData): Promise<void> {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  const html = `
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
        
        .info-item strong {
          display: inline-block;
          width: 100px;
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
        
        .bags-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .summary-section {
          background: #e8f4f8;
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
              <th>Bag #</th>
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

  printWindow.document.write(html);
  printWindow.document.close();
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
