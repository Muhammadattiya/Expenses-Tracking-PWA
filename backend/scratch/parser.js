const evaluateExpression = (expr) => {
  const tokens = expr.match(/(\d+\.?\d*)|([\+\-\*\/])/g);
  if (!tokens) return NaN;
  
  if (tokens[0] === '-') {
    tokens.unshift('0');
  }

  // First pass: multiply and divide
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '*' || tokens[i] === '/') {
      const a = parseFloat(tokens[i - 1]);
      const b = parseFloat(tokens[i + 1]);
      if (isNaN(a) || isNaN(b)) return NaN;
      const result = tokens[i] === '*' ? a * b : a / b;
      tokens.splice(i - 1, 3, result.toString());
      i -= 1;
    } else {
      i++;
    }
  }

  // Second pass: add and subtract
  i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '+' || tokens[i] === '-') {
      const a = parseFloat(tokens[i - 1]);
      const b = parseFloat(tokens[i + 1]);
      if (isNaN(a) || isNaN(b)) return NaN;
      const result = tokens[i] === '+' ? a + b : a - b;
      tokens.splice(i - 1, 3, result.toString());
      i -= 1;
    } else {
      i++;
    }
  }

  return parseFloat(tokens[0]);
};

console.log(evaluateExpression("5+3*2")); // 11
console.log(evaluateExpression("-5+3*2")); // 1
console.log(evaluateExpression("10/2-3")); // 2
console.log(evaluateExpression("2.5*2+1")); // 6
