'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Si es false, el modal no se cierra con click en el overlay ni con Escape (solo con la X). */
  dismissable?: boolean
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

export function Modal({ open, onClose, title, children, size = 'md', dismissable = true }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  // El click solo cuenta como "click en el overlay" si el gesto EMPEZÓ ahí.
  // Sin esto el modal se cerraba en gestos que nacen dentro: soltar el mouse
  // fuera al seleccionar texto de un campo, o el click que el menú
  // contextual del navegador deja caer sobre el overlay al elegir "Pegar".
  const pressedOverlay = useRef(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && dismissable) onClose() }
    if (open) { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose, dismissable])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { pressedOverlay.current = e.button === 0 && e.target === overlayRef.current }}
      onClick={(e) => {
        const fromOverlay = pressedOverlay.current
        pressedOverlay.current = false
        if (dismissable && fromOverlay && e.target === overlayRef.current) onClose()
      }}
    >
      <div className={clsx('bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh]', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
