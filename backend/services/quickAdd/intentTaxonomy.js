const INTENT_VERSION = 2;

const INTENTS = [
  {
    id: 'food_and_drink',
    keywords: ['اكل', 'أكل', 'طعام', 'غدا', 'عشا', 'فطار', 'غداء', 'عشاء', 'إفطار', 'وجبة', 'food', 'meals', 'dining', 'akl', 'akla']
  },
  {
    id: 'restaurant',
    keywords: ['مطعم', 'مطاعم', 'restaurant', 'dine out', 'mat3am', 'matar3m']
  },
  {
    id: 'fast_food',
    keywords: ['كشري', 'شاورما', 'kfc', 'mcdonalds', 'ماك', 'بيتزا', 'pizza', 'برجر', 'burger', 'ساندوتش', 'كنتاكي', 'ماكدونالدز', 'فاست فود', 'fast food']
  },
  {
    id: 'coffee',
    keywords: ['قهوة', 'كوفي', 'كافيه', 'ستاربكس', 'starbucks', 'coffee', 'اسبريسو', 'نسكافيه', 'cafe']
  },
  {
    id: 'beverages',
    keywords: ['مشروب', 'عصير', 'بيبسي', 'مياه', 'ميه', 'مياة', 'شاي', 'drink', 'beverage', 'water', 'tea']
  },
  {
    id: 'desserts',
    keywords: ['حلو', 'حلويات', 'ايس كريم', 'كيك', 'dessert', 'ice cream', 'cake', 'sweets']
  },
  {
    id: 'groceries',
    keywords: ['سوبر ماركت', 'بقالة', 'كارفور', 'سعودي', 'خضار', 'فاكهة', 'هايبر', 'طلبات', 'talabat', 'مقاضي', 'بندة', 'لبن', 'جبنة', 'عيش', 'خبز', 'groceries', 'supermarket', 'market']
  },
  {
    id: 'transportation',
    keywords: ['تاكسي', 'مواصلات', 'اوبر', 'أوبر', 'uber', 'مترو', 'ميكروباص', 'اتوبيس', 'أتوبيس', 'كريم', 'careem', 'ان درايف', 'indrive', 'بنزين', 'سفر', 'موقف', 'تذكرة', 'قطار', 'taxi', 'transport', 'bus', 'train', 'gas', 'fuel', 'mowaslat']
  },
  {
    id: 'bills',
    keywords: ['فاتورة', 'كهربا', 'ميه', 'مياة', 'مياه', 'غاز', 'نت', 'انترنت', 'ايجار', 'إيجار', 'فواتير', 'شحن', 'رصيد', 'وي', 'فودافون', 'اورانج', 'اتصالات', 'باقة', 'bill', 'electricity', 'water', 'gas', 'internet', 'rent', 'recharge', 'fawatir']
  },
  {
    id: 'shopping',
    keywords: ['لبس', 'ملابس', 'جزمة', 'حذاء', 'قميص', 'بنطلون', 'تسوق', 'مول', 'سوق', 'امازون', 'أمازون', 'amazon', 'نون', 'noon', 'هدية', 'shopping', 'clothes', 'shoes', 'gift', 'moshtrayat']
  },
  {
    id: 'entertainment',
    keywords: ['سينما', 'فيلم', 'خروجة', 'ترفيه', 'جيم', 'بلايستيشن', 'نادي', 'ملاهي', 'entertainment', 'cinema', 'movie', 'gym', 'club', 'fun', '5orogat']
  },
  {
    id: 'healthcare',
    keywords: ['دكتور', 'صيدلية', 'علاج', 'دواء', 'طبيب', 'مستشفى', 'عيادة', 'تحاليل', 'صحة', 'كشف', 'health', 'doctor', 'pharmacy', 'medicine', 'hospital', 'clinic']
  },
  {
    id: 'education',
    keywords: ['كورس', 'جامعة', 'مدرسة', 'تعليم', 'دورة', 'كتب', 'مكتبة', 'درس', 'مصاريف مدرسة', 'education', 'school', 'university', 'course', 'books', 'library']
  },
  {
    id: 'salary',
    keywords: ['مرتب', 'راتب', 'شغل', 'قبض', 'قبضت', 'سلفة', 'مكافأة', 'بونص', 'حافز', 'عمل', 'salary', 'income', 'bonus', 'work', 'job', 'wage']
  },
  {
    id: 'subscriptions',
    keywords: ['اشتراك', 'نتفليكس', 'netflix', 'سبوتيفاي', 'spotify', 'subscription']
  }
];

const INTENT_SYNONYMS = {
  'food_and_drink': ['اكل', 'طعام', 'مصروفات شخصيه', 'غذا', 'food', 'dining'],
  'restaurant': ['مطعم', 'اكل', 'food', 'restaurant', 'dining'],
  'fast_food': ['فاست فود', 'وجبات سريعه', 'fast food', 'junk food'],
  'coffee': ['قهوه', 'كافيه', 'مقهى', 'coffee', 'cafe'],
  'beverages': ['مشروبات', 'عصير', 'drinks', 'beverages'],
  'desserts': ['حلو', 'حلويات', 'desserts', 'sweets'],
  'groceries': ['بقاله', 'سوبر ماركت', 'خضار', 'groceries', 'market'],
  'transportation': ['مواصلات', 'سفر', 'انتقالات', 'transport', 'transportation', 'travel'],
  'bills': ['فواتير', 'فواتير ومرافق', 'bills', 'utilities'],
  'shopping': ['تسوق', 'مشتريات', 'shopping', 'clothes'],
  'entertainment': ['ترفيه', 'تسليه', 'خروجات', 'entertainment', 'fun'],
  'healthcare': ['صحه', 'علاج', 'دكتور', 'health', 'medical'],
  'education': ['تعليم', 'دراسه', 'كورس', 'education', 'study'],
  'salary': ['مرتب', 'راتب', 'شغل', 'دخل', 'salary', 'income'],
  'subscriptions': ['اشتراكات', 'خدمات', 'subscriptions']
};

module.exports = {
  INTENT_VERSION,
  INTENTS,
  INTENT_SYNONYMS
};
