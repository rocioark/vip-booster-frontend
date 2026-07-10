import { useEffect, useState } from 'react'

/**
 * Devuelve el valor solo después de que deje de cambiar durante `delay` ms.
 * Útil para inputs de búsqueda que disparan requests al servidor.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
