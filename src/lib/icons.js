import {
  Banknote, Briefcase, Car, Coffee, CreditCard, Dumbbell, Film, Gift, GraduationCap, HeartPulse, Home,
  Landmark, PawPrint, PiggyBank, Plane, Receipt, Shirt, ShoppingCart, Smartphone, Tag, TrendingUp,
  Utensils, Wallet, Zap,
} from 'lucide-react'

export const CATEGORY_ICONS = {
  cart: ShoppingCart,
  food: Utensils,
  home: Home,
  car: Car,
  health: HeartPulse,
  entertainment: Film,
  utilities: Zap,
  education: GraduationCap,
  travel: Plane,
  gift: Gift,
  work: Briefcase,
  cash: Banknote,
  investment: TrendingUp,
  tag: Tag,
  shirt: Shirt,
  phone: Smartphone,
  pets: PawPrint,
  fitness: Dumbbell,
  coffee: Coffee,
  bills: Receipt,
}

export const ACCOUNT_TYPES = {
  checking: { label: 'Checking', icon: Landmark },
  savings: { label: 'Savings', icon: PiggyBank },
  credit_card: { label: 'Credit card', icon: CreditCard },
  cash: { label: 'Cash', icon: Wallet },
  investment: { label: 'Investment', icon: TrendingUp },
}

export const SWATCHES = [
  '#0d9488', '#16a34a', '#2563eb', '#6366f1', '#8b5cf6', '#a855f7',
  '#db2777', '#ef4444', '#f97316', '#eab308', '#0ea5e9', '#64748b',
]

export const CURRENCIES = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['KES', 'Kenyan Shilling'],
  ['NGN', 'Nigerian Naira'], ['ZAR', 'South African Rand'], ['GHS', 'Ghanaian Cedi'],
  ['UGX', 'Ugandan Shilling'], ['TZS', 'Tanzanian Shilling'], ['EGP', 'Egyptian Pound'],
  ['INR', 'Indian Rupee'], ['JPY', 'Japanese Yen'], ['CNY', 'Chinese Yuan'], ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'], ['NZD', 'New Zealand Dollar'], ['CHF', 'Swiss Franc'],
  ['SEK', 'Swedish Krona'], ['NOK', 'Norwegian Krone'], ['DKK', 'Danish Krone'], ['BRL', 'Brazilian Real'],
  ['MXN', 'Mexican Peso'], ['AED', 'UAE Dirham'], ['SAR', 'Saudi Riyal'], ['SGD', 'Singapore Dollar'],
  ['PLN', 'Polish Zloty'], ['TRY', 'Turkish Lira'], ['PHP', 'Philippine Peso'], ['IDR', 'Indonesian Rupiah'],
]
