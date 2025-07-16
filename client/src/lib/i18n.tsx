import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translation interface
interface Translations {
  [key: string]: string | Translations;
}

// English translations
const en: Translations = {
  nav: {
    dashboard: 'Dashboard',
    farmers: 'Farmers',
    lots: 'Lots',
    settings: 'Settings',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign In',
    createAccount: 'Create Account',
  },
  farmer: {
    name: 'Farmer Name',
    mobile: 'Mobile Number',
    place: 'Place',
    nameAsInBank: 'Name as in Bank',
    bankName: 'Bank Name',
    bankAccount: 'Bank Account Number',
    ifscCode: 'IFSC Code',
    accountHolderName: 'Account Holder Name',
    namePlaceholder: 'Enter full name of the farmer',
    mobilePlaceholder: 'Enter 10-digit mobile number',
    mobileNote: 'Maximum 10 digits',
    placePlaceholder: 'Enter village or town name',
    nameAsInBankPlaceholder: 'Name exactly as printed on bank records',
    bankNamePlaceholder: 'Enter full bank name (e.g., State Bank of India)',
    bankAccountPlaceholder: 'Enter complete bank account number',
    ifscCodePlaceholder: 'Enter 11-character IFSC code (e.g., SBIN0001234)',
    accountHolderNamePlaceholder: 'Name as per bank account records',
    create: 'Create Farmer',
    update: 'Update Farmer',
    saving: 'Saving...',
    created: 'Farmer created successfully',
    updated: 'Farmer updated successfully',
  },
  lot: {
    farmer: 'Farmer',
    numberOfBags: 'Number of Bags',
    vehicleRent: 'Vehicle Rent',
    advance: 'Advance Amount',
    varietyGrade: 'Variety/Grade',
    unloadHamali: 'Unload Hamali',
    searchFarmer: 'Search farmers...',
    selectFarmer: 'Select farmer',
    farmerRequired: 'Please select a farmer',
    numberOfBagsPlaceholder: 'Enter number of bags',
    selectVariety: 'Select variety',
    unloadHamaliNote: 'Will be calculated automatically from settings',
    summary: 'Lot Summary',
    bags: 'Bags',
    hamali: 'Hamali',
    create: 'Create Lot',
    created: 'Lot created successfully',
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    creating: 'Creating...',
    loading: 'Loading...',
    search: 'Search',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    print: 'Print',
  },
  messages: {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  },
  billing: {
    title: 'Tax Invoice',
    seller: 'Seller',
    buyer: 'Buyer',
    lotNumber: 'Lot No',
    farmerName: 'Farmer Name',
    variety: 'Variety',
    grade: 'Grade',
    bags: 'Bags',
    weight: 'Weight',
    rate: 'Rate/Quintal',
    hsnCode: 'HSN Code',
    basicAmount: 'Basic Amount',
    packing: 'Packing',
    weighingCharges: 'Weighing Charges',
    commission: 'Commission',
    sgst: 'SGST @ 2.5%',
    cgst: 'CGST @ 2.5%',
    cess: 'CESS @ 0.6%',
    totalAmount: 'Total Amount',
    totalPayable: 'Total Payable',
    grandTotal: 'Grand Total',
    inWords: 'In Words',
    bankDetails: 'Bank Details',
    signature: 'Signature',
    print: 'Print',
    download: 'Download',
    generateBills: 'Generate Bills',
    buyerBilling: 'Buyer Billing',
    dailyBills: 'Daily Bills',
  },
};

