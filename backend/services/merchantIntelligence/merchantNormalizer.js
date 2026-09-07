function normalizeMerchantToken(rawString) {
  if (!rawString || typeof rawString !== 'string') return '';
  
  let token = rawString.trim().toUpperCase();

  // 1. Remove known gateway prefixes
  // We only strip if the gateway is followed by a non-alphanumeric separator or space.
  const gateways = [
    'PAYMOB', 'FAWRYPF', 'FAWRY', 'AMAN', 'MEEZA', 'OPAY', 'KASHEER', 'VODAFONE CASH'
  ];
  
  for (const gw of gateways) {
    // Escaped gateway string just in case, though they are all alphanumeric/spaces here
    const gwRegex = new RegExp(`^${gw}[\\*\\-\\s]+`);
    if (gwRegex.test(token)) {
      token = token.replace(gwRegex, '');
      break; 
    }
  }

  // 2. Remove common location/branch suffixes
  const suffixes = ['CAIRO', 'ALX', 'ALEXANDRIA', 'EG', 'EGYPT', 'ZAYED', '#\\d+', '\\d+'];
  for (const sfx of suffixes) {
    const sfxRegex = new RegExp(`[\\*\\-\\s]+${sfx}$`);
    if (sfxRegex.test(token)) {
      token = token.replace(sfxRegex, '');
      // Do not break here, we might have multiple suffixes like "CAIRO EG"
    }
  }

  // 3. Normalize repeated whitespace
  token = token.replace(/\\s+/g, ' ').trim();

  return token;
}

module.exports = { normalizeMerchantToken };
