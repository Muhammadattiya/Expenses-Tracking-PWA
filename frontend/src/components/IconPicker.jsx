import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

const ACCOUNT_ICONS = [
  'Landmark', 'PiggyBank', 'Coins', 'CreditCard', 'Wallet', 'Banknote', 
  'Building', 'Briefcase', 'Bitcoin', 'BadgeDollar', 'CircleDollarSign', 
  'Currency', 'HandCoins', 'Pocket', 'Vault', 'Safebox', 'Receipt', 
  'WalletCards', 'Gem', 'Building2', 'BadgeEuro', 'BadgeCent', 'BadgePound',
  'BadgeRussianRuble', 'BadgeSwissFranc', 'Banknote', 'Calculator', 'CandlestickChart',
  'ChartColumn', 'ChartLine', 'ChartPie', 'CreditCard', 'Diamond', 'HandMetal', 'Nfc',
  'ReceiptText', 'Sack', 'Scale', 'Scroll'
];

const CATEGORY_ICONS = [
  'Tag', 'Home', 'ShoppingCart', 'Car', 'Coffee', 'Utensils', 
  'HeartPulse', 'Plane', 'Smartphone', 'Wifi', 'Zap', 'Gift', 
  'Scissors', 'Music', 'Monitor', 'Book', 'Camera', 'Bus', 
  'Train', 'Ship', 'ShoppingBag', 'Truck', 'Wrench', 'Umbrella', 
  'Trophy', 'Ticket', 'Tent', 'Stethoscope', 'Sofa', 'Smile', 
  'Shirt', 'Shield', 'Briefcase', 'GraduationCap', 'Activity', 'Anchor', 
  'Aperture', 'Archive', 'Armchair', 'Baby', 'BaggageClaim', 'Bandage', 'Bath', 
  'Battery', 'Bed', 'BedDouble', 'Beer', 'Bell', 'BicepsFlexed', 'Bike', 
  'Bone', 'BoomBox', 'Bot', 'Bowling', 'Brain', 'Cake', 'Calendar', 'Camera', 
  'CarTaxiFront', 'Cat', 'Church', 'Cigarette', 'Clapperboard', 'Clipboard', 'Cloud', 
  'Code', 'Compass', 'Computer', 'Cookie', 'Croissant', 'Cross', 'CupSoda', 
  'Database', 'Dog', 'Droplet', 'Dumbbell', 'Egg', 'Fan', 'Film', 'Flame', 
  'FlaskConical', 'Flower', 'Gamepad', 'Gamepad2', 'Gavel', 'Ghost', 'Glasses', 
  'Globe', 'Guitar', 'Hammer', 'Headphones', 'Heart', 'Image', 'Joystick', 'Key', 
  'Laptop', 'Leaf', 'Lightbulb', 'Luggage', 'Map', 'Martini', 'Medal', 'Mic', 
  'Microscope', 'Moon', 'Mountain', 'Mouse', 'Paintbrush', 'Palette', 'Paperclip', 
  'PartyPopper', 'PawPrint', 'Pen', 'Phone', 'Pill', 'Pizza', 'Plug', 'Printer', 
  'Puzzle', 'Radio', 'RollerCoaster', 'Router', 'Scissors', 'ScreenShare', 'Search', 
  'Server', 'Settings', 'ShieldAlert', 'ShieldCheck', 'Skull', 'Slice', 'Snowflake', 
  'Speaker', 'Spoon', 'Star', 'Sun', 'Sword', 'Syringe', 'Tablet', 'Target', 
  'Telescope', 'Terminal', 'Thermometer', 'Tool', 'TrainFront', 'Trash', 'Trees', 
  'Trophy', 'Tv', 'Umbrella', 'UtensilsCrossed', 'Video', 'Volleyball', 'Watch', 
  'Webcam', 'Wine', 'Wrench'
];

const ACCOUNT_COLORS = [
  '#ef4444', // red
  '#000000', // black
  '#ffffff', // white
  '#22c55e', // green
  '#3b82f6', // blue
];

const ALL_COLORS = [
  '#f8fafc', '#e2e8f0', '#94a3b8', '#475569', '#0f172a',
  '#000000', '#ffffff', '#ff0000', '#0000ff',
  '#fef2f2', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d',
  '#fff7ed', '#fdba74', '#f97316', '#c2410c', '#7c2d12',
  '#fffbeb', '#fcd34d', '#f59e0b', '#b45309', '#78350f',
  '#fefce8', '#fde047', '#eab308', '#a16207', '#713f12',
  '#f7fee7', '#bef264', '#84cc16', '#4d7c0f', '#3f6212',
  '#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d',
  '#ecfdf5', '#6ee7b7', '#10b981', '#047857', '#064e3b',
  '#f0fdfa', '#5eead4', '#14b8a6', '#0f766e', '#134e4a',
  '#ecfeff', '#67e8f9', '#06b6d4', '#0e7490', '#164e63',
  '#f0f9ff', '#7dd3fc', '#0ea5e9', '#0369a1', '#0c4a6e',
  '#eff6ff', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a',
  '#eef2ff', '#a5b4fc', '#6366f1', '#4338ca', '#312e81',
  '#f5f3ff', '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95',
  '#faf5ff', '#d8b4fe', '#a855f7', '#7e22ce', '#581c87',
  '#fdf4ff', '#f0abfc', '#d946ef', '#a21caf', '#701a75',
  '#fdf2f8', '#f9a8d4', '#ec4899', '#be185d', '#831843',
  '#fff1f2', '#fda4af', '#f43f5e', '#be123c', '#881337',
];

const IconPicker = ({ selectedIcon, onSelect, type = 'category', colorClass = "text-white", selectedColor, onColorSelect }) => {
  const iconsList = type === 'account' ? ACCOUNT_ICONS : CATEGORY_ICONS;
  const [showPicker, setShowPicker] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  return (
    <div className="w-full space-y-4">
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">اختر الأيقونة</label>
        <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-black/30 border border-white/10 rounded-xl custom-scrollbar">
        {Array.from(new Set(iconsList)).map((iconName) => {
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
                  ? `bg-white/20 border-white/30 shadow-lg ${type !== 'account' ? colorClass : ''}` 
                  : 'text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text-main)] border border-transparent'
              }`}
              style={isSelected && type === 'account' && selectedColor ? { color: selectedColor } : {}}
            >
              <IconComponent size={24} />
            </button>
          );
        })}
        </div>
      </div>
      
      {type === 'account' && onColorSelect && (
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">اختر اللون</label>
          <div className="flex flex-wrap items-center gap-2 p-2 bg-black/30 border border-white/10 rounded-xl">
            {ACCOUNT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => onColorSelect(color)}
                style={{ backgroundColor: color }}
                className={`w-8 h-8 rounded-full transition-transform ${
                  selectedColor === color 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121214] scale-110 shadow-lg' 
                    : 'hover:scale-110 border border-white/20 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
            
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
              >
                More colors
              </button>
              
              {showPicker && (
                <div className="absolute z-[200] right-0 bottom-full mb-2 bg-black/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl animate-fade-in origin-bottom-right w-64 max-h-56 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-5 gap-2">
                    {ALL_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          onColorSelect(color);
                          setShowPicker(false);
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          selectedColor === color 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121214] scale-110 shadow-lg' 
                            : 'hover:scale-110 border border-white/20 opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const getIconComponent = (iconName, fallback = 'Tag') => {
  return LucideIcons[iconName] || LucideIcons[fallback] || LucideIcons['Tag'];
};

export default IconPicker;
