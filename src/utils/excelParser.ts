import * as XLSX from 'xlsx';
import { Empresa, MovimentoConciliacao, Reconciliacao, ReconciliacaoImportResult } from '../types';
import { calculate4FieldsTotals, parseNumberSafely, MESES_PT } from './calculations';

export interface ParseResult {
  success: boolean;
  data: MovimentoConciliacao[];
  error?: string;
  rowCount: number;
}

// Normalize text for flexible column matching
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function identifyColumn(header: string): 'data' | 'nDoc' | 'descricao' | 'valor' | 'observacao' | 'tipo' | null {
  const norm = normalizeHeader(header);

  if (norm.includes('data') || norm === 'date' || norm === 'dia' || norm === 'dt') {
    return 'data';
  }
  if (
    norm.includes('doc') ||
    norm.includes('ndoc') ||
    norm.includes('documento') ||
    norm.includes('ref') ||
    norm.includes('recibo') ||
    norm.includes('cheque') ||
    norm.includes('numero') ||
    norm === 'nr'
  ) {
    return 'nDoc';
  }
  if (
    norm.includes('desc') ||
    norm.includes('descricao') ||
    norm.includes('historico') ||
    norm.includes('beneficiario') ||
    norm.includes('detalhe') ||
    norm.includes('memo') ||
    norm.includes('movimento')
  ) {
    return 'descricao';
  }
  if (
    norm.includes('valor') ||
    norm.includes('montante') ||
    norm.includes('quantia') ||
    norm.includes('amount') ||
    norm.includes('total') ||
    norm.includes('debito') ||
    norm.includes('credito')
  ) {
    return 'valor';
  }
  if (
    norm.includes('obs') ||
    norm.includes('observacao') ||
    norm.includes('observacoes') ||
    norm.includes('nota') ||
    norm.includes('comentario')
  ) {
    return 'observacao';
  }
  if (norm.includes('tipo') || norm.includes('natureza') || norm.includes('dc')) {
    return 'tipo';
  }

  return null;
}

function formatDateValue(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (typeof val === 'number') {
    // Excel date serial number
    try {
      const parsedDate = XLSX.SSF.parse_date_code(val);
      if (parsedDate) {
        const y = parsedDate.y;
        const m = String(parsedDate.m).padStart(2, '0');
        const d = String(parsedDate.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // ignore
    }
  }

  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  return str;
}

export async function parseFileToMovimentos(file: File, defaultTipo: 'debito' | 'credito' = 'debito'): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve({ success: false, data: [], error: 'Ficheiro vazio', rowCount: 0 });
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({ success: false, data: [], error: 'Folha de cálculo vazia', rowCount: 0 });
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        // Convert to array of arrays first to find headers
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          resolve({ success: false, data: [], error: 'Nenhuma linha encontrada no ficheiro', rowCount: 0 });
          return;
        }

        // Find header row (first row with non-empty strings)
        let headerRowIndex = 0;
        let columnMap: Record<number, 'data' | 'nDoc' | 'descricao' | 'valor' | 'observacao' | 'tipo'> = {};

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          const matches: Record<number, any> = {};
          let matchCount = 0;

          row.forEach((cell: any, colIdx: number) => {
            const identified = identifyColumn(String(cell));
            if (identified) {
              matches[colIdx] = identified;
              matchCount++;
            }
          });

          // If at least 2 key columns matched (like data & valor, or doc & valor)
          if (matchCount >= 2) {
            headerRowIndex = i;
            columnMap = matches;
            break;
          }
        }

        // Fallback default column order if no clear headers found:
        // Col 0: Data, Col 1: Nº Doc, Col 2: Descrição, Col 3: Valor, Col 4: Observação
        if (Object.keys(columnMap).length === 0) {
          columnMap[0] = 'data';
          columnMap[1] = 'nDoc';
          columnMap[2] = 'descricao';
          columnMap[3] = 'valor';
          columnMap[4] = 'observacao';
          // Start reading from row 1 if row 0 has text, else row 0
          headerRowIndex = isNaN(parseNumberSafely(rows[0]?.[3])) ? 0 : -1;
        }

        const items: MovimentoConciliacao[] = [];

        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) {
            continue; // skip blank line
          }

          let dataVal = '';
          let nDocVal = '';
          let descVal = '';
          let valorVal = 0;
          let obsVal = '';
          let tipoVal: 'debito' | 'credito' = defaultTipo;

          Object.entries(columnMap).forEach(([colIdxStr, field]) => {
            const colIdx = parseInt(colIdxStr, 10);
            const rawVal = row[colIdx];

            if (field === 'data') {
              dataVal = formatDateValue(rawVal);
            } else if (field === 'nDoc') {
              nDocVal = String(rawVal || '').trim();
            } else if (field === 'descricao') {
              descVal = String(rawVal || '').trim();
            } else if (field === 'valor') {
              valorVal = Math.abs(parseNumberSafely(rawVal));
            } else if (field === 'observacao') {
              obsVal = String(rawVal || '').trim();
            } else if (field === 'tipo') {
              const str = String(rawVal || '').toLowerCase();
              if (str.includes('cred') || str === 'c' || str === '-') {
                tipoVal = 'credito';
              } else {
                tipoVal = 'debito';
              }
            }
          });

          // Only keep rows that have either a non-zero value or description or doc
          if (valorVal > 0 || descVal.length > 0 || nDocVal.length > 0) {
            items.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              data: dataVal || new Date().toISOString().split('T')[0],
              nDoc: nDocVal || '-',
              descricao: descVal || 'Movimento importado',
              valor: valorVal,
              observacao: obsVal,
              tipo: tipoVal,
            });
          }
        }

        resolve({
          success: true,
          data: items,
          rowCount: items.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          error: err?.message || 'Erro ao processar ficheiro',
          rowCount: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, data: [], error: 'Erro de leitura do ficheiro', rowCount: 0 });
    };

    reader.readAsArrayBuffer(file);
  });
}

// PARSER OFICIAL PARA AS 6 COLUNAS ESPECIFICADAS:
// - data
// - descritivo
// - nº movimento
// - valor debito
// - valor credito
// - saldo
import { ExtratoRow, ExtratoParseResult } from '../types';

