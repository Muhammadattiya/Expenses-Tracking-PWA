/**
 * Financial Advice Engine: Computes tailored, mathematical, and data-backed
 * strategies for savings goals based on the user's actual spending, income,
 * emergency runway, and required goal paces.
 */

export function generateGoalAdvices({
  goals = [],
  transactions = [],
  accounts = [],
  shield = null,
  lang = 'ar'
}) {
  const advices = [];
  const isAr = lang === 'ar';

  const money = (val) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const activeGoals = (goals || []).filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    return [
      {
        id: 'no_goals',
        type: 'info',
        icon: 'Sparkles',
        title: isAr ? 'ابدأ بتحديد أول أهدافك المالية' : 'Set Your First Financial Goal',
        description: isAr 
          ? 'تحديد هدف مالي بمبلغ وتاريخ مستهدف يمنحك وضوحاً كاملاً لمسار مدخراتك ومعدل الادخار الشهري المطلوب.'
          : 'Setting a concrete target with a deadline gives you crystal clarity on your monthly savings momentum.',
        tag: isAr ? 'خطوة أولى' : 'First Step',
        tagColor: 'text-[#E8C5A8] bg-[#8D6346]/20 border-[#8D6346]/40'
      }
    ];
  }

  // 1. Calculate Aggregate Required Pace
  const totalRequiredMonthlyPace = activeGoals.reduce((sum, g) => sum + (Number(g.requiredMonthlyPace) || 0), 0);

  // 2. Calculate Past 60-day Income & Burn
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recentTx = (transactions || []).filter(t => new Date(t.date) >= sixtyDaysAgo);

  const totalIncome60d = recentTx
    .filter(t => t.type === 'income' || t.type === 'settlement')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  
  const estimatedMonthlyIncome = totalIncome60d > 0 ? Math.round(totalIncome60d / 2) : 12000;

  const essentialBurn = shield?.essentialMonthlyBurn || 6000;
  const estimatedMonthlySurplus = estimatedMonthlyIncome - essentialBurn;

  // Top Priority Goal
  const highPriorityGoal = activeGoals.find(g => g.priority === 'high') || activeGoals[0];

  // -------------------------------------------------------------------------
  // Advice 1: Monthly Cash Flow vs Total Goal Pace
  // -------------------------------------------------------------------------
  if (estimatedMonthlySurplus >= totalRequiredMonthlyPace && totalRequiredMonthlyPace > 0) {
    advices.push({
      id: 'pace_healthy',
      type: 'success',
      icon: 'TrendingUp',
      title: isAr ? 'فائضك الشهري يغطي أهدافك بالكامل ✦' : 'Your Monthly Surplus Covers All Goals ✦',
      description: isAr
        ? `يقدر فائضك الشهري بنحو ${money(estimatedMonthlySurplus)}، وهو يغطي بالكامل إجمالي وتيرة أهدافك البالغة ${money(totalRequiredMonthlyPace)} شهرياً دون ضغط على نفقاتك الأساسية.`
        : `Your estimated monthly surplus of ${money(estimatedMonthlySurplus)} comfortably covers your combined goal pace of ${money(totalRequiredMonthlyPace)}/month without compromising essential living expenses.`,
      tag: isAr ? 'مسار ممتاز' : 'Healthy Pace',
      tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    });
  } else if (estimatedMonthlySurplus > 0 && estimatedMonthlySurplus < totalRequiredMonthlyPace) {
    const shortfall = totalRequiredMonthlyPace - estimatedMonthlySurplus;
    advices.push({
      id: 'pace_shortfall',
      type: 'warning',
      icon: 'AlertCircle',
      title: isAr ? 'فجوة في وتيرة الادخار المستهدفة' : 'Savings Pace Shortfall Detected',
      description: isAr
        ? `يبلغ العجز التقديري بين وتيرة أهدافك وفائضك الشهري حوالي ${money(shortfall)}. يمكنك تمديد مواعيد أهدافك بمقدار 2 إلى 3 أشهر لتخفيف الوتيرة الشهرية المطلوبة.`
        : `Your combined target pace exceeds your monthly surplus by ${money(shortfall)}. Consider extending deadlines by 2-3 months to keep monthly requirements realistic.`,
      tag: isAr ? 'إعادة ضبط' : 'Pace Adjustment',
      tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    });
  }

  // -------------------------------------------------------------------------
  // Advice 2: Spending Optimization Opportunity (15% Cut on Top Category)
  // -------------------------------------------------------------------------
  const categorySpendMap = {};
  recentTx
    .filter(t => t.type === 'expense' && t.category)
    .forEach(t => {
      const catName = typeof t.category === 'object' ? (t.category.name || 'Other') : 'Other';
      categorySpendMap[catName] = (categorySpendMap[catName] || 0) + (Number(t.amount) || 0);
    });

  const sortedCategories = Object.entries(categorySpendMap)
    .map(([name, amount]) => ({ name, monthlyAmount: Math.round(amount / 2) }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  if (sortedCategories.length > 0 && sortedCategories[0].monthlyAmount >= 1000) {
    const topCat = sortedCategories[0];
    const cutAmount = Math.round(topCat.monthlyAmount * 0.15);

    if (cutAmount >= 200) {
      advices.push({
        id: 'category_trim',
        type: 'insight',
        icon: 'Sparkles',
        title: isAr 
          ? `فرصة تسريع الادخار من فئة (${topCat.name})` 
          : `Acceleration Opportunity in (${topCat.name})`,
        description: isAr
          ? `تقليل نفقات (${topCat.name}) بنسبة 15% فقط سيوفر لك نحو ${money(cutAmount)} شهرياً، مما يساهم بشكل مباشر في تسريع هدفك (${highPriorityGoal.title}).`
          : `Trimming 15% from (${topCat.name}) saves approx ${money(cutAmount)}/month, directly accelerating your goal (${highPriorityGoal.title}).`,
        tag: isAr ? 'توفير فوري' : 'Quick Win',
        tagColor: 'text-[#E8C5A8] bg-[#8D6346]/20 border-[#8D6346]/40'
      });
    }
  }

  // -------------------------------------------------------------------------
  // Advice 3: Emergency Fund Priority Guardrail
  // -------------------------------------------------------------------------
  if (shield) {
    const runway = shield.runwayDurationMonths || 0;
    if (runway < 3) {
      advices.push({
        id: 'emergency_guardrail',
        type: 'caution',
        icon: 'ShieldAlert',
        title: isAr ? 'عزز درع الطوارئ لحماية أهدافك' : 'Fortify Your Emergency Shield',
        description: isAr
          ? `يغطي احتياطي الطوارئ لديك ${runway} شهر فقط. نوصي بتخصيص جزء من مدخراتك لصندوق الطوارئ حتى تصل إلى 3 أشهر، لحماية هدفك (${highPriorityGoal.title}) من السحب الاضطراري.`
          : `Your emergency runway covers ${runway} months. We recommend maintaining at least 3 months of emergency buffer to protect your goal (${highPriorityGoal.title}) from forced liquidation.`,
        tag: isAr ? 'أمان مالي' : 'Capital Protection',
        tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      });
    } else if (runway >= 6) {
      advices.push({
        id: 'fortress_boost',
        type: 'success',
        icon: 'ShieldCheck',
        title: isAr ? 'درع طوارئ حصين — ركّز على أهدافك بأمان' : 'Emergency Fortress Secure — Full Focus on Goals',
        description: isAr
          ? `درع الطوارئ لديك يوفر أماناً لأكثر من 6 أشهر! يمكنك توجيه أي مكافآت أو أرباح إضافية بالكامل إلى أهدافك الاستراتيجية دون تردد.`
          : `Your emergency shield is at Fortress level (6+ months)! Any extra windfalls or income bumps can safely flow 100% into your strategic goals.`,
        tag: isAr ? 'أمان فائق' : 'Fortress Level',
        tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      });
    }
  }

  return advices;
}
