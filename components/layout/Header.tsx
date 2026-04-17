'use client'

export function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center h-14 px-6 border-b border-gray-200 bg-white shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
    </div>
  )
}
