import { cleanupDb } from './helpers'

/** Borra todos los datos creados por los tests (venues e2e-* y su cascada). */
export default async function globalTeardown() {
  try {
    cleanupDb()
    console.log('Limpieza E2E: venues e2e-* eliminados de la BD local')
  } catch {
    console.warn(
      'Aviso: no se pudo limpiar la BD local. Borra a mano con:\n' +
      '  docker exec vipbooster_db psql -U vipbooster -d vipbooster_dev ' +
      '-c "DELETE FROM venues WHERE slug LIKE \'e2e-%\';"',
    )
  }
}