// Hindi translations
const hi: Translations = {
  nav: {
    dashboard: 'डैशबोर्ड',
    farmers: 'किसान',
    lots: 'लॉट',
    settings: 'सेटिंग्स',
  },
  auth: {
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    register: 'पंजीकरण',
    username: 'उपयोगकर्ता नाम',
    password: 'पासवर्ड',
    signIn: 'साइन इन',
    createAccount: 'खाता बनाएं',
  },
  farmer: {
    name: 'किसान का नाम',
    mobile: 'मोबाइल नंबर',
    place: 'स्थान',
    nameAsInBank: 'बैंक में नाम',
    bankName: 'बैंक का नाम',
    bankAccount: 'बैंक खाता संख्या',
    ifscCode: 'IFSC कोड',
    accountHolderName: 'खाता धारक का नाम',
    namePlaceholder: 'किसान का पूरा नाम दर्ज करें',
    mobilePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    mobileNote: 'अधिकतम 10 अंक',
    placePlaceholder: 'गांव या शहर का नाम दर्ज करें',
    nameAsInBankPlaceholder: 'बैंक रिकॉर्ड में छपे अनुसार बिल्कुल वैसा ही नाम',
    bankNamePlaceholder: 'पूरा बैंक नाम दर्ज करें (जैसे: भारतीय स्टेट बैंक)',
    bankAccountPlaceholder: 'पूरा बैंक खाता नंबर दर्ज करें',
    ifscCodePlaceholder: '11 अक्षर का IFSC कोड दर्ज करें (जैसे: SBIN0001234)',
    accountHolderNamePlaceholder: 'बैंक खाता रिकॉर्ड के अनुसार नाम',
    create: 'किसान बनाएं',
    update: 'किसान अपडेट करें',
    saving: 'सेव हो रहा है...',
    created: 'किसान सफलतापूर्वक बनाया गया',
    updated: 'किसान सफलतापूर्वक अपडेट किया गया',
  },
  lot: {
    farmer: 'किसान',
    numberOfBags: 'बोरों की संख्या',
    vehicleRent: 'वाहन किराया',
    advance: 'अग्रिम राशि',
    varietyGrade: 'किस्म/ग्रेड',
    unloadHamali: 'अनलोड हमाली',
    searchFarmer: 'किसान खोजें...',
    selectFarmer: 'किसान चुनें',
    farmerRequired: 'कृपया किसान चुनें',
    numberOfBagsPlaceholder: 'बोरों की संख्या दर्ज करें',
    selectVariety: 'किस्म चुनें',
    unloadHamaliNote: 'सेटिंग्स से स्वचालित रूप से गणना की जाएगी',
    summary: 'लॉट सारांश',
    bags: 'बोरे',
    hamali: 'हमाली',
    create: 'लॉट बनाएं',
    created: 'लॉट सफलतापूर्वक बनाया गया',
  },
  common: {
    cancel: 'रद्द करें',
    save: 'सेव करें',
    saving: 'सेव हो रहा है...',
    creating: 'बनाया जा रहा है...',
    loading: 'लोड हो रहा है...',
    search: 'खोजें',
    actions: 'कार्य',
    edit: 'संपादित करें',
    delete: 'मिटाएं',
    print: 'प्रिंट',
  },
  messages: {
    success: 'सफलता',
    error: 'त्रुटि',
    warning: 'चेतावनी',
    info: 'जानकारी',
  },
};

