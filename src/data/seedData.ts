import { Empresa, Reconciliacao } from '../types';

export const DEMO_EMPRESA: Empresa = {
  id: 'empresa-demo-portugal',
  nome: 'Lusitânia Comércio & Tecnologias, Lda',
  nif: '509123456',
  banco: 'Millennium BCP',
  codigoConta: '12.1.01 Depósitos à Ordem',
  normativo: 'SNC',
  moeda: 'EUR',
};

export const DEMO_RECONCILIACAO: Reconciliacao = {
  id: '2026-02',
  mes: 'Fevereiro de 2026',
  saldoExtratoBancario: 145820.50, // Saldo Banco
  saldoContabilidade: 142164.30,   // Saldo Contabilidade (Razão SNC 12.1)

  // 1 - Débito na empresa s/ correspondência no Banco (Depósitos em trânsito)
  debitosEmpresaNaoBanco: [
    {
      id: 'pt-mov-6',
      data: '2026-02-27',
      nDoc: 'DEP-7701',
      descricao: 'Depósito em numerário efetuado no balcão ao fecho do mês',
      valor: 2500.00,
      observacao: 'Crédito com data-valor bancária no primeiro dia útil seguinte',
      tipo: 'debito',
    },
  ],
  totalDebitosEmpresaNaoBanco: 2500.00,

  // 2 - Crédito na Empresa s/ correspondência no Banco (Cheques/ordens em trânsito)
  creditosEmpresaNaoBanco: [
    {
      id: 'pt-mov-4',
      data: '2026-02-25',
      nDoc: 'CHQ-559012',
      descricao: 'Cheque Fornecedor Materiais do Norte, Lda',
      valor: 4500.00,
      observacao: 'Cheque emitido ainda em circulação (prazo legal de 8 dias da LUC)',
      tipo: 'credito',
    },
    {
      id: 'pt-mov-5',
      data: '2026-02-28',
      nDoc: 'SEPA-88102',
      descricao: 'Transferência SEPA a Fornecedor de Serviços de TI',
      valor: 1850.00,
      observacao: 'Ordem transmitida após o fecho de compensação interbancária (D+1)',
      tipo: 'credito',
    },
  ],
  totalCreditosEmpresaNaoBanco: 6350.00,

  // 3 - Débito no banco s/ correspondência na Empresa (Despesas e débitos diretos no banco s/ lançamento)
  debitosBancoNaoEmpresa: [
    {
      id: 'pt-mov-1',
      data: '2026-02-15',
      nDoc: 'EXT-COM-01',
      descricao: 'Comissão de Gestão de Conta BCP + Imposto Selo 4%',
      valor: 26.00,
      observacao: 'Comissão 25€ (conta 6228) + Imposto do Selo 1€ (conta 244)',
      tipo: 'debito',
    },
    {
      id: 'pt-mov-2',
      data: '2026-02-20',
      nDoc: 'SDD-MEO-99',
      descricao: 'Débito Direto SEPA — Fatura Telecomunicações MEO',
      valor: 480.20,
      observacao: 'Falta lançar no diário de compras / regularização de fornecedor 221',
      tipo: 'debito',
    },
  ],
  totalDebitosBancoNaoEmpresa: 506.20,

  // 4 - Crédito no banco s/ correspondência na Empresa (Entradas e transferências no banco s/ lançamento)
  creditosBancoNaoEmpresa: [
    {
      id: 'pt-mov-3',
      data: '2026-02-28',
      nDoc: 'JUR-REM-02',
      descricao: 'Juros Líquidos de Aplicação Tesouraria Remunerada',
      valor: 312.40,
      observacao: 'Rendimento financeiro creditado no extrato (conta SNC 7911)',
      tipo: 'credito',
    },
  ],
  totalCreditosBancoNaoEmpresa: 312.40,

  // Saldos e reconciliação matemática
  // Saldo Apurado = 145820.50 + 2500.00 (1) - 6350.00 (2) + 506.20 (3) - 312.40 (4) = 142164.30
  saldoApurado: 142164.30,
  saldoBancarioAjustado: 141970.50,      // 145820.50 + 2500.00 - 6350.00 = 141970.50
  saldoContabilisticoAjustado: 141970.50, // 142164.30 - 506.20 + 312.40 = 141970.50
  diferencaConciliacao: 0.00,

  // Compatibilidade com campos anteriores
  pagamentosBancoNaoRegistadosEmpresa: [
    {
      id: 'pt-mov-1',
      data: '2026-02-15',
      nDoc: 'EXT-COM-01',
      descricao: 'Comissão de Gestão de Conta BCP + Imposto Selo 4%',
      valor: 26.00,
      observacao: 'Comissão 25€ (conta 6228) + Imposto Selo 1€ (conta 244)',
      tipo: 'debito',
    },
    {
      id: 'pt-mov-2',
      data: '2026-02-20',
      nDoc: 'SDD-MEO-99',
      descricao: 'Débito Direto SEPA — Fatura Telecomunicações MEO',
      valor: 480.20,
      observacao: 'Falta lançar no diário de compras / regularização fornecedor',
      tipo: 'debito',
    },
    {
      id: 'pt-mov-3',
      data: '2026-02-28',
      nDoc: 'JUR-REM-02',
      descricao: 'Juros Líquidos de Aplicação Tesouraria Remunerada',
      valor: 312.40,
      observacao: 'Rendimento financeiro creditado (conta 7911)',
      tipo: 'credito',
    },
  ],
  totalDebitosBancoNaoRegistados: 506.20,
  totalCreditosBancoNaoRegistados: 312.40,
  pagamentosRMNaoRegistadosBanco: [
    {
      id: 'pt-mov-4',
      data: '2026-02-25',
      nDoc: 'CHQ-559012',
      descricao: 'Cheque Fornecedor Materiais do Norte, Lda',
      valor: 4500.00,
      observacao: 'Cheque emitido ainda em circulação (dentro do prazo legal de 8 dias)',
    },
    {
      id: 'pt-mov-5',
      data: '2026-02-28',
      nDoc: 'SEPA-88102',
      descricao: 'Transferência SEPA a Fornecedor de Serviços de TI',
      valor: 1850.00,
      observacao: 'Ordem transmitida pós-fecho bancário (D+1 dia útil)',
    },
  ],
  totalCreditosEmpresaNaoRegistados: 6350.00,
  debitosEmpresaNaoRegistadosBanco: [
    {
      id: 'pt-mov-6',
      data: '2026-02-27',
      nDoc: 'DEP-7701',
      descricao: 'Depósito em numerário efetuado no balcão ao fecho',
      valor: 2500.00,
      observacao: 'Crédito com data-valor no dia útil seguinte',
    },
  ],
  totalDebitosEmpresaNaoRegistados: 2500.00,

  elaboradoPor: 'Dra. Maria João Santos (Contabilista Certificada CC n.º 48912)',
  aprovadoPor: 'Dr. António Barreto (Diretor Financeiro / Gerente)',
  local: 'Lisboa',
  baseadoNoMesAnterior: '2026-01',
  status: 'conciliado',
  notasExplicativas: 'Conciliação elaborada segundo as exigências do Sistema de Normalização Contabilística (SNC) e art. 65.º do Código das Sociedades Comerciais. O cheque n.º 559012 (4.500,00 €) encontra-se em circulação dentro do prazo legal de apresentação regulamentado pelo Banco de Portugal e LUC. Os encargos bancários de 26,00 € foram desdobrados em 6228 (25,00 €) e 244 (1,00 € - 4% de Imposto do Selo conforme verba 17.3.4 da TGIS).',
};

// Aliases para compatibilidade
export const DEMO_EMPRESA_PT = DEMO_EMPRESA;
export const DEMO_RECONCILIACAO_PT = DEMO_RECONCILIACAO;

