const { INTENTS } = require('./intentTaxonomy');

const EGYPTIAN_NUMBERS = {
   'صفر': 0, 'واحد': 1, 'اتنين': 2, 'تلاته': 3, 'تلاتة': 3, 'اربعة': 4, 'ارزعه': 4, 'أربعة': 4,
   'خمسة': 5, 'خمسه': 5, 'ستة': 6, 'سته': 6, 'سبعة': 7, 'سبعه': 7, 'تمانية': 8, 'ثمانية': 8,
   'تسعة': 9, 'تسعه': 9, 'عشرة': 10, 'عشره': 10, 'عشرين': 20, 'تلاتين': 30, 'ثلاثين': 30,
   'اربعين': 40, 'أربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'ثمانين': 80, 'تسعين': 90,
   'مية': 100, 'مائة': 100, 'مئه': 100, 'ميتين': 200, 'مائتين': 200,
   'الف': 1000, 'ألف': 1000, 'الفين': 2000, 'ألفين': 2000
};

const EXPENSE_VERBS = ['اشتريت', 'دفعت', 'جبت', 'حاسبت', 'صرفت', 'ركبت', 'bought', 'paid', 'spent', 'took'];
const INCOME_VERBS = ['قبضت', 'استلمت', 'جالي', 'اخدت', 'وصلني', 'received', 'earned'];

const ACCOUNT_SYNONYMS = {
   'cash': ['كاش', 'نقدي', 'نقدا', 'cash'],
   'wallet': ['محفظه', 'المحفظه', 'محفظة', 'المحفظة', 'wallet', 'm7fza'],
   'bank': ['بنك', 'البنك', 'حساب البنك', 'bank', 'bank account', 'visa', 'فيزا'],
   'vodafone': ['فودافون', 'فودافون كاش', 'vodafone cash', 'vodafone', 'vf cash'],
   'telda': ['تلده', 'تلدة', 'تيلدا', 'تلدا', 'تيلده', 'telda', 'tilda', 'تيلدي', 'تلدي', 'بطاقة تيلدا', 'كارت تيلدا', 'حساب تيلدا', 'تيلدا كاش'],
   'meeza': ['ميزه', 'ميزة', 'meeza', 'miza'],
   'instapay': ['انستاباي', 'انستا باي', 'انستا', 'instapay', 'insta pay', 'insta'],
   'fawry': ['فوري', 'fawry'],
   'etisalat': ['اتصالات', 'اتصالات كاش', 'etisalat cash', 'etisalat'],
   'orange': ['اورانج', 'اورنج', 'اورانج كاش', 'اورنج كاش', 'orange cash', 'orange'],
   'we': ['وي', 'وي كاش', 'we cash', 'we pay', 'wepay', 'we'],
   'qnb': ['كيو ان بي', 'كيوانبي', 'qnb', 'بنك qnb'],
   'bebasata': ['ببساطه', 'ببساطة', 'bebasata', 'be basata', 'bebsata']
};

function normalizeArabic(text) {
   if (!text) return '';
   return text
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
}

function transliterateFranco(text) {
   if (!text) return '';
   let lower = text.toLowerCase();
   if (!/[a-z2356789]/.test(lower)) return lower;

   const map = {
      '2': 'ا', '3': 'ع', '5': 'خ', '6': 'ط', '7': 'ح', '8': 'غ', '9': 'ص',
      'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف', 'g': 'ج',
      'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'o': 'و', 'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت', 'u': 'و',
      'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز'
   };

   let trans = lower
      .replace(/sh/g, 'ش').replace(/th/g, 'ث').replace(/kh/g, 'خ')
      .replace(/gh/g, 'غ').replace(/ch/g, 'تش').replace(/ph/g, 'ف')
      .replace(/ou/g, 'و').replace(/oo/g, 'و').replace(/ee/g, 'ي');

   trans = trans.split('').map(char => map[char] || char).join('');
   return trans.replace(/(.)\1+/g, '$1');
}

