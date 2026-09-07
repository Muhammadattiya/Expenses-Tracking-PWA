const kws = ['لبس', 'ملابس', 'جزمة', 'حذاء', 'قميص', 'بنطلون', 'تسوق', 'مول', 'سوق', 'امازون', 'أمازون', 'amazon', 'نون', 'noon', 'هدية', 'shopping', 'clothes', 'shoes', 'gift', 'moshtrayat'];
const str = 'UNKNOWN MERCHANT';
const franco = 'ونكنون ميرتشانت';

for(let kw of kws) {
  if (kw.length < 4) continue;
  const regex = new RegExp(`(?:^|\\s|[\\-\\*\\.,_]|[بفلك]|لل)${kw}`, 'gi');
  if (regex.test(str)) console.log('MATCHED IN ENG:', kw);
  if (regex.test(franco)) console.log('MATCHED IN FRANCO:', kw);
}
