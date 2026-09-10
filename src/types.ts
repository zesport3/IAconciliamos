export interface MovimentoConciliacao {
  id: string;
  data: string;
  nDoc: string;
  descricao: string;
  valor: number;
  observacao: string;
  tipo?: 'debito' | 'credito'; // Para compatibilidade
}

export type NormativoContabilistico = 'SNC';

export interface Empresa {
  id: string;
  nome: string;
  nif?: string; // NIF em Portugal (9 dígitos)
  banco: string; // Instituição Bancária
  contaNumero?: string; // Campo opcional legado
  codigoConta: string; // Ex: 12.1.01 (SNC - Depósitos à Ordem)
  normativo?: NormativoContabilistico; // Padrão: 'SNC' (Portugal)
  moeda?: 'EUR'; // Padrão: 'EUR' (€)
  criadoEm?: any;
  atualizadoEm?: any;
}

export interface Reconciliacao {
  id: string; // Ex: "2026-02"
  mes: string; // Ex: "Fevereiro de 2026"
  saldoExtratoBancario: number; // Saldo final do Extrato Bancário
  saldoContabilidade: number; // Saldo final da Contabilidade (Razão da Conta 12)

  // OS 4 CAMPOS DA RECONCILIAÇÃO:
  // 1 - Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)
  debitosEmpresaNaoBanco: MovimentoConciliacao[];
  totalDebitosEmpresaNaoBanco: number;

  // 2 - Crédito na Empresa s/ correspondência no Banco (Cheques/ordens emitidos em trânsito)
  creditosEmpresaNaoBanco: MovimentoConciliacao[];
  totalCreditosEmpresaNaoBanco: number;

  // 3 - Débito no banco s/ correspondência na Empresa (Comissões, despesas, débitos diretos s/ lançamento)
  debitosBancoNaoEmpresa: MovimentoConciliacao[];
  totalDebitosBancoNaoEmpresa: number;

  // 4 - Crédito no banco s/ correspondência na Empresa (Transferências recebidas, juros s/ lançamento)
  creditosBancoNaoEmpresa: MovimentoConciliacao[];
  totalCreditosBancoNaoEmpresa: number;

  saldoApurado: number; // Saldo Bancário + (1) - (2) + (3) - (4)
  saldoBancarioAjustado?: number; // Saldo Bancário + (1) - (2)
  saldoContabilisticoAjustado?: number; // Saldo Contabilidade - (3) + (4)
  diferencaConciliacao: number; // Diferença (0.00 se conciliado)

  elaboradoPor: string;
  aprovadoPor: string;
  local: string; // Ex: "Lisboa", "Porto"
  criadoEm?: any;
  atualizadoEm?: any;
  baseadoNoMesAnterior?: string;
  reconciliadoComIA?: boolean;
  extratosCarregados?: boolean;
  status?: 'conciliado' | 'pendente';
  parecerIA?: string;
  notasExplicativas?: string;
  ultimaAuditoriaIA?: any;

  // Aliases canónicos adicionais para garantir compatibilidade
  campo1_debitosEmpresaSemBanco?: MovimentoConciliacao[];
  campo2_creditosEmpresaSemBanco?: MovimentoConciliacao[];
  campo3_debitosBancoSemEmpresa?: MovimentoConciliacao[];
  campo4_creditosBancoSemEmpresa?: MovimentoConciliacao[];
  totalCampo1_debitosEmpresaSemBanco?: number;
  totalCampo2_creditosEmpresaSemBanco?: number;
  totalCampo3_debitosBancoSemEmpresa?: number;
  totalCampo4_creditosBancoSemEmpresa?: number;
  debitosEmpresaNaoRegistadosBanco?: MovimentoConciliacao[];

  // Campos legados para compatibilidade total
  pagamentosBancoNaoRegistadosEmpresa?: MovimentoConciliacao[];
  totalDebitosBancoNaoRegistados?: number;
  totalCreditosBancoNaoRegistados?: number;
  pagamentosRMNaoRegistadosBanco?: MovimentoConciliacao[];
  totalCreditosEmpresaNaoRegistados?: number;
  totalDebitosEmpresaNaoRegistados?: number;
}

export interface LancamentoSugeridoIA {
  item: string;
  valor: number;
  tabelaOrigem: string;
  contaDebito: string;
  contaCredito: string;
  justificativa: string;
}

export interface AnomaliaRiscoIA {
  nivel: 'baixo' | 'medio' | 'alto';
  titulo: string;
  descricao: string;
}

export interface AIAuditResult {
  statusAuditoria: 'conforme' | 'com_ressalvas' | 'divergencia_critica';
  tituloStatus: string;
  resumoExecutivo: string;
  verificacaoMatematica: {
    confereFormula: boolean;
    detalheCalculo: string;
    diferencaIdentificada: number;
  };
  lancamentosSugeridos: LancamentoSugeridoIA[];
  anomaliasERiscos: AnomaliaRiscoIA[];
  recomendacoesAcoes: string[];
  notaExplicativaSugerida: string;
}

export type TabelaTipo = 'campo1' | 'campo2' | 'campo3' | 'campo4' | 'bancoNaoEmpresa' | 'rmNaoBanco' | 'debitosEmpresaNaoBanco';

export interface ExtratoRow {
  id: string;
  data: string;
  descricao: string;
  valorDebito: number;
  valorCredito: number;
  saldo: number;
  nDoc?: string;
  conciliado?: boolean;
}

export interface ExtratoParseResult {
  success: boolean;
  tipo: 'banco' | 'contabilidade';
  rows: ExtratoRow[];
  saldoFinal: number;
  saldoInicial?: number;
  totalDebito: number;
  totalCredito: number;
  error?: string;
}

export interface ReconciliacaoImportResult {
  success: boolean;
  mesId?: string;
  mesLabel?: string;
  saldoExtratoBancario: number;
  saldoContabilidade: number;
  campo1: MovimentoConciliacao[];
  campo2: MovimentoConciliacao[];
  campo3: MovimentoConciliacao[];
  campo4: MovimentoConciliacao[];
  total1: number;
  total2: number;
  total3: number;
  total4: number;
  saldoApurado: number;
  diferencaConciliacao: number;
  elaboradoPor?: string;
  aprovadoPor?: string;
  local?: string;
  notasExplicativas?: string;
  error?: string;
  warning?: string;
}
