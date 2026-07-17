/* =========================================================
   Akij Holidays — Global Configuration
   ---------------------------------------------------------
   Set your Google Apps Script URL and GitHub credentials
   below. All modules read from window.APP_CONFIG.
   ========================================================= */
window.APP_CONFIG = {
  BRAND_NAME: "Akij Holidays",
  BRAND_TAGLINE: "Travel Management System",
  BRAND_PRIMARY: "#8e011a",
  BRAND_ACCENT: "#004aad",

  /* Google Apps Script Web-App URL.
     Deploy google-apps-script.gs and paste its /exec URL here
     to enable automatic Google-Sheet logging of every saved doc. */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwuZhFWYLBVlQyM2NO2SqVrVzzXUOQ32BXa7ZkCD7PzjK4NNKuXDNqk8gU_8mXDWHfV/exec",

  /* The user's target Google Sheet (opened from Settings) */
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1EqWBeRUl7sYhU2Y16mv3DK57XWHTWSJbyv057J2epb8/edit?usp=sharing",
  SHEET_ID: "1EqWBeRUl7sYhU2Y16mv3DK57XWHTWSJbyv057J2epb8",

  /* Company defaults (prefilled into every new document) */
  COMPANY: {
    name: "AKIJ AIR SERVICES LTD",
    legalName: "AKIJ LOGISTICS LTD",
    address1: "Cosy Nook, House 10, Road 4",
    address2: "Gulshan 1, Dhaka, Bangladesh",
    phone: "+880 9613 500850",
    email: "holidays@akijair.com",
    website: "www.akijair.com",
    tradeLicense: "",
    tin: ""
  },

  BANK: {
    name: "BRAC Bank PLC",
    account: "AKIJ LOGISTICS LTD",
    number: "2063890780001",
    branch: "Gulshan",
    routing: "060261726"},

  /* GitHub cloud storage (optional; user configures at runtime via UI).
     If left blank, storage falls back to localStorage-only. */
  GITHUB: {
    owner: "",
    repo:  "",
    branch: "main",
    token: "",
    basePath: "Documents"
  },

  /* Document types & folder mapping — v4 slim set */
  DOC_TYPES: {
    invoice:       { folder: "Invoices",                label: "Invoice",                icon: "🧾", prefix: "INV" },
    voucher:       { folder: "Vouchers",                label: "Booking Voucher",        icon: "🎫", prefix: "BK"  },
    ticket:        { folder: "Airline Tickets",         label: "Airline Ticket",         icon: "✈️", prefix: "TKT" },
    ticketInvoice: { folder: "Airline Ticket Invoices", label: "Airline Ticket Invoice", icon: "🛫", prefix: "ATI" }
  },

  /* Supported currencies */
  CURRENCIES: [
    { code: "BDT", symbol: "৳",   name: "Bangladeshi Taka" },
    { code: "USD", symbol: "$",   name: "US Dollar" },
    { code: "EUR", symbol: "€",   name: "Euro" },
    { code: "GBP", symbol: "£",   name: "Pound Sterling" },
    { code: "INR", symbol: "₹",   name: "Indian Rupee" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "﷼",   name: "Saudi Riyal" },
    { code: "SGD", symbol: "S$",  name: "Singapore Dollar" },
    { code: "THB", symbol: "฿",   name: "Thai Baht" },
    { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit" }
  ]
};