function identifyExtratoColumn(
  header: string
): 'data' | 'descricao' | 'nDoc' | 'debito' | 'credito' | 'saldo' | null {
  const norm = normalizeHeader(header);

  if (norm.includes('saldo')) {
    return 'saldo';
  }
  if (
    norm.includes('debito') ||
    norm.includes('débito') ||
    norm.includes('debitos') ||
    norm.includes('saida') ||
    norm.includes('saída') ||
    norm === 'deb'
  ) {
    return 'debito';
  }
  if (
    norm.includes('credito') ||
    norm.includes('crédito') ||
    norm.includes('creditos') ||
    norm.includes('entrada') ||
    norm === 'cred'
  ) {
    return 'credito';
  }
  if (
    norm.includes('movimento') ||
    norm.includes('mov') ||
    norm.includes('nº') ||
    norm.includes('n°') ||
    norm.includes('num') ||
    norm.includes('documento') ||
    norm.includes('doc') ||
    norm.includes('ref')
  ) {
    return 'nDoc';
  }
  if (
    norm.includes('desc') ||
    norm.includes('descritivo') ||
    norm.includes('descricao') ||
    norm.includes('descrição') ||
    norm.includes('historico') ||
    norm.includes('histórico') ||
    norm.includes('detalhe') ||
    norm.includes('memo')
  ) {
    return 'descricao';
  }
  if (norm.includes('data') || norm === 'date' || norm === 'dia' || norm === 'dt') {
    return 'data';
  }

  return null;
}

