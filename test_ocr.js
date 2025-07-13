const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testOCR() {
  try {
    const formData = new FormData();
    const filePath = './attached_assets/Tax Invoice - INV-20250712-006_1752398830783.pdf';
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return;
    }
    
    formData.append('image', fs.createReadStream(filePath));
    
    console.log('Testing OCR with PDF invoice...');
    
    const response = await fetch('http://localhost:5000/api/ocr/process-invoice', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('Error:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n=== OCR RESULTS ===');
    console.log('Confidence:', Math.round(result.confidence), '%');
    console.log('\nExtracted Data:');
    console.log('- Invoice Number:', result.extractedData.invoiceNumber);
    console.log('- Invoice Date:', result.extractedData.invoiceDate);
    console.log('- Trader Name:', result.extractedData.traderName);
    console.log('- Total Amount:', result.extractedData.totalAmount);
    console.log('- Tax Amount:', result.extractedData.taxAmount);
    console.log('- Net Amount:', result.extractedData.netAmount);
    
    console.log('\nItems Found:', result.extractedData.items.length);
    result.extractedData.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        name: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.ratePerUnit,
        amount: item.amount
      });
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testOCR();