function convertArabicIndic(text) {
   const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
   return text.split('').map(c => {
      const index = arabicNumbers.indexOf(c);
      return index !== -1 ? index : c;
   }).join('');
}

function extractType(text) {
   const normText = normalizeArabic(text);
   const isIncome = INCOME_VERBS.some(v => normText.includes(normalizeArabic(v)));
   if (isIncome) return 'income';
   return 'expense';
}

function extractIntent(text) {
   const normText = normalizeArabic(text);
   const francoText = transliterateFranco(text);
   const scores = {};

   for (const intent of INTENTS) {
      let matches = 0;
      for (const kw of intent.keywords) {
         const normKw = normalizeArabic(kw);
         const regex = new RegExp(`(?:^|\\s|[بفلك]|لل)${normKw}(?:\\s|$)`, 'gi');
         const count1 = (normText.match(regex) || []).length;
         const count2 = (francoText.match(regex) || []).length;
         matches += Math.max(count1, count2);
      }
      if (matches > 0) scores[intent.id] = matches;
   }

   let bestIntent = null;
   let maxScore = 0;
   for (const [id, score] of Object.entries(scores)) {
      if (score > maxScore) { maxScore = score; bestIntent = id; }
   }
   return bestIntent;
}

function extractDate(text) {
   const normText = normalizeArabic(text);
   const francoText = transliterateFranco(text);
   const date = new Date();
   date.setHours(12, 0, 0, 0);

   const textToCheck = normText + " " + francoText;
   if (['اول امبارح', 'the day before yesterday'].some(p => textToCheck.includes(p))) {
      date.setDate(date.getDate() - 2);
   } else if (['امبارح', 'امس', 'yesterday'].some(p => textToCheck.includes(p))) {
      date.setDate(date.getDate() - 1);
   } else if (['بكره', 'غدا', 'tomorrow'].some(p => textToCheck.includes(p))) {
      date.setDate(date.getDate() + 1);
   }
   return date;
}