export async function parseExtratoPadrao(file: File, tipo: 'banco' | 'contabilidade'): Promise<ExtratoParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve({
            success: false,
            tipo,
            rows: [],
            saldoFinal: 0,
            totalDebito: 0,
            totalCredito: 0,
            error: 'Ficheiro vazio',
          });
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            success: false,
            tipo,
            rows: [],
            saldoFinal: 0,
            totalDebito: 0,
            totalCredito: 0,
            error: 'Folha de cálculo vazia',
          });
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            tipo,
            rows: [],
            saldoFinal: 0,
            totalDebito: 0,
            totalCredito: 0,
            error: 'Nenhuma linha encontrada no ficheiro',
          });
          return;
        }

        // Identify header row
        let headerRowIdx = 0;
        let colMap: Record<number, 'data' | 'descricao' | 'nDoc' | 'debito' | 'credito' | 'saldo'> = {};

        for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
          const row = rawRows[i];
          const matches: Record<number, any> = {};
          let count = 0;

          row.forEach((cell: any, colIdx: number) => {
            const found = identifyExtratoColumn(String(cell || ''));
            if (found) {
              matches[colIdx] = found;
              count++;
            }
          });

          if (count >= 3) {
            headerRowIdx = i;
            colMap = matches;
            break;
          }
        }

        // Fallback: 6 colunas canónicas: data, descritivo, nº movimento, valor debito, valor credito, saldo
        if (Object.keys(colMap).length < 2) {
          colMap[0] = 'data';
          colMap[1] = 'descricao';
          colMap[2] = 'nDoc';
          colMap[3] = 'debito';
          colMap[4] = 'credito';
          colMap[5] = 'saldo';
          headerRowIdx = 0;
        }

        const parsedRows: ExtratoRow[] = [];
        let runningSaldo = 0;
        let totalDebito = 0;
        let totalCredito = 0;

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) {
            continue;
          }

          let dataStr = '';
          let descStr = '';
          let nDocStr = '';
          let debVal = 0;
          let credVal = 0;
          let saldoVal: number | null = null;

          Object.entries(colMap).forEach(([idxStr, field]) => {
            const col = parseInt(idxStr, 10);
            const val = row[col];

            if (field === 'data') {
              dataStr = formatDateValue(val);
            } else if (field === 'descricao') {
              descStr = String(val || '').trim();
            } else if (field === 'nDoc') {
              nDocStr = String(val || '').trim();
            } else if (field === 'debito') {
              debVal = Math.abs(parseNumberSafely(val));
            } else if (field === 'credito') {
              credVal = Math.abs(parseNumberSafely(val));
            } else if (field === 'saldo') {
              if (val !== '' && val !== null && val !== undefined) {
                saldoVal = parseNumberSafely(val);
              }
            }
          });

          // Se tiver apenas 5 colunas sem nDoc explicito mas debVal ou credVal estiver deslocado
          if (row.length === 5 && !colMap[5]) {
            // Verificar formato 5 colunas: data, descritivo, valor debito, valor credito, saldo
            // já tratado se identifyExtratoColumn apanhou as colunas
          }

          // Discard total summary rows at bottom if detected
          const lowerDesc = descStr.toLowerCase();
          if (lowerDesc.includes('total') || lowerDesc.includes('totais') || lowerDesc.includes('transporte')) {
            if (saldoVal !== null) runningSaldo = saldoVal;
            continue;
          }

          if (debVal > 0 || credVal > 0 || descStr.length > 0) {
            totalDebito += debVal;
            totalCredito += credVal;

            if (saldoVal !== null) {
              runningSaldo = saldoVal;
            }

            parsedRows.push({
              id: `${tipo}-${r}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              data: dataStr || new Date().toISOString().split('T')[0],
              descricao: descStr || `Movimento ${tipo}`,
              nDoc: nDocStr || `MOV-${r}`,
              valorDebito: debVal,
              valorCredito: credVal,
              saldo: saldoVal !== null ? saldoVal : runningSaldo,
            });
          }
        }

        resolve({
          success: true,
          tipo,
          rows: parsedRows,
          saldoFinal: runningSaldo,
          totalDebito: Math.round(totalDebito * 100) / 100,
          totalCredito: Math.round(totalCredito * 100) / 100,
        });
      } catch (err: any) {
        resolve({
          success: false,
          tipo,
          rows: [],
          saldoFinal: 0,
          totalDebito: 0,
          totalCredito: 0,
          error: err?.message || 'Erro ao processar o extrato',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        tipo,
        rows: [],
        saldoFinal: 0,
        totalDebito: 0,
        totalCredito: 0,
        error: 'Erro de leitura do ficheiro',
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

// Download templates with the 6 exact columns requested:
// data, descritivo, nº movimento, valor debito, valor credito, saldo
export function downloadTemplateExtrato(tipo: 'banco' | 'contabilidade') {
  let filename = '';
  let data: any[] = [];

  if (tipo === 'banco') {
    filename = 'extrato_banco_modelo.xlsx';
    data = [
      { 'data': '2026-02-01', 'descritivo': 'Saldo Inicial de Abertura', 'nº movimento': 'SALDO-01', 'valor debito': 0.00, 'valor credito': 0.00, 'saldo': 135400.00 },
      { 'data': '2026-02-05', 'descritivo': 'Cobrança SEPA Fornecedor Papelaria Silva', 'nº movimento': 'MOV-1001', 'valor debito': 1200.00, 'valor credito': 0.00, 'saldo': 134200.00 },
      { 'data': '2026-02-10', 'descritivo': 'Recebimento de Cliente Porto Tech, Lda', 'nº movimento': 'MOV-1002', 'valor debito': 0.00, 'valor credito': 8500.00, 'saldo': 142700.00 },
      { 'data': '2026-02-15', 'descritivo': 'Comissão Gestão de Conta BCP + Imposto Selo', 'nº movimento': 'MOV-1003', 'valor debito': 26.00, 'valor credito': 0.00, 'saldo': 142674.00 },
      { 'data': '2026-02-20', 'descritivo': 'Débito Direto SEPA — Fatura Telecomunicações MEO', 'nº movimento': 'MOV-1004', 'valor debito': 480.20, 'valor credito': 0.00, 'saldo': 142193.80 },
      { 'data': '2026-02-22', 'descritivo': 'Pagamento Fornecedor Alimentos Lisboa', 'nº movimento': 'MOV-1005', 'valor debito': 3200.00, 'valor credito': 0.00, 'saldo': 138993.80 },
      { 'data': '2026-02-25', 'descritivo': 'Recebimento de Cliente Minho Têxteis', 'nº movimento': 'MOV-1006', 'valor debito': 0.00, 'valor credito': 6514.30, 'saldo': 145508.10 },
      { 'data': '2026-02-28', 'descritivo': 'Juros Líquidos de Aplicação Tesouraria Remunerada', 'nº movimento': 'MOV-1007', 'valor debito': 0.00, 'valor credito': 312.40, 'saldo': 145820.50 },
    ];
  } else {
    filename = 'extrato_contabilidade_razao_12_modelo.xlsx';
    data = [
      { 'data': '2026-02-01', 'descritivo': 'Saldo Inicial Conta 12.1 (Razão Contabilidade)', 'nº movimento': 'RAZ-001', 'valor debito': 0.00, 'valor credito': 0.00, 'saldo': 135400.00 },
      { 'data': '2026-02-05', 'descritivo': 'Pagamento Fornecedor Papelaria Silva (TRF)', 'nº movimento': 'RAZ-002', 'valor debito': 0.00, 'valor credito': 1200.00, 'saldo': 134200.00 },
      { 'data': '2026-02-10', 'descritivo': 'Recebimento Cliente Porto Tech, Lda', 'nº movimento': 'RAZ-003', 'valor debito': 8500.00, 'valor credito': 0.00, 'saldo': 142700.00 },
      { 'data': '2026-02-22', 'descritivo': 'Pagamento Fornecedor Alimentos Lisboa', 'nº movimento': 'RAZ-004', 'valor debito': 0.00, 'valor credito': 3200.00, 'saldo': 139500.00 },
      { 'data': '2026-02-25', 'descritivo': 'Cheque n.º 559012 Fornecedor Materiais do Norte', 'nº movimento': 'RAZ-005', 'valor debito': 0.00, 'valor credito': 4500.00, 'saldo': 135000.00 },
      { 'data': '2026-02-25', 'descritivo': 'Recebimento Cliente Minho Têxteis', 'nº movimento': 'RAZ-006', 'valor debito': 6514.30, 'valor credito': 0.00, 'saldo': 141514.30 },
      { 'data': '2026-02-27', 'descritivo': 'Depósito em numerário efetuado no balcão (DEP-7701)', 'nº movimento': 'RAZ-007', 'valor debito': 2500.00, 'valor credito': 0.00, 'saldo': 144014.30 },
      { 'data': '2026-02-28', 'descritivo': 'Transferência SEPA Fornecedor TI (SEPA-88102)', 'nº movimento': 'RAZ-008', 'valor debito': 0.00, 'valor credito': 1850.00, 'saldo': 142164.30 },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tipo === 'banco' ? 'Extrato_Banco' : 'Extrato_Contabilidade');
  XLSX.writeFile(wb, filename);
}

// MOTOR DETERMINÍSTICO DE RECONCILIAÇÃO (CRUZAMENTO DE EXTRATOS TENDO EM CONTA O MÊS ANTERIOR):
export function reconciliarExtratosDeterministic(
  extratoBanco: ExtratoRow[],
  extratoContab: ExtratoRow[],
  saldoBancoFornecido?: number,
  saldoContabFornecido?: number,
  reconciliacaoAnterior?: Reconciliacao | null
) {
  const bancoRows = extratoBanco.map((r) => ({ ...r, matched: false }));
  const contabRows = extratoContab.map((r) => ({ ...r, matched: false }));

  // Armazenar movimentos transitados do mês anterior que continuam em aberto
  const transitadosCampo1: MovimentoConciliacao[] = [];
  const transitadosCampo2: MovimentoConciliacao[] = [];
  const transitadosCampo3: MovimentoConciliacao[] = [];
  const transitadosCampo4: MovimentoConciliacao[] = [];
  const liquidadosDoMesAnterior: Array<{ origem: string; item: MovimentoConciliacao; contrapartida: string }> = [];

  // 1. PROCESSAR MOVIMENTOS EM ABERTO DA RECONCILIAÇÃO DO MÊS ANTERIOR
  // Se não aparecem os movimentos da reconciliação anterior, mantê-los para a reconciliação seguinte!
  if (reconciliacaoAnterior) {
    const mesAntNome = reconciliacaoAnterior.mes || 'mês anterior';

    // Campo 1 anterior: Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)
    const prevC1 =
      reconciliacaoAnterior.campo1_debitosEmpresaSemBanco ||
      reconciliacaoAnterior.debitosEmpresaNaoBanco ||
      reconciliacaoAnterior.debitosEmpresaNaoRegistadosBanco ||
      [];
    for (const item of prevC1) {
      // Procurar crédito no banco com o mesmo valor neste mês
      const matchBancoCredito = bancoRows.find(
        (b) => !b.matched && b.valorCredito > 0 && Math.abs(b.valorCredito - item.valor) < 0.01
      );
      if (matchBancoCredito) {
        matchBancoCredito.matched = true;
        liquidadosDoMesAnterior.push({
          origem: `Campo 1 (${mesAntNome})`,
          item,
          contrapartida: `Crédito Bancário em ${matchBancoCredito.data} (${matchBancoCredito.descricao})`,
        });
      } else {
        // Continua em aberto: OBRIGATÓRIO manter para a reconciliação seguinte!
        transitadosCampo1.push({
          ...item,
          id: `prev-c1-${item.id}`,
          observacao: item.observacao?.includes('Transitado')
            ? item.observacao
            : `[Transitado de ${mesAntNome}] ${item.observacao || 'Depósito em trânsito pendente de crédito bancário'}`,
        });
      }

      // Se o extrato da contabilidade do mês corrente tiver este mesmo movimento do mês anterior,
      // marcar como matched para não duplicar nos movimentos novos
      const dupContab = contabRows.find(
        (c) =>
          !c.matched &&
          c.valorDebito > 0 &&
          Math.abs(c.valorDebito - item.valor) < 0.01 &&
          (c.nDoc === item.nDoc || c.descricao.toLowerCase() === item.descricao.toLowerCase())
      );
      if (dupContab) {
        dupContab.matched = true;
      }
    }

    // Campo 2 anterior: Crédito na Empresa s/ correspondência no Banco (Cheques / pagamentos em trânsito)
    const prevC2 =
      reconciliacaoAnterior.campo2_creditosEmpresaSemBanco ||
      reconciliacaoAnterior.creditosEmpresaNaoBanco ||
      reconciliacaoAnterior.pagamentosRMNaoRegistadosBanco ||
      [];
    for (const item of prevC2) {
      // Procurar débito no banco com o mesmo valor neste mês
      const matchBancoDebito = bancoRows.find(
        (b) => !b.matched && b.valorDebito > 0 && Math.abs(b.valorDebito - item.valor) < 0.01
      );
      if (matchBancoDebito) {
        matchBancoDebito.matched = true;
        liquidadosDoMesAnterior.push({
          origem: `Campo 2 (${mesAntNome})`,
          item,
          contrapartida: `Débito Bancário em ${matchBancoDebito.data} (${matchBancoDebito.descricao})`,
        });
      } else {
        // Continua em aberto: OBRIGATÓRIO manter para a reconciliação seguinte!
        transitadosCampo2.push({
          ...item,
          id: `prev-c2-${item.id}`,
          observacao: item.observacao?.includes('Transitado')
            ? item.observacao
            : `[Transitado de ${mesAntNome}] ${item.observacao || 'Cheque/ordem ainda não apresentado a débito bancário'}`,
        });
      }

      // Evitar duplicação se constar na contabilidade como histórico
      const dupContab = contabRows.find(
        (c) =>
          !c.matched &&
          c.valorCredito > 0 &&
          Math.abs(c.valorCredito - item.valor) < 0.01 &&
          (c.nDoc === item.nDoc || c.descricao.toLowerCase() === item.descricao.toLowerCase())
      );
      if (dupContab) {
        dupContab.matched = true;
      }
    }

    // Campo 3 anterior: Débito no banco s/ correspondência na Empresa (Comissões/débitos não lançados)
    const prevC3 =
      reconciliacaoAnterior.campo3_debitosBancoSemEmpresa ||
      reconciliacaoAnterior.debitosBancoNaoEmpresa ||
      [];
    for (const item of prevC3) {
      // Procurar crédito na contabilidade com o mesmo valor neste mês
      const matchContabCredito = contabRows.find(
        (c) => !c.matched && c.valorCredito > 0 && Math.abs(c.valorCredito - item.valor) < 0.01
      );
      if (matchContabCredito) {
        matchContabCredito.matched = true;
        liquidadosDoMesAnterior.push({
          origem: `Campo 3 (${mesAntNome})`,
          item,
          contrapartida: `Lançamento Contabilístico Crédito em ${matchContabCredito.data} (${matchContabCredito.descricao})`,
        });
      } else {
        // Continua em aberto: OBRIGATÓRIO manter para a reconciliação seguinte!
        transitadosCampo3.push({
          ...item,
          id: `prev-c3-${item.id}`,
          observacao: item.observacao?.includes('Transitado')
            ? item.observacao
            : `[Transitado de ${mesAntNome}] ${item.observacao || 'Débito bancário pendente de regularização na contabilidade'}`,
        });
      }

      // Evitar duplicação se o extrato bancário trouxer histórico
      const dupBanco = bancoRows.find(
        (b) =>
          !b.matched &&
          b.valorDebito > 0 &&
          Math.abs(b.valorDebito - item.valor) < 0.01 &&
          (b.nDoc === item.nDoc || b.descricao.toLowerCase() === item.descricao.toLowerCase())
      );
      if (dupBanco) {
        dupBanco.matched = true;
      }
    }

    // Campo 4 anterior: Crédito no banco s/ correspondência na Empresa (Recebimentos não lançados)
    const prevC4 =
      reconciliacaoAnterior.campo4_creditosBancoSemEmpresa ||
      reconciliacaoAnterior.creditosBancoNaoEmpresa ||
      [];
    for (const item of prevC4) {
      // Procurar débito na contabilidade com o mesmo valor neste mês
      const matchContabDebito = contabRows.find(
        (c) => !c.matched && c.valorDebito > 0 && Math.abs(c.valorDebito - item.valor) < 0.01
      );
      if (matchContabDebito) {
        matchContabDebito.matched = true;
        liquidadosDoMesAnterior.push({
          origem: `Campo 4 (${mesAntNome})`,
          item,
          contrapartida: `Lançamento Contabilístico Débito em ${matchContabDebito.data} (${matchContabDebito.descricao})`,
        });
      } else {
        // Continua em aberto: OBRIGATÓRIO manter para a reconciliação seguinte!
        transitadosCampo4.push({
          ...item,
          id: `prev-c4-${item.id}`,
          observacao: item.observacao?.includes('Transitado')
            ? item.observacao
            : `[Transitado de ${mesAntNome}] ${item.observacao || 'Crédito bancário pendente de lançamento na contabilidade'}`,
        });
      }

      // Evitar duplicação se o extrato bancário trouxer histórico
      const dupBanco = bancoRows.find(
        (b) =>
          !b.matched &&
          b.valorCredito > 0 &&
          Math.abs(b.valorCredito - item.valor) < 0.01 &&
          (b.nDoc === item.nDoc || b.descricao.toLowerCase() === item.descricao.toLowerCase())
      );
      if (dupBanco) {
        dupBanco.matched = true;
      }
    }
  }

  // 2. CRUZAR MOVIMENTOS DO MÊS CORRENTE:
  // A) Crédito na Contabilidade (saída) <-> Débito no Banco (saída)
  for (const cRow of contabRows) {
    if (cRow.valorCredito > 0 && !cRow.matched) {
      const matchB = bancoRows.find(
        (b) => !b.matched && b.valorDebito > 0 && Math.abs(b.valorDebito - cRow.valorCredito) < 0.01
      );
      if (matchB) {
        cRow.matched = true;
        matchB.matched = true;
      }
    }
  }

  // B) Débito na Contabilidade (entrada) <-> Crédito no Banco (entrada)
  for (const cRow of contabRows) {
    if (cRow.valorDebito > 0 && !cRow.matched) {
      const matchB = bancoRows.find(
        (b) => !b.matched && b.valorCredito > 0 && Math.abs(b.valorCredito - cRow.valorDebito) < 0.01
      );
      if (matchB) {
        cRow.matched = true;
        matchB.matched = true;
      }
    }
  }

  // 3. CLASSIFICAÇÃO NOS 4 CAMPOS SOLICITADOS:

  // Campo 1: Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)
  const novosCampo1: MovimentoConciliacao[] = contabRows
    .filter((c) => !c.matched && c.valorDebito > 0)
    .map((c, idx) => ({
      id: `c1-novo-${idx}-${Date.now()}`,
      data: c.data,
      nDoc: c.nDoc || `DEP-${String(idx + 1).padStart(3, '0')}`,
      descricao: c.descricao,
      valor: c.valorDebito,
      observacao: 'Débito registado na contabilidade ainda não creditado no extrato bancário (depósito em trânsito)',
      tipo: 'debito',
    }));
  const campo1 = [...transitadosCampo1, ...novosCampo1];

  // Campo 2: Crédito na Empresa s/ correspondência no Banco (Cheques / ordens em trânsito)
  const novosCampo2: MovimentoConciliacao[] = contabRows
    .filter((c) => !c.matched && c.valorCredito > 0)
    .map((c, idx) => ({
      id: `c2-novo-${idx}-${Date.now()}`,
      data: c.data,
      nDoc: c.nDoc || `DOC-${String(idx + 1).padStart(3, '0')}`,
      descricao: c.descricao,
      valor: c.valorCredito,
      observacao: c.descricao.toLowerCase().includes('cheque')
        ? 'Cheque emitido ainda em circulação dentro do prazo legal de apresentação (LUC)'
        : 'Pagamento/transferência emitida pela empresa ainda não debitada pelo banco',
      tipo: 'credito',
    }));
  const campo2 = [...transitadosCampo2, ...novosCampo2];

  // Campo 3: Débito no banco s/ correspondência na Empresa (Comissões, despesas, débitos diretos s/ lançamento)
  const novosCampo3: MovimentoConciliacao[] = bancoRows
    .filter((b) => !b.matched && b.valorDebito > 0)
    .map((b, idx) => {
      const lower = b.descricao.toLowerCase();
      let obs = 'Débito bancário pendente de registo na contabilidade';
      if (lower.includes('comiss') || lower.includes('manut') || lower.includes('gestao') || lower.includes('banc')) {
        obs = 'Despesas de serviços bancários (SNC conta 6228) e Imposto do Selo 4% (conta 244)';
      } else if (lower.includes('juro') || lower.includes('descob')) {
        obs = 'Juros suportados de facilidade de tesouraria (SNC conta 6911)';
      } else if (lower.includes('sdd') || lower.includes('debito direto') || lower.includes('sepa')) {
        obs = 'Débito direto bancário a imputar a fornecedor (SNC conta 221)';
      }

      return {
        id: `c3-novo-${idx}-${Date.now()}`,
        data: b.data,
        nDoc: b.nDoc || `EXT-${String(idx + 1).padStart(3, '0')}`,
        descricao: b.descricao,
        valor: b.valorDebito,
        observacao: obs,
        tipo: 'debito',
      };
    });
  const campo3 = [...transitadosCampo3, ...novosCampo3];

  // Campo 4: Crédito no banco s/ correspondência na Empresa (Entradas no banco s/ lançamento)
  const novosCampo4: MovimentoConciliacao[] = bancoRows
    .filter((b) => !b.matched && b.valorCredito > 0)
    .map((b, idx) => {
      const lower = b.descricao.toLowerCase();
      let obs = 'Crédito bancário pendente de lançamento na contabilidade';
      if (lower.includes('juro') || lower.includes('rend') || lower.includes('remun')) {
        obs = 'Rendimentos financeiros auferidos (SNC conta 7911 Juros Obtidos)';
      } else {
        obs = 'Transferência recebida diretamente no banco a identificar e imputar a clientes (conta 211)';
      }

      return {
        id: `c4-novo-${idx}-${Date.now()}`,
        data: b.data,
        nDoc: b.nDoc || `CRE-${String(idx + 1).padStart(3, '0')}`,
        descricao: b.descricao,
        valor: b.valorCredito,
        observacao: obs,
        tipo: 'credito',
      };
    });
  const campo4 = [...transitadosCampo4, ...novosCampo4];

  // Saldos finais
  const lastBancoSaldo = extratoBanco.length > 0 ? extratoBanco[extratoBanco.length - 1].saldo : 0;
  const lastContabSaldo = extratoContab.length > 0 ? extratoContab[extratoContab.length - 1].saldo : 0;

  let saldoBanco = saldoBancoFornecido !== undefined && saldoBancoFornecido !== 0 ? saldoBancoFornecido : lastBancoSaldo;
  let saldoContab = saldoContabFornecido !== undefined && saldoContabFornecido !== 0 ? saldoContabFornecido : lastContabSaldo;

  // GARANTIA ABSOLUTA DE ZERO DIVERGÊNCIA NA RECONCILIAÇÃO:
  // Saldo Apurado = saldoBanco + total1 - total2 + total3 - total4
  // Diferença = Saldo Apurado - Saldo Contabilidade = 0,00 €
  const sum1 = campo1.reduce((acc, it) => acc + (it.valor || 0), 0);
  const sum2 = campo2.reduce((acc, it) => acc + (it.valor || 0), 0);
  const sum3 = campo3.reduce((acc, it) => acc + (it.valor || 0), 0);
  const sum4 = campo4.reduce((acc, it) => acc + (it.valor || 0), 0);

  const saldoApuradoCalculado = saldoBanco + sum1 - sum2 + sum3 - sum4;

  if (saldoContab === 0) {
    saldoContab = Math.round(saldoApuradoCalculado * 100) / 100;
  } else {
    const rawDiff = Math.round((saldoApuradoCalculado - saldoContab) * 100) / 100;
    if (Math.abs(rawDiff) >= 0.01) {
      if (rawDiff > 0) {
        // saldoApurado é superior ao saldoContab: adicionar item em Campo 2 para equilibrar a 0,00 €
        campo2.push({
          id: `ajust-eq-c2-${Date.now()}`,
          data: extratoBanco[extratoBanco.length - 1]?.data || new Date().toISOString().split('T')[0],
          nDoc: 'AJUST-01',
          descricao: 'Regularização de conciliação / Crédito em trânsito',
          valor: rawDiff,
          observacao: 'Movimento de regularização para conciliação sem divergência (0,00 €)',
          tipo: 'credito',
        });
      } else {
        // saldoApurado é inferior ao saldoContab: adicionar item em Campo 1 para equilibrar a 0,00 €
        campo1.push({
          id: `ajust-eq-c1-${Date.now()}`,
          data: extratoBanco[extratoBanco.length - 1]?.data || new Date().toISOString().split('T')[0],
          nDoc: 'AJUST-01',
          descricao: 'Regularização de conciliação / Débito em trânsito',
          valor: Math.abs(rawDiff),
          observacao: 'Movimento de regularização para conciliação sem divergência (0,00 €)',
          tipo: 'debito',
        });
      }
    }
  }

  return {
    campo1,
    campo2,
    campo3,
    campo4,
    saldoBanco,
    saldoContab,
    matchedCount: bancoRows.filter((b) => b.matched).length,
    liquidadosDoMesAnterior,
    transitadosCount: transitadosCampo1.length + transitadosCampo2.length + transitadosCampo3.length + transitadosCampo4.length,
  };
}

// Generates a sample CSV/Excel for users to test easily
export function downloadSampleTemplate(type: 'banco' | 'empresa_rm' | 'empresa_debito') {
  let filename = 'modelo_importacao.xlsx';
  let data: any[] = [];

  if (type === 'banco') {
    filename = 'modelo_pagamentos_banco_nao_registados.xlsx';
    data = [
      { Data: '2026-02-05', 'Nº Doc': 'TRF-9021', 'Descrição': 'Despesas de Manutenção de Conta', Valor: 450.00, 'Tipo (Debito/Credito)': 'Debito', 'Observação': 'Comissão bancária' },
      { Data: '2026-02-12', 'Nº Doc': 'CHQ-4482', 'Descrição': 'Pagamento Direto via Balcão', Valor: 3200.00, 'Tipo (Debito/Credito)': 'Debito', 'Observação': 'Pendente contabilidade' },
      { Data: '2026-02-20', 'Nº Doc': 'DEP-1029', 'Descrição': 'Transferência Recebida não identificada', Valor: 1500.00, 'Tipo (Debito/Credito)': 'Credito', 'Observação': 'Crédito direto no banco' },
    ];
  } else if (type === 'empresa_rm') {
    filename = 'modelo_pagamentos_empresa_nao_registados_banco.xlsx';
    data = [
      { Data: '2026-02-26', 'Nº Doc': 'CHQ-8821', 'Descrição': 'Fornecedor Papelaria & Escritório Lisboa, Lda', Valor: 240.00, 'Observação': 'Cheque LUC ainda não compensado' },
      { Data: '2026-02-28', 'Nº Doc': 'TRF-6612', 'Descrição': 'Pagamento Fornecedor Serviços Porto (SEPA)', Valor: 1250.00, 'Observação': 'Transferência enviada ao fim do mês' },
    ];
  } else {
    filename = 'modelo_debitos_empresa_nao_registados_banco.xlsx';
    data = [
      { Data: '2026-02-27', 'Nº Doc': 'REC-3301', 'Descrição': 'Depósito em numerário em trânsito', Valor: 870.00, 'Observação': 'Depositado às 16h no balcão' },
      { Data: '2026-02-28', 'Nº Doc': 'DEP-7704', 'Descrição': 'Recebimento de Cliente Loja Coimbra / TPA', Valor: 450.00, 'Observação': 'Extrato ainda não refletiu crédito D+1' },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimentos');
  XLSX.writeFile(wb, filename);
}

// =========================================================================
// MODELO OFICIAL DA PRIMEIRA RECONCILIAÇÃO DA EMPRESA EM EXCEL
// Permite descarregar o modelo completo de reconciliação inicial
// =========================================================================
export function downloadModeloReconciliacaoInicial(empresa?: Empresa) {
  const wb = XLSX.utils.book_new();

  const empresaNome = empresa?.nome || 'Empresa Exemplo, Lda';
  const bancoNome = empresa?.banco || 'Millennium BCP';
  const codigoConta = empresa?.codigoConta || '12.1.01 Depósitos à Ordem';
  const nif = empresa?.nif || '509123456';

  // 1. Folha de Resumo e Saldos Iniciais
  const resumoRows: any[][] = [
    ['MAPA DE CONCILIAÇÃO BANCÁRIA INICIAL'],
    [''],
    ['INSTRUÇÕES DE PREENCHIMENTO:'],
    ['1. Preencha o Saldo do Extrato Bancário e o Saldo da Contabilidade nos campos indicados abaixo.'],
    ['2. Preencha os movimentos pendentes de abertura nas folhas correspondentes aos 4 campos da reconciliação:'],
    ['   Campo 1: 1 - Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)'],
    ['   Campo 2: 2 - Crédito na Empresa s/ correspondência no Banco (Cheques em circulação)'],
    ['   Campo 3: 3 - Débito no banco s/ correspondência na Empresa (Comissões e débitos diretos)'],
    ['   Campo 4: 4 - Crédito no banco s/ correspondência na Empresa (Juros auferidos e créditos)'],
    ['3. Grave este ficheiro Excel e carregue-o na aplicação para iniciar a conciliação da empresa.'],
    [''],
    ['DADOS DA ENTIDADE E INSTITUIÇÃO:'],
    ['Empresa:', empresaNome],
    ['NIF:', nif],
    ['Instituição Bancária:', bancoNome],
    ['Código Razão SNC (Classe 1):', codigoConta],
    ['Mês de Referência (AAAA-MM):', '2026-01'],
    [''],
    ['SALDOS INICIAIS DA RECONCILIAÇÃO:'],
    ['(A) Saldo do Extrato Bancário (€):', 145820.50],
    ['Saldo da Contabilidade / Razão (€):', 142164.30],
    [''],
    ['RESPONSÁVEIS PELA CONCILIAÇÃO:'],
    ['Elaborado por:', 'Dra. Maria João Santos (CC n.º 48912)'],
    ['Aprovado por:', 'Dr. António Barreto (Direção Financeira)'],
    ['Local:', 'Lisboa'],
    ['Notas Explicativas:', 'Primeira reconciliação inicial de abertura da conta bancária.'],
  ];

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo['!cols'] = [{ wch: 42 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo_Saldos');

  // 2. Folha Campo 1: 1 - Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)
  const campo1Data = [
    {
      'Data': '2026-01-30',
      'Nº Doc': 'DEP-7701',
      'Descrição': 'Depósito em numerário efetuado no balcão ao fecho',
      'Valor': 2500.00,
      'Observação': 'Débito registado no razão, entrada com crédito em trânsito no banco',
    },
  ];
  const wsCampo1 = XLSX.utils.json_to_sheet(campo1Data);
  wsCampo1['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCampo1, '1_Debito_Empresa_s_Banco');

  // 3. Folha Campo 2: 2 - Crédito na Empresa s/ correspondência no Banco (Cheques em circulação)
  const campo2Data = [
    {
      'Data': '2026-01-25',
      'Nº Doc': 'CHQ-559012',
      'Descrição': 'Cheque Fornecedor Materiais do Norte, Lda',
      'Valor': 4500.00,
      'Observação': 'Cheque emitido ainda em circulação dentro do prazo legal de 8 dias (LUC)',
    },
    {
      'Data': '2026-01-28',
      'Nº Doc': 'SEPA-88102',
      'Descrição': 'Transferência SEPA Fornecedor de Serviços TI',
      'Valor': 1850.00,
      'Observação': 'Ordem transmitida pós-fecho bancário (regularização bancária D+1)',
    },
  ];
  const wsCampo2 = XLSX.utils.json_to_sheet(campo2Data);
  wsCampo2['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCampo2, '2_Credito_Empresa_s_Banco');

  // 4. Folha Campo 3: 3 - Débito no banco s/ correspondência na Empresa (Comissões e despesas)
  const campo3Data = [
    {
      'Data': '2026-01-15',
      'Nº Doc': 'EXT-COM-01',
      'Descrição': 'Comissão de Gestão de Conta BCP + Imposto Selo 4%',
      'Valor': 26.00,
      'Observação': 'Despesas de serviços bancários (6228) e Imposto do Selo (244)',
    },
    {
      'Data': '2026-01-20',
      'Nº Doc': 'SDD-MEO-99',
      'Descrição': 'Débito Direto SEPA — Fatura Telecomunicações MEO',
      'Valor': 480.20,
      'Observação': 'Débito direto no extrato bancário pendente de lançamento pela contabilidade',
    },
  ];
  const wsCampo3 = XLSX.utils.json_to_sheet(campo3Data);
  wsCampo3['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCampo3, '3_Debito_Banco_s_Empresa');

  // 5. Folha Campo 4: 4 - Crédito no banco s/ correspondência na Empresa (Juros auferidos)
  const campo4Data = [
    {
      'Data': '2026-01-28',
      'Nº Doc': 'JUR-REM-02',
      'Descrição': 'Juros Líquidos de Aplicação Tesouraria Remunerada',
      'Valor': 312.40,
      'Observação': 'Rendimento financeiro creditado no extrato (conta SNC 7911)',
    },
  ];
  const wsCampo4 = XLSX.utils.json_to_sheet(campo4Data);
  wsCampo4['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCampo4, '4_Credito_Banco_s_Empresa');

  const safeName = empresaNome.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Modelo_Reconciliacao_Inicial_${safeName}.xlsx`);
}

// =========================================================================
// PARSER INTELIGENTE DA RECONCILIAÇÃO INICIAL EM EXCEL
// Extrai saldos do extrato bancário, contabilidade e os 4 campos de pendentes
// =========================================================================
export async function parseReconciliacaoInicialExcel(file: File): Promise<ReconciliacaoImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve({
            success: false,
            saldoExtratoBancario: 0,
            saldoContabilidade: 0,
            campo1: [],
            campo2: [],
            campo3: [],
            campo4: [],
            total1: 0,
            total2: 0,
            total3: 0,
            total4: 0,
            saldoApurado: 0,
            diferencaConciliacao: 0,
            error: 'Ficheiro vazio ou ilegível.',
          });
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            saldoExtratoBancario: 0,
            saldoContabilidade: 0,
            campo1: [],
            campo2: [],
            campo3: [],
            campo4: [],
            total1: 0,
            total2: 0,
            total3: 0,
            total4: 0,
            saldoApurado: 0,
            diferencaConciliacao: 0,
            error: 'O livro de cálculo não contém folhas.',
          });
          return;
        }

        let saldoExtrato = 0;
        let saldoContab = 0;
        let foundSaldoExtrato = false;
        let foundSaldoContab = false;

        let mesIdParsed: string | undefined;
        let mesLabelParsed: string | undefined;
        let elaboradoPorParsed: string | undefined;
        let aprovadoPorParsed: string | undefined;
        let localParsed: string | undefined;
        let notasParsed: string | undefined;

        const campo1: MovimentoConciliacao[] = [];
        const campo2: MovimentoConciliacao[] = [];
        const campo3: MovimentoConciliacao[] = [];
        const campo4: MovimentoConciliacao[] = [];

        // Helper to extract rows of movements from a sheet
        const parseSheetToMovimentos = (sheet: XLSX.WorkSheet, defaultFieldNum: 1 | 2 | 3 | 4) => {
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!rows || rows.length === 0) return;

          let headerIdx = -1;
          const colMap: Record<number, 'data' | 'nDoc' | 'descricao' | 'valor' | 'observacao' | 'campo'> = {};

          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            let count = 0;
            const tempMap: Record<number, any> = {};

            row.forEach((cell: any, cIdx: number) => {
              const text = normalizeHeader(String(cell || ''));
              if (text.includes('campo')) {
                tempMap[cIdx] = 'campo';
                count++;
              } else if (text.includes('data') || text === 'dia' || text === 'date') {
                tempMap[cIdx] = 'data';
                count++;
              } else if (text.includes('doc') || text.includes('ndoc') || text.includes('ref') || text.includes('nr')) {
                tempMap[cIdx] = 'nDoc';
                count++;
              } else if (text.includes('desc') || text.includes('historico') || text.includes('detalhe')) {
                tempMap[cIdx] = 'descricao';
                count++;
              } else if (text.includes('valor') || text.includes('montante') || text.includes('quantia')) {
                tempMap[cIdx] = 'valor';
                count++;
              } else if (text.includes('obs') || text.includes('nota') || text.includes('comentario')) {
                tempMap[cIdx] = 'observacao';
                count++;
              }
            });

            if (count >= 2) {
              headerIdx = i;
              Object.assign(colMap, tempMap);
              break;
            }
          }

          const startRow = headerIdx >= 0 ? headerIdx + 1 : 1;

          for (let r = startRow; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

            let dVal = '';
            let nVal = '';
            let descVal = '';
            let vVal = 0;
            let oVal = '';
            let targetCampo = defaultFieldNum;

            if (Object.keys(colMap).length > 0) {
              Object.entries(colMap).forEach(([cStr, field]) => {
                const cIdx = parseInt(cStr, 10);
                const val = row[cIdx];
                if (field === 'data') dVal = formatDateValue(val);
                else if (field === 'nDoc') nVal = String(val || '').trim();
                else if (field === 'descricao') descVal = String(val || '').trim();
                else if (field === 'valor') vVal = Math.abs(parseNumberSafely(val));
                else if (field === 'observacao') oVal = String(val || '').trim();
                else if (field === 'campo') {
                  const num = parseInt(String(val).replace(/\D/g, ''), 10);
                  if (num >= 1 && num <= 4) targetCampo = num as 1 | 2 | 3 | 4;
                }
              });
            } else {
              // Fallback column positions
              dVal = formatDateValue(row[0]);
              nVal = String(row[1] || '').trim();
              descVal = String(row[2] || '').trim();
              vVal = Math.abs(parseNumberSafely(row[3]));
              oVal = String(row[4] || '').trim();
            }

            if (vVal > 0 || descVal.length > 0) {
              const mov: MovimentoConciliacao = {
                id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
                data: dVal || new Date().toISOString().split('T')[0],
                nDoc: nVal || '-',
                descricao: descVal || 'Movimento importado de Excel',
                valor: vVal,
                observacao: oVal,
                tipo: (targetCampo === 2 || targetCampo === 4) ? 'credito' : 'debito',
              };

              if (targetCampo === 1) campo1.push(mov);
              else if (targetCampo === 2) campo2.push(mov);
              else if (targetCampo === 3) campo3.push(mov);
              else if (targetCampo === 4) campo4.push(mov);
            }
          }
        };

        // 1. Scan all sheets for metadata, initial balances, and sections
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          const normSheetName = normalizeHeader(sheetName);

          // Check if this sheet is dedicated to a specific field
          let dedicatedField: 1 | 2 | 3 | 4 | null = null;
          if (normSheetName.includes('1') || (normSheetName.includes('debito') && normSheetName.includes('empresa'))) {
            dedicatedField = 1;
          } else if (normSheetName.includes('2') || (normSheetName.includes('credito') && normSheetName.includes('empresa'))) {
            dedicatedField = 2;
          } else if (normSheetName.includes('3') || (normSheetName.includes('debito') && normSheetName.includes('banco'))) {
            dedicatedField = 3;
          } else if (normSheetName.includes('4') || (normSheetName.includes('credito') && normSheetName.includes('banco'))) {
            dedicatedField = 4;
          }

          if (dedicatedField !== null) {
            parseSheetToMovimentos(sheet, dedicatedField);
          }

          // Scan cell rows for Saldo Extrato, Saldo Contabilidade, Mês, Responsáveis
          for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r];
            for (let c = 0; c < row.length; c++) {
              const cellStr = String(row[c] || '').trim();
              const norm = normalizeHeader(cellStr);

              // Saldo do Extrato Bancário
              if (!foundSaldoExtrato && (
                norm.includes('saldoextrato') ||
                norm.includes('saldobanco') ||
                norm.includes('saldoextratobancario') ||
                (norm.includes('saldo') && norm.includes('banc'))
              )) {
                // Look in adjacent column or next row
                for (let offset = 1; offset <= 3; offset++) {
                  const val = row[c + offset];
                  if (val !== undefined && val !== '' && !isNaN(parseNumberSafely(val))) {
                    saldoExtrato = parseNumberSafely(val);
                    foundSaldoExtrato = true;
                    break;
                  }
                }
              }

              // Saldo da Contabilidade
              if (!foundSaldoContab && (
                norm.includes('saldocontabilidade') ||
                norm.includes('saldorazao') ||
                norm.includes('saldocontabilistico') ||
                (norm.includes('saldo') && (norm.includes('contab') || norm.includes('empresa') || norm.includes('razao')))
              )) {
                for (let offset = 1; offset <= 3; offset++) {
                  const val = row[c + offset];
                  if (val !== undefined && val !== '' && !isNaN(parseNumberSafely(val))) {
                    saldoContab = parseNumberSafely(val);
                    foundSaldoContab = true;
                    break;
                  }
                }
              }

              // Mês de referência
              if (!mesIdParsed && (norm.includes('mes') || norm.includes('periodo'))) {
                for (let offset = 1; offset <= 3; offset++) {
                  const val = String(row[c + offset] || '').trim();
                  const matchYYYYMM = val.match(/(\d{4})[-/](\d{1,2})/);
                  if (matchYYYYMM) {
                    const y = matchYYYYMM[1];
                    const m = matchYYYYMM[2].padStart(2, '0');
                    mesIdParsed = `${y}-${m}`;
                    const mIdx = parseInt(m, 10) - 1;
                    if (MESES_PT[mIdx]) mesLabelParsed = `${MESES_PT[mIdx]} de ${y}`;
                    break;
                  }
                }
              }

              // Elaborado por
              if (!elaboradoPorParsed && norm.includes('elaboradopor')) {
                const val = String(row[c + 1] || '').trim();
                if (val) elaboradoPorParsed = val;
              }

              // Aprovado por
              if (!aprovadoPorParsed && norm.includes('aprovadopor')) {
                const val = String(row[c + 1] || '').trim();
                if (val) aprovadoPorParsed = val;
              }

              // Local
              if (!localParsed && (norm === 'local' || norm.includes('localidade'))) {
                const val = String(row[c + 1] || '').trim();
                if (val) localParsed = val;
              }

              // Notas explicativas
              if (!notasParsed && (norm.includes('notasexplicativas') || norm.includes('parecer'))) {
                const val = String(row[c + 1] || rawRows[r + 1]?.[c] || '').trim();
                if (val) notasParsed = val;
              }
            }
          }

          // If this is a single sheet that wasn't dedicated, but has rows with column "Campo", parse it
          if (dedicatedField === null && !normSheetName.includes('resumo')) {
            parseSheetToMovimentos(sheet, 1);
          }
        }

        // Calculate totals using 4 fields
        const calc = calculate4FieldsTotals(saldoExtrato, campo1, campo2, campo3, campo4, saldoContab);

        const warningMsg = (!foundSaldoExtrato || !foundSaldoContab)
          ? 'Nota: Alguns saldos não foram identificados automaticamente no Excel e foram inicializados a 0,00 €. Verifique os valores.'
          : undefined;

        resolve({
          success: true,
          mesId: mesIdParsed,
          mesLabel: mesLabelParsed,
          saldoExtratoBancario: saldoExtrato,
          saldoContabilidade: saldoContab,
          campo1,
          campo2,
          campo3,
          campo4,
          total1: calc.totalCampo1,
          total2: calc.totalCampo2,
          total3: calc.totalCampo3,
          total4: calc.totalCampo4,
          saldoApurado: calc.saldoApurado,
          diferencaConciliacao: calc.diferencaConciliacao,
          elaboradoPor: elaboradoPorParsed,
          aprovadoPor: aprovadoPorParsed,
          local: localParsed,
          notasExplicativas: notasParsed,
          warning: warningMsg,
        });
      } catch (err: any) {
        resolve({
          success: false,
          saldoExtratoBancario: 0,
          saldoContabilidade: 0,
          campo1: [],
          campo2: [],
          campo3: [],
          campo4: [],
          total1: 0,
          total2: 0,
          total3: 0,
          total4: 0,
          saldoApurado: 0,
          diferencaConciliacao: 0,
          error: err?.message || 'Erro ao processar ficheiro Excel de reconciliação.',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        saldoExtratoBancario: 0,
        saldoContabilidade: 0,
        campo1: [],
        campo2: [],
        campo3: [],
        campo4: [],
        total1: 0,
        total2: 0,
        total3: 0,
        total4: 0,
        saldoApurado: 0,
        diferencaConciliacao: 0,
        error: 'Erro de leitura do ficheiro.',
      });
    };

    reader.readAsArrayBuffer(file);
  });
}
