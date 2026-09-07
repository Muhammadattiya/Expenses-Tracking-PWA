import re

with open("frontend/src/pages/AddTransaction.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# We want to replace the second return block.
# Let's find: `  return (\n    <div className="p-4 pt-8 animate-fade-in">`
start_marker = '  return (\n    <div className="p-4 pt-8 animate-fade-in">'

start_index = content.find(start_marker)

if start_index == -1:
    print("Could not find start marker!")
    exit(1)

# we want to replace from start_index until the end of the file, except the closing `}\n` and CalculatorModal
# Wait, let's just replace from start_index to the end of the return statement.
end_marker = '    </div>\n  );\n}\n'
end_index = content.find(end_marker, start_index)

if end_index == -1:
    print("Could not find end marker!")
    # maybe it's just '  );\n}'
    end_index = content.rfind('  );\n}')
    if end_index == -1:
        print("Still couldn't find end marker")
        exit(1)

new_return = """  return (
    <div className="pt-6 h-full flex flex-col animate-fade-in overflow-hidden relative z-0">
      {/* Dashboard Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      {/* Segmented Control */}
      <div className="px-6 shrink-0 mb-4">
        <div className="flex bg-[#3D3B3C]/80 backdrop-blur-md p-1 rounded-[1.5rem] shadow-inner">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 rounded-2xl text-[14px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-[#FF5555] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]' : 'text-white/60 hover:text-white'}`}
          >
            {t('addTransaction.expense', 'مصروف')}
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 rounded-2xl text-[14px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'income' ? 'bg-[#4A4A4A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]' : 'text-white/60 hover:text-white'}`}
          >
            {t('addTransaction.income', 'دخل')}
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex-1 py-2 rounded-2xl text-[14px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'transfer' ? 'bg-[#4A4A4A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]' : 'text-white/60 hover:text-white'}`}
          >
            {t('addTransaction.transfer', 'تحويل')}
          </button>
        </div>
      </div>

      {/* Main Container - matching Figma's rounded top box */}
      <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-t-[40px] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] pt-8 flex flex-col overflow-y-auto">
        
        {/* Massive Amount Input */}
        <div className="flex flex-col items-center justify-center shrink-0 mb-6">
          <label className="text-[14px] font-bold text-white/80 mb-2">{t('addTransaction.amount', 'المبلغ')}</label>
          <div className="flex items-center justify-center gap-2 relative w-full">
            <span className={`w-3 h-3 rounded-full ${type === 'expense' ? 'bg-[#FF5555]' : type === 'income' ? 'bg-[#34C759]' : 'bg-[#8D6346]'}`}></span>
            <input
              type="number"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-transparent text-center text-[64px] font-bold text-white focus:outline-none w-[auto] min-w-[50px] max-w-[200px] placeholder-white/30 tracking-tight leading-none"
              style={{ caretColor: type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#8D6346' }}
            />
            <span className="text-[28px] text-white/90 font-bold self-end mb-2">{t('nav.currency', 'EGP')}</span>
          </div>
          <div className="w-[80%] max-w-[280px] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mt-6" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 pb-28">
          {/* Date Segmented Control */}
          <div className="shrink-0">
            <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.date', 'التاريخ')}</label>
            <div className="flex bg-[#707070]/30 border border-white/5 p-1 rounded-full shadow-inner">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${isToday ? 'bg-[#FF5555] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
              >
                {t('addTransaction.today', 'اليوم')}
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayStr)}
                className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${isYesterday ? 'bg-[#5a5a5a]/80 text-white shadow-md' : 'text-white/60 hover:text-white'}`}
              >
                {t('addTransaction.yesterday', 'أمس')}
              </button>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${isCustom ? 'bg-[#5a5a5a]/80 text-white shadow-md' : 'text-white/60 hover:text-white'}`}
              >
                {isCustom ? date : t('addTransaction.customDate', 'تاريخ')}
              </button>
            </div>
          </div>

          <div className="shrink-0">
            <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.description', 'الوصف')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('addTransaction.descPlaceholder', 'مثال: غداء، تحويل لكاش...')}
              className="w-full bg-[#707070]/30 border border-white/5 rounded-[1.2rem] p-3.5 px-5 text-[15px] font-medium text-white placeholder-white/40 focus:outline-none focus:border-[#8D6346] focus:bg-[#707070]/40 transition-all shadow-inner"
            />
          </div>

          {type === 'transfer' ? (
            <div className="flex gap-3 shrink-0">
              <div className="flex-1">
                <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.fromAccount', 'من حساب')}</label>
                <CustomSelect
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.fromAccountPlaceholder', 'اختر...')}
                  buttonClassName="w-full bg-[#707070]/30 border border-white/5 rounded-[1.2rem] p-3.5 px-5 text-[15px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.toAccount', 'إلى حساب')}</label>
                <CustomSelect
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.toAccountPlaceholder', 'اختر...')}
                  buttonClassName="w-full bg-[#707070]/30 border border-white/5 rounded-[1.2rem] p-3.5 px-5 text-[15px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3 shrink-0">
              <div className="flex-1">
                <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.account', 'الحساب')}</label>
                <CustomSelect
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.accountPlaceholder', 'اختر...')}
                  buttonClassName="w-full bg-[#707070]/30 border border-white/5 rounded-[1.2rem] p-3.5 px-5 text-[15px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner"
                />
              </div>

              <div className="flex-1">
                <label className="block text-[14px] font-bold text-white/80 mb-2 ml-2">{t('addTransaction.category', 'الفئة')}</label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={categories[type].map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon }))}
                  placeholder={t('addTransaction.categoryPlaceholder', 'اختر...')}
                  buttonClassName="w-full bg-[#707070]/30 border border-white/5 rounded-[1.2rem] p-3.5 px-5 text-[15px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner"
                />
              </div>
            </div>
          )}

          {/* Recurring Settings */}
          <div className="pt-2 pb-2 shrink-0">
            {recurringSettings.repeatType === 'never' ? (
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 border border-dashed border-white/20 rounded-full bg-transparent hover:bg-white/5 transition-all duration-300"
              >
                <Repeat className="w-5 h-5 text-white/60" />
                <span className="text-[14px] font-bold text-white/80">{t('recurring.addBtn', 'معاملة متكررة')}</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-between p-3.5 border border-dashed border-[#8D6346]/80 rounded-full bg-[#8D6346]/20 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <Repeat className="w-5 h-5 text-[#8D6346]" />
                  <div>
                    <h4 className="text-[14px] font-bold text-[#8D6346] leading-tight">{t('recurring.settings', 'إعدادات التكرار')}</h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-4 py-1.5 bg-[#8D6346] hover:bg-[#734e35] rounded-full text-xs font-bold text-white transition-colors"
                >
                  {t('recurring.edit', 'تعديل')}
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 shrink-0">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.2rem] font-bold text-[16px] text-white shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-95 bg-[#707070] hover:bg-[#5a5a5a]"
              >
                {t('addTransaction.submit', 'تأكيد وحفظ')}
              </button>
          </div>
        </form>
      </div>

      {isDatePickerOpen && (
        <CustomDatePicker
          value={date}
          onChange={setDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {isRecurringModalOpen && (
        <RecurringModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          settings={recurringSettings}
          onSave={setRecurringSettings}
        />
      )}

      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        initialValue={amount}
        onSave={setAmount}
      />
    </div>
"""

new_content = content[:start_index] + new_return + content[end_index:]
with open("frontend/src/pages/AddTransaction.jsx", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Replaced successfully!")