function extractAccountTokens(origWords, normWords, francoWords, userAccounts, keepFlags) {
   let matchedAccounts = [];

   for (const acc of userAccounts) {
      const accNorm = normalizeArabic(acc.name);
      const accFranco = transliterateFranco(acc.name);

      // Distinguish exact aliases from synonyms
      const exactAliases = new Set([accNorm, accFranco, acc.name.toLowerCase()]);
      const allAliases = new Set(exactAliases);

      const isCash = Array.from(exactAliases).some(a => a === 'كاش' || a === 'cash' || a === 'kash');
      const isWallet = Array.from(exactAliases).some(a => a.includes('محفظ') || a.includes('wallet') || a.includes('m7fz'));
      const isBank = Array.from(exactAliases).some(a => a.includes('بنك') || a.includes('bank') || a.includes('فيزا') || a.includes('visa') || a.includes('card'));
      const isVodafone = Array.from(exactAliases).some(a => a.includes('vodafone') || a.includes('فودافون'));
      const isTelda = Array.from(exactAliases).some(a => a.includes('telda') || a.includes('tilda') || a.includes('تيلد') || a.includes('تلد'));
      const isMeeza = Array.from(exactAliases).some(a => a.includes('meeza') || a.includes('miza') || a.includes('ميزه') || a.includes('ميزة'));
      const isInstapay = Array.from(exactAliases).some(a => a.includes('instapay') || a.includes('insta') || a.includes('انستا'));
      const isFawry = Array.from(exactAliases).some(a => a.includes('fawry') || a.includes('فوري'));
      const isEtisalat = Array.from(exactAliases).some(a => a.includes('etisalat') || a.includes('اتصالات'));
      const isOrange = Array.from(exactAliases).some(a => a.includes('orange') || a.includes('اورانج') || a.includes('اورنج'));
      const isWe = Array.from(exactAliases).some(a => a.includes('we cash') || a.includes('wepay') || a === 'we' || a === 'وي');
      const isQnb = Array.from(exactAliases).some(a => a.includes('qnb') || a.includes('كيو ان بي'));
      const isBebasata = Array.from(exactAliases).some(a => a.includes('bebasata') || a.includes('ببساط'));

      const injectAliases = (key) => {
         ACCOUNT_SYNONYMS[key].forEach(s => {
            const n = normalizeArabic(s);
            allAliases.add(n);
            exactAliases.add(n);
         });
      };

      if (isCash) injectAliases('cash');
      if (isWallet) injectAliases('wallet');
      if (isBank) injectAliases('bank');
      if (isVodafone) injectAliases('vodafone');
      if (isTelda) injectAliases('telda');
      if (isMeeza) injectAliases('meeza');
      if (isInstapay) injectAliases('instapay');
      if (isFawry) injectAliases('fawry');
      if (isEtisalat) injectAliases('etisalat');
      if (isOrange) injectAliases('orange');
      if (isWe) injectAliases('we');
      if (isQnb) injectAliases('qnb');
      if (isBebasata) injectAliases('bebasata');

      let bestMatchIndices = null;
      let highestPriority = 999;
      let bestAlias = null;

      for (const alias of allAliases) {
         if (!alias) continue;
         const aliasNorm = normalizeArabic(alias);
         const aliasWords = aliasNorm.split(/\s+/);
         const isOriginal = (alias === acc.name.toLowerCase() || alias === acc.name);
         const isExact = exactAliases.has(alias);
         const basePriority = isOriginal ? -2 : (isExact ? 0 : 2);

         for (let i = 0; i <= normWords.length - aliasWords.length; i++) {
            let match = true;
            let isFrancoOnly = false;
            for (let j = 0; j < aliasWords.length; j++) {
               const nw = normWords[i + j];
               const fw = francoWords[i + j];
               const aw = aliasWords[j];
               const nwMatch = nw === aw || nw === `ال${aw}` || nw === `بال${aw}` || nw === `ب${aw}` || nw === `من${aw}`;
               const fwMatch = fw === aw || fw === `ال${aw}` || fw === `بال${aw}` || fw === `ب${aw}` || fw === `من${aw}`;

               if (!nwMatch && !fwMatch) { match = false; break; }
               if (!nwMatch && fwMatch) { isFrancoOnly = true; }
            }

            if (match) {
               let priority = basePriority + (isFrancoOnly ? 0.5 : 0) + 1;
               let indicesToRemove = [];
               for (let j = 0; j < aliasWords.length; j++) indicesToRemove.push(i + j);

               let checkIdx = i - 1;
               if (checkIdx >= 0 && (normWords[checkIdx] === 'the' || normWords[checkIdx] === 'a' || normWords[checkIdx] === 'an' || normWords[checkIdx] === 'my')) {
                  indicesToRemove.push(checkIdx);
                  checkIdx--;
               }

               if (checkIdx >= 0) {
                  const prevW = normWords[checkIdx];
                  const ind = ['من', 'بـ', 'ب', 'في', 'بواسطة', 'عن', 'طريق', 'استخدمت', 'استخدم', 'from', 'using', 'with', 'via', 'paid'];
                  if (ind.includes(prevW) || ['من', 'بـ', 'ب', 'from', 'using', 'with'].includes(francoWords[checkIdx])) {
                     priority = basePriority + (isFrancoOnly ? 0.5 : 0);
                     indicesToRemove.push(checkIdx);
                     if (checkIdx > 0 && ((normWords[checkIdx - 1] === 'عن' && prevW === 'طريق') || (normWords[checkIdx - 1] === 'paid' && prevW === 'with'))) {
                        indicesToRemove.push(checkIdx - 1);
                     }
                  }
               }

               const firstMatchW = normWords[i];
               if (firstMatchW.startsWith('بال') || firstMatchW.startsWith('ب') || firstMatchW.startsWith('من')) {
                  priority = basePriority + (isFrancoOnly ? 0.5 : 0);
               }

               if (priority < highestPriority) {
                  highestPriority = priority;
                  bestMatchIndices = indicesToRemove;
                  bestAlias = alias; // Needs let bestAlias = null; at top
               }
            }
         }
      }

      if (bestMatchIndices) {
         matchedAccounts.push({ account: acc, indices: bestMatchIndices, priority: highestPriority, bestAlias });
      }
   }

   if (matchedAccounts.length === 0) return { accountId: null };

   // Remove subsets (e.g. 'Cash' matching 'كاش' inside 'فودافون كاش')
   matchedAccounts = matchedAccounts.filter((m, i) => {
      const isSubset = matchedAccounts.some((other, j) => {
         if (i === j) return false;
         const overlap = m.indices.some(idx => other.indices.includes(idx));
         return overlap && other.indices.length > m.indices.length;
      });
      return !isSubset;
   });

   matchedAccounts.sort((a, b) => {
      if (a.priority !== b.priority) {
         return a.priority - b.priority;
      }
      return b.indices.length - a.indices.length;
   });
   const bestPriority = matchedAccounts[0].priority;
   const topMatches = matchedAccounts.filter(m => m.priority === bestPriority);

   if (topMatches.length === 1) {
      topMatches[0].indices.forEach(idx => keepFlags[idx] = false);
      return { accountId: topMatches[0].account._id };
   }
   return { accountId: null };
}

