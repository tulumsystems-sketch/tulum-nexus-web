export function parseCantidad(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  const texto = String(raw ?? '').trim().replace(/\s/g, '');
  if (!texto) return 0;

  if (texto.includes(',') && texto.includes('.')) {
    const ultimaComa = texto.lastIndexOf(',');
    const ultimoPunto = texto.lastIndexOf('.');
    if (ultimaComa > ultimoPunto) {
      return Number(texto.replace(/\./g, '').replace(',', '.'));
    }
    return Number(texto.replace(/,/g, ''));
  }

  return Number(texto.replace(',', '.'));
}

export function formatCantidad(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

/** Texto para inputs: 5,83 — sin separador de miles, para no romper el parseo al editar. */
export function formatCantidadInput(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return '';
  return String(n).replace('.', ',');
}
