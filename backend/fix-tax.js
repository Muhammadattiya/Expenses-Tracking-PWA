const fs = require('fs');
let content = fs.readFileSync('services/quickAdd/intentTaxonomy.js', 'utf8');
content = content.replace("'coffee', 'cafe']", "'coffee', 'cafe', 'ahwa']");
content = content.replace("'mowaslat',", "'mowaslat', 'mwaslat',");
content = content.replace("'coffee', 'cafe', 'ahwa']", "'coffee', 'cafe', 'ahwa', 'قهوة']");
fs.writeFileSync('services/quickAdd/intentTaxonomy.js', content);