function parseText(text, userAccounts = []) {
   const textIndic = convertArabicIndic(text);
   const rawParts = textIndic.split(/\s(?:و|and)\s?/i);

   const transactions = [];
   let buffer = [];

   // Rough fallback extractAmount to safely split multi-transactions
   const roughExtractAmount = (txt) => {
      const norm = convertArabicIndic(txt);
      const m = norm.match(/(?:^|\s)(?:بـ|ب|for )?(\d+(?:\.\d+)?)(?:\s|$)/i);
      if (m) return parseFloat(m[1]);
      for (const [word, val] of Object.entries(EGYPTIAN_NUMBERS)) {
         if (new RegExp(`(?:^|\\s)(?:بـ|ب)?${word}(?:\\s|$)`, 'i').test(norm)) return val;
      }
      return null;
   };

   for (let i = 0; i < rawParts.length; i++) {
      buffer.push(rawParts[i]);
      const combined = buffer.join(' و ');
      const combinedAmount = roughExtractAmount(combined);
      const hasRemainingAmount = rawParts.slice(i + 1).some(part => roughExtractAmount(part) !== null);

      if (combinedAmount !== null && hasRemainingAmount) {
         transactions.push(combined);
         buffer = [];
      } else if (i === rawParts.length - 1) {
         if (combined.trim()) transactions.push(combined);
      }
   }

   const results = [];
   let inheritedAccountId = null;

   for (const t of transactions) {
      const origWords = t.trim().split(/\s+/);
      const normWords = origWords.map(normalizeArabic);
      const francoWords = origWords.map(transliterateFranco);
      let keepFlags = new Array(origWords.length).fill(true);

      let amount = null;

      // 1. Extract Amount Structurally
      for (let i = 0; i < origWords.length; i++) {
         const nw = normWords[i];
         const match = nw.match(/^(?:بـ|ب|for)?(\d+(?:\.\d+)?)$/i);
         if (match) {
            amount = parseFloat(match[1]);
            keepFlags[i] = false;
            if (i + 1 < origWords.length && ['جنيه', 'جنية', 'ج', 'egp', 'le', 'pounds'].includes(normWords[i + 1])) {
               keepFlags[i + 1] = false;
            }
            break;
         }

         let foundWritten = false;
         for (const [word, val] of Object.entries(EGYPTIAN_NUMBERS)) {
            if (nw === word || nw === `ب${word}` || nw === `بـ${word}`) {
               amount = val;
               keepFlags[i] = false;
               foundWritten = true;
               if (i + 1 < origWords.length && ['جنيه', 'جنية', 'ج', 'egp', 'le', 'pounds'].includes(normWords[i + 1])) {
                  keepFlags[i + 1] = false;
               }
               break;
            }
         }
         if (foundWritten) break;
      }

      if (amount === null && results.length > 0) continue;

      // 2. Extract Account Structurally
      const accResult = extractAccountTokens(origWords, normWords, francoWords, userAccounts, keepFlags);
      let accountId = accResult.accountId;
      if (accountId) inheritedAccountId = accountId;
      else if (inheritedAccountId) accountId = inheritedAccountId;

      // 3. Extract Date Structurally
      const date = extractDate(t);
      const timeWords = ['امبارح', 'امس', 'بكره', 'غدا', 'النهارده', 'اليوم', 'دلوقتي', 'yesterday', 'today', 'tomorrow', 'now'];
      for (let i = 0; i < origWords.length; i++) {
         if (timeWords.includes(normWords[i]) || timeWords.includes(francoWords[i])) keepFlags[i] = false;
         if (i + 1 < origWords.length && normWords[i] === 'اول' && normWords[i + 1] === 'امبارح') {
            keepFlags[i] = false; keepFlags[i + 1] = false;
         }
         if (i + 1 < origWords.length && normWords[i] === 'the' && normWords[i + 1] === 'day') {
            keepFlags[i] = false; keepFlags[i + 1] = false;
         }
      }

      // 4. Extract Intent & Type
      const intent = extractIntent(t);
      const type = extractType(t);

      // 5. Extract Description Structurally
      const verbsAndPronouns = [...EXPENSE_VERBS, ...INCOME_VERBS, 'انا', 'انهارده', 'i'];
      for (let i = 0; i < origWords.length; i++) {
         if (verbsAndPronouns.some(v => normalizeArabic(v) === normWords[i] || transliterateFranco(v) === francoWords[i])) {
            keepFlags[i] = false;
         }
      }

      // Remove prepositions safely (removed articles to keep them in descriptions)
      const prepositions = ['في', 'من', 'على', 'اللي', 'ب', 'in', 'at', 'on', 'for', 'my', 'from', 'with', 'using', 'via'];
      for (let i = 0; i < origWords.length; i++) {
         if (prepositions.includes(normWords[i]) || prepositions.includes(francoWords[i])) {
            keepFlags[i] = false;
         }
      }

      let descTokens = [];
      for (let i = 0; i < origWords.length; i++) {
         if (keepFlags[i]) descTokens.push(origWords[i]);
      }

      let description = descTokens.join(' ').trim();

      // Fallbacks
      if (!description) {
         if (intent === 'transportation') description = 'مواصلات';
         else if (intent === 'food_and_drink' || intent === 'restaurant' || intent === 'fast_food') description = 'أكل وشرب';
         else if (intent === 'coffee' || intent === 'beverages') description = 'مشروبات';
         else description = type === 'income' ? 'دخل' : 'معاملة';
      }

      results.push({
         rawText: t,
         amount,
         type,
         intent,
         date: date.toISOString(),
         accountId,
         description
      });
   }

   // Backfill accountId for multi-transactions (e.g. "I bought X and Y with Cash")
   const foundAccount = results.find(r => r.accountId)?.accountId;
   if (foundAccount) {
      results.forEach(r => { if (!r.accountId) r.accountId = foundAccount; });
   }

   return results;
}

module.exports = {
   parseText,
   extractAmount: (text) => parseText(text)[0]?.amount || null,
   extractIntent,
   normalizeArabic,
   transliterateFranco,
   extractDate
};
