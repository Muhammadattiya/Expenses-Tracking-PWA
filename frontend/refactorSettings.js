const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Settings.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add <AnimatePresence mode="wait">
content = content.replace(
  /<\/h2>\n\n\s*\{activeView === 'main' && \(/,
  '</h2>\n\n      <AnimatePresence mode="wait">\n      {activeView === \'main\' && (\n        <motion.div\n          key="main"\n          initial={{ opacity: 0, x: -20 }}\n          animate={{ opacity: 1, x: 0 }}\n          exit={{ opacity: 0, x: -20 }}\n          transition={{ type: "spring", bounce: 0, duration: 0.4 }}\n        >'
);

// We need to wrap EACH view with <motion.div> and close it.
const views = [
  'main',
  'appSettings',
  'incomeProfiles',
  'notifications',
  'sms',
  'accounts',
  'categories',
  'recurring',
  'data'
];

for (const view of views) {
  if (view === 'main') continue; // handled opening above

  const regex = new RegExp(`\\{activeView === '${view}' && \\(`);
  content = content.replace(regex, `{activeView === '${view}' && (\n        <motion.div\n          key="${view}"\n          initial={{ opacity: 0, x: 20 }}\n          animate={{ opacity: 1, x: 0 }}\n          exit={{ opacity: 0, x: 20 }}\n          transition={{ type: "spring", bounce: 0, duration: 0.4 }}\n        >`);
}

// Now we need to close the <motion.div> for each view.
// A view block looks like:
// {activeView === 'X' && (
//   <motion.div ...>
//     <section ...>
//       ...
//     </section>
//   </motion.div>
// )}

// Since replacing the closing parentheses is hard with regex, let's just do it string manipulation.
// Actually, it's easier to manually do it with multi_replace_file_content or a precise script.

fs.writeFileSync(filePath, content);
console.log('Refactored');
