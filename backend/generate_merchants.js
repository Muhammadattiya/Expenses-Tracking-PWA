const fs = require('fs');

const merchants = {
  // --- COFFEE & CAFE ---
  "STARBUCKS": "coffee",
  "CILANTRO": "coffee",
  "COSTA": "coffee",
  "ESPRESSO LAB": "coffee",
  "BEANO'S": "coffee",
  "ROASTERY": "coffee",
  "BROWN NOSE": "coffee",
  "DUNKIN": "coffee",
  "QAHWA": "coffee",
  "CARIBOU": "coffee",

  // --- BAKERY & DESSERTS ---
  "TBS": "desserts",
  "NOLA": "desserts",
  "TORTINA": "desserts",
  "SALE SUCRE": "desserts",
  "LA POIRE": "desserts",
  "TSÉPPAS": "desserts",
  "SALÉ SUCRÉ": "desserts",
  "EXCEPTION": "desserts",
  "PAUL": "desserts",
  "MANDARINE KOUEIDER": "desserts",
  "EL ABD": "desserts",
  "BASSALOU": "desserts",

  // --- FAST FOOD ---
  "MCDONALDS": "fast_food",
  "MC DONALDS": "fast_food",
  "MACDONALDS": "fast_food",
  "KFC": "fast_food",
  "BURGER KING": "fast_food",
  "HARDEES": "fast_food",
  "BAZOOQA": "fast_food",
  "HEART ATTACK": "fast_food",
  "BUFFALO BURGER": "fast_food",
  "SPECTRA": "restaurant",
  "COOK DOOR": "fast_food",
  "PIZZA HUT": "fast_food",
  "DOMINOS": "fast_food",
  "PAPA JOHNS": "fast_food",
  "PRIMOS": "fast_food",
  "ABO TAREK": "fast_food",
  "TOM AND BASAL": "fast_food",
  "SHAWERMA EL REEM": "fast_food",

  // --- GROCERIES ---
  "CARREFOUR": "groceries",
  "SEOUDI": "groceries",
  "SPINNEYS": "groceries",
  "METRO MARKET": "groceries",
  "GOURMET": "groceries",
  "LULU HYPERMARKET": "groceries",
  "AWLAD RAGAB": "groceries",
  "KHEIR ZAMAN": "groceries",
  "BIM": "groceries",
  "KAZYON": "groceries",
  "OSCAR": "groceries",
  "PANDA": "groceries",
  "HYPER ONE": "groceries",
  "ALF MASKAN": "groceries",
  "RAGAB SONS": "groceries",
  "FRESH FOOD MARKET": "groceries",
  "TALABAT MART": "groceries",
  "BREADFAST": "groceries",
  "RABBIT": "groceries",
  "INSTASHOP": "groceries",
  "APPLES": "groceries",

  // --- RESTAURANTS / DINING ---
  "MORI SUSHI": "restaurant",
  "CRAVE": "restaurant",
  "CASPER & GAMBINI'S": "restaurant",
  "OAK GRILL": "restaurant",
  "QADURA": "restaurant",
  "ANDREA": "restaurant",
  "GABY'S": "restaurant",

  // --- TRANSPORTATION & RIDES ---
  "UBER": "taxi",
  "CAREEM": "taxi",
  "INDRIVE": "taxi",
  "DIDI": "taxi",
  "SWVL": "transportation",
  "CAIRO METRO": "transportation",
  "EGYPTAIR": "travel",
  "GO BUS": "travel",
  "BLUE BUS": "travel",

  // --- SUBSCRIPTIONS / STREAMING ---
  "NETFLIX": "subscriptions",
  "SPOTIFY": "subscriptions",
  "SHAHID": "subscriptions",
  "WATCH IT": "subscriptions",
  "ANGHAMI": "subscriptions",
  "AMAZON PRIME": "subscriptions",
  "YOUTUBE PREMIUM": "subscriptions",
  "APPLE MUSIC": "subscriptions",
  "DISNEY PLUS": "subscriptions",
  "OSN": "subscriptions",
  "BEIN SPORTS": "subscriptions",

  // --- PHARMACY & HEALTHCARE ---
  "SEIF PHARMACY": "pharmacy",
  "ELEZABY PHARMACY": "pharmacy",
  "EL EZABY": "pharmacy",
  "ROSHTA": "pharmacy",
  "ROSHETTA": "pharmacy",
  "EL-TARSHOUBY": "pharmacy",
  "MISR PHARMACIES": "pharmacy",
  "SHOUKRY": "pharmacy",
  "VEZEETA": "healthcare",
  "YASHFEE": "pharmacy",
  "ALFA LABORATORIES": "healthcare",
  "AL MOKHTABAR": "healthcare",
  "BORG LAB": "healthcare",

  // --- TELECOM & INTERNET ---
  "VODAFONE": "phone",
  "ORANGE": "phone",
  "ETISALAT": "phone",
  "WE": "phone",
  "TELECOM EGYPT": "phone",
  "TEDATA": "internet",

  // --- SHOPPING & E-COMMERCE ---
  "AMAZON": "shopping",
  "NOON": "shopping",
  "JUMIA": "shopping",
  "SHEIN": "clothing",
  "ZARA": "clothing",
  "H&M": "clothing",
  "LC WAIKIKI": "clothing",
  "DEFACTO": "clothing",
  "TOWN TEAM": "clothing",
  "IKEA": "home",
  "B.TECH": "electronics",
  "RAYA": "electronics",
  "2B": "electronics",
  "TRADELINE": "electronics",
  "VIRGIN MEGASTORE": "electronics",
  "SHARAF DG": "electronics",

  // --- UTILITIES & BILLS ---
  "SOUTH CAIRO ELEC": "utilities",
  "NORTH CAIRO ELEC": "utilities",
  "ALEX WATER": "utilities",
  "PETROTRADE": "utilities",
  "NATGAS": "utilities",
  "TOWNGAS": "utilities",
  "EEHC": "utilities",

  // --- BANKING & FINANCIAL (Wait, should be intent bank_fees if it's a fee, or what?)
  // Generally specific to fees or transfers. For global static dictionary, 
  // if it's purely a bank name, it might be a transfer or withdrawal. The prompt says:
  // "CIB -> bank_fees". Wait, really? Ah, the prompt says "CIB -> bank_fees".
  "CIB": "bank_fees",
  "NBE": "bank_fees",
  "BANQUE MISR": "bank_fees",
  "QNB": "bank_fees",
  "HSBC": "bank_fees",
  "ALEXBANK": "bank_fees",
  "FAWRY": "bills",
  "AMAN": "bills",
  "MASARY": "bills",
  "BEE": "bills",
  "OPAY": "bills",

  // --- ENTERTAINMENT ---
  "VOX CINEMAS": "cinema",
  "RENAISSANCE CINEMA": "cinema",
  "IMAX": "cinema",
  "GALAXY CINEMA": "cinema",
  "MAGIC PLANET": "entertainment",
  "KIDZANIA": "entertainment",
  "TICKETMARCHE": "entertainment",

  // --- GATEWAYS (Unsafe/Generic, leave null or mapping? The prompt says "Unsafe descriptors like just PAYMOB will not map to anything. BUT we can map them if we know")
  // Actually, wait, the prompt says:
  // "Gateway normalizations (like PAYMOB, FAWRY) and descriptors (MARKET, SUPERMARKET) will be added where safe. Unsafe descriptors like just "PAYMOB" will not map to anything."
  // So FAWRY -> bills is fine. PAYMOB shouldn't be here since it's a gateway that could mean anything.
  "PAYMOB": null,
  "PAYTABS": null,
  "KASHEER": null,

  // --- GENERIC DESCRIPTORS ---
  "MARKET": "groceries",
  "SUPERMARKET": "groceries",
  "PHARMACY": "pharmacy",
  "CAFE": "coffee",
  "CLINIC": "healthcare"
};

// Filter out nulls
const finalMerchants = {};
for (const [k, v] of Object.entries(merchants)) {
  if (v !== null) finalMerchants[k] = v;
}

fs.writeFileSync('data/globalMerchants.json', JSON.stringify(finalMerchants, null, 2));
console.log('globalMerchants.json generated with ' + Object.keys(finalMerchants).length + ' merchants.');