// Kannada translations
const kn: Translations = {
  nav: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    farmers: 'ರೈತರು',
    lots: 'ಲಾಟ್‌ಗಳು',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  },
  auth: {
    login: 'ಲಾಗಿನ್',
    logout: 'ಲಾಗ್ಔಟ್',
    register: 'ನೋಂದಣಿ',
    username: 'ಬಳಕೆದಾರ ಹೆಸರು',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    signIn: 'ಸೈನ್ ಇನ್',
    createAccount: 'ಖಾತೆ ರಚಿಸಿ',
  },
  farmer: {
    name: 'ರೈತನ ಹೆಸರು',
    mobile: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    place: 'ಸ್ಥಳ',
    nameAsInBank: 'ಬ್ಯಾಂಕ್‌ನಲ್ಲಿರುವ ಹೆಸರು',
    bankName: 'ಬ್ಯಾಂಕ್ ಹೆಸರು',
    bankAccount: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ',
    ifscCode: 'IFSC ಕೋಡ್',
    accountHolderName: 'ಖಾತೆದಾರನ ಹೆಸರು',
    namePlaceholder: 'ರೈತನ ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ',
    mobilePlaceholder: '10 ಅಂಕೆಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',
    mobileNote: 'ಗರಿಷ್ಠ 10 ಅಂಕೆಗಳು',
    placePlaceholder: 'ಗ್ರಾಮ ಅಥವಾ ಪಟ್ಟಣದ ಹೆಸರು ನಮೂದಿಸಿ',
    nameAsInBankPlaceholder: 'ಬ್ಯಾಂಕ್ ದಾಖಲೆಗಳಲ್ಲಿ ಮುದ್ರಿಸಿದಂತೆ ನಿಖರವಾಗಿ ಹೆಸರು',
    bankNamePlaceholder: 'ಪೂರ್ಣ ಬ್ಯಾಂಕ್ ಹೆಸರು ನಮೂದಿಸಿ (ಉದಾ: ಸ್ಟೇಟ್ ಬ್ಯಾಂಕ್ ಆಫ್ ಇಂಡಿಯಾ)',
    bankAccountPlaceholder: 'ಪೂರ್ಣ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',
    ifscCodePlaceholder: '11 ಅಕ್ಷರಗಳ IFSC ಕೋಡ್ ನಮೂದಿಸಿ (ಉದಾ: SBIN0001234)',
    accountHolderNamePlaceholder: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ದಾಖಲೆಗಳ ಪ್ರಕಾರ ಹೆಸರು',
    create: 'ರೈತ ರಚಿಸಿ',
    update: 'ರೈತ ನವೀಕರಿಸಿ',
    saving: 'ಸೇವ್ ಆಗುತ್ತಿದೆ...',
    created: 'ರೈತ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ',
    updated: 'ರೈತ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ',
  },
  lot: {
    farmer: 'ರೈತ',
    numberOfBags: 'ಚೀಲಗಳ ಸಂಖ್ಯೆ',
    vehicleRent: 'ವಾಹನ ಬಾಡಿಗೆ',
    advance: 'ಮುಂಗಡ ಮೊತ್ತ',
    varietyGrade: 'ವಿಧ/ಗ್ರೇಡ್',
    unloadHamali: 'ಅನ್‌ಲೋಡ್ ಹಮಾಲಿ',
    searchFarmer: 'ರೈತರನ್ನು ಹುಡುಕಿ...',
    selectFarmer: 'ರೈತ ಆಯ್ಕೆಮಾಡಿ',
    farmerRequired: 'ದಯವಿಟ್ಟು ರೈತನನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    numberOfBagsPlaceholder: 'ಚೀಲಗಳ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',
    selectVariety: 'ವಿಧ ಆಯ್ಕೆಮಾಡಿ',
    unloadHamaliNote: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಲೆಕ್ಕಾಚಾರ ಮಾಡಲಾಗುತ್ತದೆ',
    summary: 'ಲಾಟ್ ಸಾರಾಂಶ',
    bags: 'ಚೀಲಗಳು',
    hamali: 'ಹಮಾಲಿ',
    create: 'ಲಾಟ್ ರಚಿಸಿ',
    created: 'ಲಾಟ್ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ',
  },
  common: {
    cancel: 'ರದ್ದುಮಾಡಿ',
    save: 'ಉಳಿಸಿ',
    saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...',
    creating: 'ರಚಿಸಲಾಗುತ್ತಿದೆ...',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    search: 'ಹುಡುಕಿ',
    actions: 'ಕ್ರಿಯೆಗಳು',
    edit: 'ಸಂಪಾದಿಸಿ',
    delete: 'ಅಳಿಸಿ',
    print: 'ಮುದ್ರಿಸಿ',
  },
  messages: {
    success: 'ಯಶಸ್ಸು',
    error: 'ದೋಷ',
    warning: 'ಎಚ್ಚರಿಕೆ',
    info: 'ಮಾಹಿತಿ',
  },
  billing: {
    title: 'ತೆರಿಗೆ ಬಿಲ್',
    seller: 'ಮಾರಾಟಗಾರ',
    buyer: 'ಖರೀದಾರ',
    lotNumber: 'ಲಾಟ್ ಸಂಖ್ಯೆ',
    farmerName: 'ರೈತ ಹೆಸರು',
    variety: 'ವಿಧ',
    grade: 'ಗ್ರೇಡ್',
    bags: 'ಚೀಲಗಳು',
    weight: 'ತೂಕ',
    rate: 'ದರ/ಕ್ವಿಂಟಲ್',
    hsnCode: 'HSN ಕೋಡ್',
    basicAmount: 'ಮೂಲ ಮೊತ್ತ',
    packing: 'ಪೇಕಿಂಗ್',
    weighingCharges: 'ತೂಕ ಶುಲ್ಕ',
    commission: 'ಕಮಿಷನ್',
    sgst: 'SGST @ 2.5%',
    cgst: 'CGST @ 2.5%',
    cess: 'CESS @ 0.6%',
    totalAmount: 'ಒಟ್ಟು ಮೊತ್ತ',
    totalPayable: 'ಒಟ್ಟು ಪಾವತಿ',
    grandTotal: 'ಮಹಾ ಮೊತ್ತ',
    inWords: 'ಶಬ್ದಗಳಲ್ಲಿ',
    bankDetails: 'ಬ್ಯಾಂಕ್ ವಿವರಗಳು',
    signature: 'ಸಹಿ',
    print: 'ಮುದ್ರಿಸಿ',
    download: 'ಡೌನ್‌ಲೋಡ್',
    generateBills: 'ಬಿಲ್‌ಗಳನ್ನು ತಯಾರಿಸಿ',
    buyerBilling: 'ಖರೀದಾರ ಬಿಲ್ಲಿಂಗ್',
    dailyBills: 'ದೈನಂದಿನ ಬಿಲ್‌ಗಳು',
  },
};

