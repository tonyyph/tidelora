export function formatWeight(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000).toLocaleString('vi-VN')} g`;
  return `${kg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`;
}

export function formatDepth(m: number): string {
  return `${m.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m`;
}
