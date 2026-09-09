const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '..', 'controllers');

const files = fs.readdirSync(controllersDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Make sure we have next in the params
    // Replace async (req, res) with async (req, res, next)
    content = content.replace(/async\s*\(\s*req\s*,\s*res\s*\)/g, 'async (req, res, next)');
    
    // Replace res.status(500).json(...) with next(error)
    // Only in catch blocks, but since we are doing 500s it's safe
    // Note: some have multiline JSON. It's safer to use a regex or just AST
    // Let's do a simple regex: /res\.status\(500\)\.json\(\s*\{[\s\S]*?\}\s*\);?/g
    
    // Wait, let's look at the grep output:
    // Some are `res.status(500).json({ message: error.message });`
    // Some are `res.status(500).json({ \n message: error.message \n });`
    // Some are `res.status(500).json({ message: 'Server error' });`

    content = content.replace(/res\.status\(500\)\.json\([^;]+;/g, 'next(error);');
    
    // Wait, what if the catch parameter is `err` instead of `error`?
    // Let's check if the file has `catch (err)` or `catch (error)`.
    if (content.includes('next(error);')) {
      // Find `catch (err)` and replace it with `catch (error)` in the file just in case, but let's be careful.
      // Usually it's `catch (error)`. If it's `catch (err)`, `next(error)` will crash.
      // Let's dynamically replace the parameter name.
      content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{\s*res\.status\(500\)\.json\([^;]+;/g, 'catch ($1) {\n    next($1);');
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});