// Language mappings
const translations = { en, hi, kn };

// I18n context type
interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

// Create context
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper function to get nested translation
function getNestedTranslation(obj: Translations, path: string): string {
  return path.split('.').reduce((current: any, key: string) => {
    return current && current[key] ? current[key] : path;
  }, obj) as string;
}

// I18n Provider component
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('apmc-language');
    if (savedLanguage && translations[savedLanguage as keyof typeof translations]) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Save language to localStorage when changed
  const setLanguage = (lang: string) => {
    if (translations[lang as keyof typeof translations]) {
      setLanguageState(lang);
      localStorage.setItem('apmc-language', lang);
    }
  };

  // Translation function
  const t = (key: string): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en;
    return getNestedTranslation(currentTranslations, key);
  };

  return (
    <I18nContext.Provider value={{language, setLanguage, t}}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use I18n
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Export translations for direct access if needed
export { translations };

// Utility function for date formatting in different languages
export function formatDate(date: Date, language: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  switch (language) {
    case 'hi':
      return date.toLocaleDateString('hi-IN', options);
    case 'kn':
      return date.toLocaleDateString('kn-IN', options);
    default:
      return date.toLocaleDateString('en-IN', options);
  }
}

// Utility function for number formatting in different languages
export function formatNumber(number: number, language: string): string {
  switch (language) {
    case 'hi':
      return number.toLocaleString('hi-IN');
    case 'kn':
      return number.toLocaleString('kn-IN');
    default:
      return number.toLocaleString('en-IN');
  }
}

// Utility function for currency formatting
export function formatCurrency(amount: number | undefined | null, language: string): string {
  // Handle undefined/null values
  if (amount === undefined || amount === null) {
    return '₹0.00';
  }
  
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
  };

  switch (language) {
    case 'hi':
      return amount.toLocaleString('hi-IN', options);
    case 'kn':
      return amount.toLocaleString('kn-IN', options);
    default:
      return amount.toLocaleString('en-IN', options);
  }
}
