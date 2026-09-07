const fs = require('fs');

const INTENTS = [
  // --- FOOD ---
  { id: 'food_and_drink', keywords: ['اكل', 'أكل', 'طعام', 'غدا', 'عشا', 'فطار', 'غداء', 'عشاء', 'إفطار', 'وجبة', 'food', 'meals', 'dining', 'akl', 'akla', 'وجبات', 'food_and_drink', 'food & drinks', 'food expenses', 'food money', 'eating', 'my food', 'food budget', 'أكل وشرب', 'مصاريف الأكل', 'مصاريف الأكل والشرب', 'أكل البيت', 'akly', 'akl w shorb', 'masareef el akl'] },
  { id: 'restaurant', keywords: ['مطعم', 'مطاعم', 'restaurant', 'dine out', 'mat3am', 'matar3m', 'restaurants', 'dining', 'dining out', 'eating out', 'dinner', 'lunch', 'going out to eat', 'أكل بره', 'عشا', 'غدا', 'mat3amty', 'akl barra', '3asha', 'ghada'] },
  { id: 'fast_food', keywords: ['كشري', 'شاورما', 'kfc', 'mcdonalds', 'ماك', 'بيتزا', 'pizza', 'برجر', 'burger', 'ساندوتش', 'كنتاكي', 'ماكدونالدز', 'فاست فود', 'fast food', 'fastfood', 'takeaway', 'take out', 'quick food', 'delivery food', 'وجبات سريعة', 'تيك أواي', 'ta3am saree3'] },
  { id: 'coffee', keywords: ['قهوة', 'كوفي', 'كافيه', 'ستاربكس', 'starbucks', 'coffee', 'اسبريسو', 'نسكافيه', 'cafe', 'قهوه', 'café', 'coffee shop', 'coffee money', 'coffee expenses', 'my coffee', 'القهوة', 'مصاريف القهوة', 'ahwa', '2ahwa', 'qahwa', 'ahwaty'] },
  { id: 'beverages', keywords: ['مشروب', 'عصير', 'بيبسي', 'مياه', 'ميه', 'مياة', 'شاي', 'drink', 'beverage', 'water', 'tea', 'drinks', 'beverages', 'drinks money', 'soft drinks', 'juices', 'مشروبات', 'عصاير', 'mashrobat', '3asayer'] },
  { id: 'desserts', keywords: ['حلو', 'حلويات', 'ايس كريم', 'كيك', 'dessert', 'ice cream', 'cake', 'sweets', 'desserts', 'candy', 'pastry', 'cakes', 'bakery', 'حلوياتي', 'مخبوزات', '7alaweyat', '7alaweyaty', 'kake', 'makhbouzat'] },
  { id: 'groceries', keywords: ['سوبر ماركت', 'بقالة', 'كارفور', 'سعودي', 'خضار', 'فاكهة', 'هايبر', 'طلبات', 'talabat', 'مقاضي', 'بندة', 'لبن', 'جبنة', 'عيش', 'خبز', 'groceries', 'supermarket', 'market', 'grocery', 'super market', 'food shopping', 'house groceries', 'grocery shopping', 'home groceries', 'بقاله', 'مقاضي البيت', 'مشتريات البيت', 'سوبرماركت', 'baqala', 'ba2ala', 'bakala', 'm2adey', 'm2ady', 'm2ady el beet', 'moshtareyat el beet'] },

  // --- TRANSPORTATION ---
  { id: 'transportation', keywords: ['مواصلات', 'سفر', 'انتقالات', 'transport', 'transportation', 'mowaslat', 'mwaslat', 'مترو', 'ميكروباص', 'اتوبيس', 'أتوبيس', 'موقف', 'تذكرة', 'قطار', 'bus', 'train', 'اوبر', 'أوبر', 'uber', 'كريم', 'careem', 'ان درايف', 'indrive', 'transport expenses', 'commute', 'commuting', 'public transport', 'مصاريف المواصلات', 'مواصلاتي', 'mwasalat', 'mwaselat', 'mwaslaty'] },
  { id: 'taxi', keywords: ['تاكسي', 'taxi', 'cab', 'taxi rides', 'cab rides', 'rides', 'مشاوير', 'taksy', 'mashawer'] },
  { id: 'fuel', keywords: ['بنزين', 'سولار', 'غاز', 'محطة', 'gas', 'fuel', 'petrol', 'gas station', 'petrol station', 'gasoline', 'بنزينة', 'وقود', 'benzene', 'benzeen', 'banzena', 'wa2ood'] },
  { id: 'parking', keywords: ['ركنة', 'جراج', 'باركينج', 'parking', 'garage', 'rakna', 'parking fees', 'parking money', 'ركن', 'مواقف', 'rokna', 'rkn', 'mawafe2'] },

  // --- BILLS & UTILITIES ---
  { id: 'bills', keywords: ['فاتورة', 'فواتير', 'bill', 'bills', 'fawatir', 'monthly bills', 'household bills', 'bills money', 'فواتير البيت', 'فواتيري', 'fawatery', 'fatora', 'fawatir el beet'] },
  { id: 'utilities', keywords: ['مرافق', 'كهربا', 'كهرباء', 'مياه', 'مياة', 'ميه', 'غاز', 'electricity', 'water bill', 'gas bill', 'utilities', 'power', 'water', 'household utilities', 'kahraba', 'maya', 'mayah', 'ghaz'] },
  { id: 'internet', keywords: ['نت', 'انترنت', 'راوتر', 'internet', 'wifi', 'adsl', 'internet bill', 'wi-fi', 'home internet', 'إنترنت', 'واي فاي', 'نت البيت', 'net', 'net el beet'] },
  { id: 'phone', keywords: ['شحن', 'رصيد', 'وي', 'فودافون', 'اورانج', 'اتصالات', 'باقة', 'موبايل', 'mobile', 'recharge', 'credit', 'phone', 'mobile bill', 'phone bill', 'mobile recharge', 'تليفون', 'فاتورة الموبايل', 'mob', 'tel', 'sh7n'] },

  // --- SHOPPING ---
  { id: 'shopping', keywords: ['تسوق', 'مول', 'سوق', 'امازون', 'أمازون', 'amazon', 'نون', 'noon', 'shopping', 'moshtrayat', 'مشتريات', 'shopping expenses', 'purchases', 'online shopping', 'shopping money', 'personal shopping', 'مشتريات أونلاين', 'تسوق أونلاين', 'moshtareyat', 'moshtaryat', 'tasawo2', 'tsawo2'] },
  { id: 'clothing', keywords: ['لبس', 'ملابس', 'جزمة', 'حذاء', 'قميص', 'بنطلون', 'تيشيرت', 'clothes', 'clothing', 'shoes', 'apparel', 'fashion', 'clothes shopping', 'هدوم', 'أحذية', 'فاشون', 'hadom', 'hodom', 'malabes', 'shoz', 'fashon'] },
  { id: 'electronics', keywords: ['الكترونيات', 'موبايل', 'لاب توب', 'اجهزة', 'electronics', 'gadgets', 'laptop', 'devices', 'phones', 'mobiles', 'tech', 'electronics shopping', 'إلكترونيات', 'أجهزة', 'موبايلات', 'أجهزة إلكترونية', 'elektroniyat', 'agheza', 'mobaylat'] },

  // --- LIFESTYLE ---
  { id: 'entertainment', keywords: ['خروجة', 'ترفيه', 'جيم', 'بلايستيشن', 'نادي', 'ملاهي', 'entertainment', 'gym', 'club', 'fun', '5orogat', 'leisure', 'going out', 'outings', 'فسح', 'خروجات', 'tafreeh', 'tafreh', 'fos7', 'khorogat'] },
  { id: 'cinema', keywords: ['سينما', 'فيلم', 'cinema', 'movie', 'movies', 'movie theater', 'أفلام', 'sinema', 'aflam'] },
  { id: 'subscriptions', keywords: ['اشتراك', 'اشتراكات', 'subscription', 'subscriptions', 'نتفليكس', 'netflix', 'سبوتيفاي', 'spotify', 'شاهد', 'shahid', 'streaming', 'membership', 'monthly subscription', 'monthly membership', 'عضوية', 'eshtrak', 'eshterak', 'eshterakat', '3odweya'] },

  // --- HEALTH ---
  { id: 'healthcare', keywords: ['صحة', 'علاج', 'كشف', 'health', 'healthcare', 'medical', 'دكتور', 'طبيب', 'عيادة', 'doctor', 'clinic', 'physician', 'تحاليل', 'اشعة', 'طبي', 'lab', 'scan', 'doctors', 'medical expenses', 'طب', 'دكاترة', 'se7a', 'teb', '3elag'] },
  { id: 'pharmacy', keywords: ['صيدلية', 'دواء', 'برشام', 'pharmacy', 'medicine', 'drugs', 'medicines', 'medication', 'أدوية', 'saidalya', 'dawa', 'adwya'] },
  { id: 'hospital', keywords: ['مستشفى', 'رعاية', 'hospital', 'care', 'hospitals', 'medical center', 'مستشفيات', 'مركز طبي', 'mostashfa', '3yada', 'markaz teby'] },

  // --- EDUCATION ---
  { id: 'education', keywords: ['تعليم', 'دراسة', 'مدرسة', 'education', 'school', 'study', 'مصاريف', 'مصروفات', 'قسط', 'tuition', 'fees', 'كورس', 'دورة', 'درس', 'course', 'courses', 'lesson', 'كتب', 'مكتبة', 'كشكول', 'books', 'library', 'notebook', 'university', 'college', 'learning', 'جامعة', 'كلية', 'كورسات', 'مصاريف الدراسة', 'ta3leem', 'madrasa', 'gam3a', 'kolya', 'derasa'] },

  // --- INCOME ---
  { id: 'salary', keywords: ['مرتب', 'راتب', 'شغل', 'قبض', 'قبضت', 'عمل', 'salary', 'income', 'work', 'job', 'wage', 'دخل', 'paycheck', 'payroll', 'monthly salary', 'salary income', 'مرتبي', 'راتبي', 'ratb', 'ratby', 'mratab', 'mratby'] },
  { id: 'freelance', keywords: ['فريلانس', 'مستقل', 'freelance', 'freelancer', 'freelancing', 'freelance income', 'freelance work', 'فريلانسر', 'شغل حر', 'shoghl 7or'] },
  { id: 'business_income', keywords: ['ارباح', 'تجارة', 'business', 'profits', 'business_income', 'business income', 'revenue', 'sales', 'business money', 'company income', 'دخل المشروع', 'دخل البيزنس', 'مبيعات', 'إيرادات', 'dakhl el mashroo3', 'dakhl el business', 'mabee3at', 'eradat'] },
  { id: 'investment_income', keywords: ['عائد', 'استثمار', 'investment_income', 'investment income', 'investment returns', 'returns', 'investment profit', 'عائد استثمار', 'أرباح استثمار', 'أرباح الاستثمارات', '3ayed estsmar', 'arbah estsmar', 'rba7 estsmar'] },

  // --- OTHER EXPENSES ---
  { id: 'gifts', keywords: ['هدية', 'هدايا', 'عيدية', 'gift', 'gifts', 'presents', 'gift money', 'hedya', 'hadaya', 'hdaya'] },
  { id: 'charity', keywords: ['صدقة', 'زكاة', 'تبرع', 'charity', 'donation', 'zakat', 'donations', 'giving', 'تبرعات', 'sada2a', 'sadaqa', 'tabar3', 'tabaro3'] },
  { id: 'rent', keywords: ['ايجار', 'إيجار', 'rent', 'apartment rent', 'house rent', 'monthly rent', 'إيجار البيت', 'إيجار الشقة', 'egar', 'eegar', 'egaar', 'egar el beet'] },
  { id: 'insurance', keywords: ['تأمين', 'تامين', 'insurance', 'insurance payment', 'insurance premium', 'قسط التأمين', 'ta2meen', 'taameen', 'premium'] },
  { id: 'debt_payment', keywords: ['دين', 'سداد', 'قرض', 'debt', 'loan', 'payment', 'debt_payment', 'debt payment', 'loan payment', 'installment', 'installments', 'debt repayment', 'سداد دين', 'قسط', 'أقساط', 'سداد القرض', 'deen', 'dayn', '2est', '2sat', 'a2sat', 'sadad deen', 'saddad el deen'] },
  { id: 'bank_fees', keywords: ['رسوم', 'عمولة', 'ضريبة', 'fee', 'fees', 'tax', 'bank_fees', 'bank fees', 'bank charges', 'banking fees', 'account fees', 'transaction fees', 'رسوم بنكية', 'مصروفات بنكية', 'عمولة بنك', 'رسوم البنك', 'rosom bank', 'masareef bank', '3omola bank'] },
  
  // --- FINANCIAL/TRANSFER ---
  { id: 'cash_withdrawal', keywords: ['سحب', 'نقدية', 'كاش', 'cash', 'withdrawal', 'atm', 'cash_withdrawal', 'cash withdrawal', 'atm withdrawal', 'cash out', 'سحب كاش', 'سحب نقدي', 'سحب من atm', 'sa7b cash', 'sa7b na2dy', 'sa7b mn atm'] },
  { id: 'cash_deposit', keywords: ['ايداع', 'إيداع', 'deposit', 'cash_deposit', 'cash deposit', 'cash in', 'إيداع كاش', 'eeda3', 'eeda3 cash'] },
  { id: 'transfer', keywords: ['تحويل', 'تحويلات', 'transfer', 'money transfer', 'bank transfer', 'money sent', 'money received', 'تحويل فلوس', 'تحويل أموال', 'ta7weel', 'ta7wel', 'ta7weel floos'] },
  { id: 'savings', keywords: ['توفير', 'ادخار', 'جمعية', 'savings', 'gam3eya', 'saving', 'savings money', 'emergency savings', 'مدخرات', 'تحويش', 'ta7weesh', 'tahweesh', 'tawfeer', 'tawfir'] },
  { id: 'investment', keywords: ['استثمار', 'شهادة', 'وديعة', 'investment', 'investing', 'investments', 'portfolio', 'استثمارات', 'estsmar', 'estethmar', 'estthmar', 'istethmar'] },

  // --- MISC ---
  { id: 'travel', keywords: ['سفر', 'رحلة', 'فندق', 'طيران', 'travel', 'trip', 'hotel', 'flight', 'vacation', 'flights', 'hotels', 'tourism', 'سياحة', 'مصيف', 'safar', 'safary', 'seya7a', 'rehla', 'ro7la', 'maseef'] },
  { id: 'personal_care', keywords: ['عناية', 'حلاق', 'كوافير', 'تجميل', 'مكياج', 'personal_care', 'beauty', 'makeup', 'salon', 'haircut', 'personal care', 'barber', 'skincare', 'grooming', 'عناية شخصية', 'حلاقة', 'عناية بالبشرة', '3enaya', '3enaya shakhsya', '7ala2a', '7ala2ty'] },
  { id: 'home', keywords: ['بيت', 'منزل', 'ديكور', 'عفش', 'مفروشات', 'home', 'furniture', 'decor', 'house', 'home expenses', 'household', 'home supplies', 'household expenses', 'البيت', 'مصاريف البيت', 'أثاث', 'مستلزمات البيت', 'beet', 'beit', 'el beet', 'beety', 'masareef el beet', '7agat el beet'] },
  { id: 'pets', keywords: ['حيوانات', 'قطة', 'كلب', 'pets', 'cat', 'dog', 'pet', 'pet care', 'animals', 'حيوانات أليفة', 'حيواناتي', 'قطط', 'كلبي', '7ayawanat', '2otat', 'kalb', 'kalby'] },
  { id: 'children', keywords: ['اطفال', 'أطفال', 'اولاد', 'أولاد', 'children', 'kids', 'baby', 'kids expenses', 'my kids', 'children expenses', 'عيال', 'ولاد', 'ولادي', 'مصاريف العيال', '3yal', '3eyal', '3yaly', 'wlady', 'wladaty', 'masareef el 3yal'] },
  { id: 'family', keywords: ['عيلة', 'العيلة', 'أسرة', 'الأسرة', 'عائلة', 'العائلة', 'family', 'مصاريف العيلة', 'مصاريف الأسرة', 'دعم الأسرة', 'حاجات العيلة', 'family expenses', 'family stuff', 'family costs', 'family support', '3eila', '3ayla', '3elety', 'masareef el 3eila', 'masaref el 3eila', 'my family', 'my family expenses', 'family money', 'expenses for family', 'عيلتي', 'أسرتي', 'masareef el 3eilty', '3eilty', '3aylty', '3elty'] }
];

const newContent = `const INTENT_VERSION = 6; // Locked Taxonomy

const INTENTS = ${JSON.stringify(INTENTS, null, 2)};

const INTENT_SYNONYMS = {};

module.exports = {
  INTENT_VERSION,
  INTENTS,
  INTENT_SYNONYMS
};
`;

fs.writeFileSync('services/quickAdd/intentTaxonomy.js', newContent);
console.log('intentTaxonomy.js updated.');
