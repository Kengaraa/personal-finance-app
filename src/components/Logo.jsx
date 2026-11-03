import { TrendingUp } from 'lucide-react'

export default function Logo({ className = '', showText = true, size = 'md' }) {
  const box = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className={`${box} grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm`}>
        <TrendingUp className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      {showText && <span className="text-lg font-extrabold tracking-tight">Ledgerly</span>}
    </div>
  )
}
