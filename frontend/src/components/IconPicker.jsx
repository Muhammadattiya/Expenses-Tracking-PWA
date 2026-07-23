import React from 'react';
import * as LucideIcons from 'lucide-react';

const COMMON_ICONS = [
  'Wallet', 'Tag', 'Home', 'ShoppingCart', 'Car', 'Coffee', 'Utensils', 
  'Briefcase', 'GraduationCap', 'HeartPulse', 'Plane', 'Smartphone', 
  'Wifi', 'Zap', 'Gift', 'Scissors', 'Music', 'Monitor', 'Book', 
  'Camera', 'Bus', 'Train', 'Ship', 'ShoppingBag', 'Truck', 'Wrench',
  'Umbrella', 'Trophy', 'Ticket', 'Tent', 'Stethoscope', 'Sofa', 
  'Smile', 'Shirt', 'Shield', 'Landmark', 'PiggyBank', 'Coins', 'CreditCard'
];

const IconPicker = ({ selectedIcon, onSelect, colorClass = "text-white" }) => {
  return (
    <div className="w-full">
      <label className="block text-sm text-[var(--color-text-muted)] mb-2">اختر الأيقونة</label>
      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-black/30 border border-white/10 rounded-xl custom-scrollbar">
        {COMMON_ICONS.map((iconName) => {
          const IconComponent = LucideIcons[iconName];
          if (!IconComponent) return null;
          
          const isSelected = selectedIcon === iconName;
          
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onSelect(iconName)}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                isSelected 
                  ? `bg-white/20 border-white/30 shadow-lg ${colorClass}` 
                  : 'text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text-main)] border border-transparent'
              }`}
            >
              <IconComponent size={24} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const getIconComponent = (iconName, fallback = 'Tag') => {
  return LucideIcons[iconName] || LucideIcons[fallback] || LucideIcons['Tag'];
};

export default IconPicker;
