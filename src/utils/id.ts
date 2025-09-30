export function createId(prefix?: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID()
    return prefix ? `${prefix}-${uuid}` : uuid
  }
  const random = Math.random().toString(36).slice(2, 10)
  const timestamp = Date.now().toString(36)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}
