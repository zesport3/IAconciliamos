import { MovimentoConciliacao, Reconciliacao } from '../types';

export const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatMoeda(val: number | undefined | null, prefix = ''): string {
  if (val === undefined || val === null || isNaN(val)) {
    return prefix ? `${prefix} 0,00` : '0,00';
  }
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return prefix ? `${prefix} ${formatted}` : formatted;
}

export function formatValorComMoeda(
  val: number | undefined | null,
  moeda: string = 'EUR'
): string {
  const formatted = formatMoeda(val);
  return `${formatted} €`;
}

export function getSimboloMoeda(moeda?: string, normativo?: string): string {
  return '€';
}

export function parseNumberSafely(input: any): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  if (!input) return 0;
  // Convert string like "1.250,50" or "1,250.50" or " 1250.50 "
  let str = String(input).trim();
  // Remove currency symbols or extra chars
  str = str.replace(/[^\d.,\-]/g, '');

  if (str.includes(',') && str.includes('.')) {
    // Check if dot or comma is decimal separator
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.250,50 format
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 format
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function calculateTotals(
  saldoExtrato: number,
  tabela1: MovimentoConciliacao[], // Pagamentos no banco não registados na empresa
  tabela2: MovimentoConciliacao[], // Pagamentos RM não registados no banco (Créditos)
  tabela3: MovimentoConciliacao[], // Débitos da empresa não registados no banco
  saldoContabilidade: number
) {
  // B: Débitos no banco não registados (ou tipo !== 'credito')
  // C: Créditos no banco não registados (tipo === 'credito')
  let totalB = 0;
  let totalC = 0;

  for (const item of tabela1) {
    const val = Number(item.valor) || 0;
    if (item.tipo === 'credito') {
      totalC += Math.abs(val);
    } else {
      // Débito por defeito
      totalB += Math.abs(val);
    }
  }

  // D: Créditos da empresa não registados no banco
  let totalD = 0;
  for (const item of tabela2) {
    totalD += Math.abs(Number(item.valor) || 0);
  }

  // E: Débitos da empresa não registados no banco
  let totalE = 0;
  for (const item of tabela3) {
    totalE += Math.abs(Number(item.valor) || 0);
  }

  const A = Number(saldoExtrato) || 0;
  // Fórmula padrão do mapa: Saldo Apurado = A + B - C - D + E
  const saldoApurado = A + totalB - totalC - totalD + totalE;
  const saldoContab = Number(saldoContabilidade) || 0;
  const diferenca = saldoApurado - saldoContab;

  return {
    totalB: Math.round(totalB * 100) / 100,
    totalC: Math.round(totalC * 100) / 100,
    totalD: Math.round(totalD * 100) / 100,
    totalE: Math.round(totalE * 100) / 100,
    saldoApurado: Math.round(saldoApurado * 100) / 100,
    diferencaConciliacao: Math.round(diferenca * 100) / 100,
    isConciliado: Math.abs(diferenca) < 0.009,
  };
}

// Cálculo rigoroso com os 4 campos definidos pelo utilizador:
// 1 - Débito na empresa s/ correspondência no Banco
// 2 - Crédito na Empresa s/ correspondência no Banco
// 3 - Débito no banco s/ correspondência na Empresa
// 4 - Crédito no banco s/ correspondência na Empresa
export function calculate4FieldsTotals(
  saldoExtrato: number,
  campo1: MovimentoConciliacao[] = [], // 1 - Débito na empresa s/ correspondência no Banco
  campo2: MovimentoConciliacao[] = [], // 2 - Crédito na Empresa s/ correspondência no Banco
  campo3: MovimentoConciliacao[] = [], // 3 - Débito no banco s/ correspondência na Empresa
  campo4: MovimentoConciliacao[] = [], // 4 - Crédito no banco s/ correspondência na Empresa
  saldoContabilidade: number
) {
  let total1 = 0;
  for (const item of campo1) total1 += Math.abs(Number(item.valor) || 0);

  let total2 = 0;
  for (const item of campo2) total2 += Math.abs(Number(item.valor) || 0);

  let total3 = 0;
  for (const item of campo3) total3 += Math.abs(Number(item.valor) || 0);

  let total4 = 0;
  for (const item of campo4) total4 += Math.abs(Number(item.valor) || 0);

  const saldoBanco = Number(saldoExtrato) || 0;
  const saldoContab = Number(saldoContabilidade) || 0;

  // Saldo Apurado partindo do Banco até à Contabilidade:
  // Saldo Banco + (1) - (2) + (3) - (4)
  const saldoApurado = saldoBanco + total1 - total2 + total3 - total4;

  // Saldos Ajustados dos dois livros:
  // Saldo Bancário Ajustado = Saldo Banco + (1) - (2)
  const saldoBancarioAjustado = saldoBanco + total1 - total2;
  // Saldo Contabilístico Ajustado = Saldo Contabilidade - (3) + (4)
  const saldoContabilisticoAjustado = saldoContab - total3 + total4;

  const diferenca = saldoApurado - saldoContab;

  return {
    total1: Math.round(total1 * 100) / 100,
    total2: Math.round(total2 * 100) / 100,
    total3: Math.round(total3 * 100) / 100,
    total4: Math.round(total4 * 100) / 100,
    totalCampo1: Math.round(total1 * 100) / 100,
    totalCampo2: Math.round(total2 * 100) / 100,
    totalCampo3: Math.round(total3 * 100) / 100,
    totalCampo4: Math.round(total4 * 100) / 100,
    saldoApurado: Math.round(saldoApurado * 100) / 100,
    saldoBancarioAjustado: Math.round(saldoBancarioAjustado * 100) / 100,
    saldoContabilisticoAjustado: Math.round(saldoContabilisticoAjustado * 100) / 100,
    diferencaConciliacao: Math.round(diferenca * 100) / 100,
    isConciliado: Math.abs(diferenca) < 0.009,
  };
}

export function formatMesIdToLabel(mesId: string): string {
  if (!mesId) return '';
  const parts = mesId.split('-');
  if (parts.length !== 2) return mesId;
  const ano = parts[0];
  const mesIdx = parseInt(parts[1], 10) - 1;
  if (mesIdx >= 0 && mesIdx < 12) {
    return `${MESES_PT[mesIdx]} de ${ano}`;
  }
  return mesId;
}

export function getCurrentMonthId(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthId(mesId: string): string {
  if (!mesId || !mesId.includes('-')) return '';
  const [yearStr, monthStr] = mesId.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getNextMonthId(mesId: string): string {
  if (!mesId || !mesId.includes('-')) return '';
  const [yearStr, monthStr] = mesId.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}
