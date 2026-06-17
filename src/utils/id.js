export function generateId(prefix = 'id') {
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${randomStr}`;
}
