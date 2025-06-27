# Enhanced Tax Calculation System Preview

## New Tax Calculation Structure

### 1. Base Amount Calculation
- Lot Price × Weight (in quintals) = Basic Amount

### 2. Additional Charges
- **Packaging**: Rate per bag × Number of bags × Packaging weight factor
- **Hamali**: Rate from settings × Number of bags
- **Weighing Fee**: Rate per bag × Number of bags
- **Commission**: Percentage of basic amount + cess on commission

### 3. Taxable Amount Calculation
```
Taxable Amount = Basic Amount + Packaging + Hamali + Weighing Fee + Commission
```

### 4. GST Calculation (State-wise)
**For Intra-State (Same State):**
- SGST: 2.5% of Taxable Amount
- CGST: 2.5% of Taxable Amount
- Total GST: SGST + CGST = 5%

**For Inter-State (Different States):**
- IGST: 5% of Taxable Amount
- (SGST + CGST = IGST when different states)

### 5. Final Invoice Structure
```
Basic Amount:           ₹ X,XXX
+ Packaging:            ₹ XXX
+ Hamali:               ₹ XXX  
+ Weighing Fee:         ₹ XXX
+ Commission:           ₹ XXX
+ Cess on Commission:   ₹ XX
= Taxable Amount:       ₹ X,XXX
+ SGST (2.5%):         ₹ XXX
+ CGST (2.5%):         ₹ XXX
OR
+ IGST (5%):           ₹ XXX
= Total Payable:       ₹ X,XXX
```

### 6. Bank Details Enhancement
- Bank Name
- Account Number  
- IFSC Code
- Account Holder Name
- **Branch Name** (NEW)
- Branch Address (Optional)

### 7. Settings Page Updates
- Packaging weight factor (kg per bag)
- Hamali rate per bag
- Commission percentage
- Cess on commission percentage
- Default state for GST calculation

## Implementation Areas
1. Settings page - Add new fields
2. Tax calculation backend - Enhanced formulas
3. Invoice generation - New format
4. Bank details - Branch information
5. State-wise GST logic

Would you like me to proceed with implementing this enhanced system?