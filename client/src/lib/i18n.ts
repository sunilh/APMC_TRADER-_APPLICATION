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
    namePlaceholder: 'Enter farmer name',
    mobileNote: 'Maximum 10 digits',
    placePlaceholder: 'Enter place',
    nameAsInBankPlaceholder: 'Name exactly as in bank records',
    bankNamePlaceholder: 'Enter bank name',
    bankAccountPlaceholder: 'Enter account number',
    ifscCodePlaceholder: 'Enter IFSC code',
    create: 'Create Farmer',
    update: 'Update Farmer',
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
    namePlaceholder: 'किसान का नाम दर्ज करें',
    mobileNote: 'अधिकतम 10 अंक',
    placePlaceholder: 'स्थान दर्ज करें',
    nameAsInBankPlaceholder: 'बैंक रिकॉर्ड के अनुसार नाम',
    bankNamePlaceholder: 'बैंक का नाम दर्ज करें',
    bankAccountPlaceholder: 'खाता संख्या दर्ज करें',
    ifscCodePlaceholder: 'IFSC कोड दर्ज करें',
    create: 'किसान बनाएं',
    update: 'किसान अपडेट करें',
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
    namePlaceholder: 'ರೈತನ ಹೆಸರು ನಮೂದಿಸಿ',
    mobileNote: 'ಗರಿಷ್ಠ 10 ಅಂಕೆಗಳು',
    placePlaceholder: 'ಸ್ಥಳ ನಮೂದಿಸಿ',
    nameAsInBankPlaceholder: 'ಬ್ಯಾಂಕ್ ದಾಖಲೆಗಳ ಪ್ರಕಾರ ಹೆಸರು',
    bankNamePlaceholder: 'ಬ್ಯಾಂಕ್ ಹೆಸರು ನಮೂದಿಸಿ',
    bankAccountPlaceholder: 'ಖಾತೆ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ',
    ifscCodePlaceholder: 'IFSC ಕೋಡ್ ನಮೂದಿಸಿ',
    create: 'ರೈತ ರಚಿಸಿ',
    update: 'ರೈತ ನವೀಕರಿಸಿ',
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
export function formatCurrency(amount: number, language: string): string {
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
