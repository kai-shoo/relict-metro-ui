export function formatPositionLabel(template: string, current: number, total: number): string {
  return template.replaceAll('{current}', String(current)).replaceAll('{total}', String(total));
}
