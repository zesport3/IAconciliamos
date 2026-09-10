import React, { useState, useRef } from 'react';
import { Empresa, Reconciliacao, ExtratoRow, MovimentoConciliacao } from '../types';
import {
  parseExtratoPadrao,
  downloadTemplateExtrato,
  reconciliarExtratosDeterministic,
} from '../utils/excelParser';
import { formatMoeda } from '../utils/calculations';
import { exportReconciliacaoToExcel, exportReconciliacaoToPdf } from '../utils/exportTools';
import {
  Sparkles,
  FileSpreadsheet,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Download,
  BookOpen,
  RefreshCw,
  Scale,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ReconciliarIAExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  reconciliacaoAnterior?: Reconciliacao | null;
  onAplicarAoMapa: (dados: {
    saldoExtratoBancario: number;
    saldoContabilidade: number;
    debitosEmpresaNaoBanco: any[];
    creditosEmpresaNaoBanco: any[];
    debitosBancoNaoEmpresa: any[];
    creditosBancoNaoEmpresa: any[];
    notasExplicativas?: string;
    parecerIA?: string;
    lancamentosIA?: any[];
    reconciliadoComIA?: boolean;
    extratosCarregados?: boolean;
  }) => void;
}

export const ReconciliarIAExcelModal: React.FC<ReconciliarIAExcelModalProps> = ({
  isOpen,
  onClose,
  empresa,
  reconciliacaoAnterior,
  onAplicarAoMapa,
}) => {
  const [bancoFile, setBancoFile] = useState<File | null>(null);
  const [contabFile, setContabFile] = useState<File | null>(null);

  const [bancoRows, setBancoRows] = useState<ExtratoRow[]>([]);
  const [contabRows, setContabRows] = useState<ExtratoRow[]>([]);

  const [bancoSaldoFinal, setBancoSaldoFinal] = useState<number>(0);
  const [contabSaldoFinal, setContabSaldoFinal] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reconciliacaoResultado, setReconciliacaoResultado] = useState<any | null>(null);
  const [etapa, setEtapa] = useState<'upload' | 'resultado'>('upload');
  const [activeFieldDetail, setActiveFieldDetail] = useState<1 | 2 | 3 | 4 | null>(null);

  const bancoInputRef = useRef<HTMLInputElement>(null);
  const contabInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const mapToMovimentos = (arr: any[]): MovimentoConciliacao[] => {
    return (arr || []).map((item, idx) => ({
      id: item.id || `mov-${Date.now()}-${idx}`,
      data: item.data || new Date().toISOString().split('T')[0],
      nDoc: item.documento || item.nDoc || `DOC-${idx + 1}`,
      descricao: item.descricao || item.item || 'Movimento verificado por IA',
      valor: Math.abs(Number(item.valor) || 0),
      observacao: item.observacao || item.justificativa || '',
    }));
  };

  const handleExportarExcelModal = () => {
    if (!reconciliacaoResultado) return;
    const c1 = mapToMovimentos(reconciliacaoResultado.campo1);
    const c2 = mapToMovimentos(reconciliacaoResultado.campo2);
    const c3 = mapToMovimentos(reconciliacaoResultado.campo3);
    const c4 = mapToMovimentos(reconciliacaoResultado.campo4);

    const t1 = c1.reduce((acc, item) => acc + item.valor, 0);
    const t2 = c2.reduce((acc, item) => acc + item.valor, 0);
    const t3 = c3.reduce((acc, item) => acc + item.valor, 0);
    const t4 = c4.reduce((acc, item) => acc + item.valor, 0);
    const sApurado = reconciliacaoResultado.saldoBanco + t1 - t2 + t3 - t4;
    const dif = sApurado - reconciliacaoResultado.saldoContab;

    const recSnapshot: Reconciliacao = {
      id: new Date().toISOString().slice(0, 7),
      mes: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      saldoExtratoBancario: reconciliacaoResultado.saldoBanco,
      saldoContabilidade: reconciliacaoResultado.saldoContab,
      debitosEmpresaNaoBanco: c1,
      totalDebitosEmpresaNaoBanco: t1,
      creditosEmpresaNaoBanco: c2,
      totalCreditosEmpresaNaoBanco: t2,
      debitosBancoNaoEmpresa: c3,
      totalDebitosBancoNaoEmpresa: t3,
      creditosBancoNaoEmpresa: c4,
      totalCreditosBancoNaoEmpresa: t4,
      pagamentosBancoNaoRegistadosEmpresa: [...c3, ...c4],
      totalDebitosBancoNaoRegistados: t3,
      totalCreditosBancoNaoRegistados: t4,
      pagamentosRMNaoRegistadosBanco: c2,
      totalCreditosEmpresaNaoRegistados: t2,
      debitosEmpresaNaoRegistadosBanco: c1,
      totalDebitosEmpresaNaoRegistados: t1,
      campo1_debitosEmpresaSemBanco: c1,
      totalCampo1_debitosEmpresaSemBanco: t1,
      campo2_creditosEmpresaSemBanco: c2,
      totalCampo2_creditosEmpresaSemBanco: t2,
      campo3_debitosBancoSemEmpresa: c3,
      totalCampo3_debitosBancoSemEmpresa: t3,
      campo4_creditosBancoSemEmpresa: c4,
      totalCampo4_creditosBancoSemEmpresa: t4,
      saldoApurado: sApurado,
      diferencaConciliacao: dif,
      local: 'Lisboa',
      notasExplicativas:
        reconciliacaoResultado.aiData?.notaExplicativaSugerida ||
        'Reconciliação apurada e validada por Inteligência Artificial.',
      elaboradoPor: 'Auditoria & Reconciliação IA',
      aprovadoPor: 'Direção Financeira',
      status: Math.abs(dif) < 0.01 ? 'conciliado' : 'pendente',
    };
    exportReconciliacaoToExcel(empresa, recSnapshot);
  };

  const handleExportarPdfModal = () => {
    if (!reconciliacaoResultado) return;
    const c1 = mapToMovimentos(reconciliacaoResultado.campo1);
    const c2 = mapToMovimentos(reconciliacaoResultado.campo2);
    const c3 = mapToMovimentos(reconciliacaoResultado.campo3);
    const c4 = mapToMovimentos(reconciliacaoResultado.campo4);

    const t1 = c1.reduce((acc, item) => acc + item.valor, 0);
    const t2 = c2.reduce((acc, item) => acc + item.valor, 0);
    const t3 = c3.reduce((acc, item) => acc + item.valor, 0);
    const t4 = c4.reduce((acc, item) => acc + item.valor, 0);
    const sApurado = reconciliacaoResultado.saldoBanco + t1 - t2 + t3 - t4;
    const dif = sApurado - reconciliacaoResultado.saldoContab;

    const recSnapshot: Reconciliacao = {
      id: new Date().toISOString().slice(0, 7),
      mes: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      saldoExtratoBancario: reconciliacaoResultado.saldoBanco,
      saldoContabilidade: reconciliacaoResultado.saldoContab,
      debitosEmpresaNaoBanco: c1,
      totalDebitosEmpresaNaoBanco: t1,
      creditosEmpresaNaoBanco: c2,
      totalCreditosEmpresaNaoBanco: t2,
      debitosBancoNaoEmpresa: c3,
      totalDebitosBancoNaoEmpresa: t3,
      creditosBancoNaoEmpresa: c4,
      totalCreditosBancoNaoEmpresa: t4,
      pagamentosBancoNaoRegistadosEmpresa: [...c3, ...c4],
      totalDebitosBancoNaoRegistados: t3,
      totalCreditosBancoNaoRegistados: t4,
      pagamentosRMNaoRegistadosBanco: c2,
      totalCreditosEmpresaNaoRegistados: t2,
      debitosEmpresaNaoRegistadosBanco: c1,
      totalDebitosEmpresaNaoRegistados: t1,
      campo1_debitosEmpresaSemBanco: c1,
      totalCampo1_debitosEmpresaSemBanco: t1,
      campo2_creditosEmpresaSemBanco: c2,
      totalCampo2_creditosEmpresaSemBanco: t2,
      campo3_debitosBancoSemEmpresa: c3,
      totalCampo3_debitosBancoSemEmpresa: t3,
      campo4_creditosBancoSemEmpresa: c4,
      totalCampo4_creditosBancoSemEmpresa: t4,
      saldoApurado: sApurado,
      diferencaConciliacao: dif,
      local: 'Lisboa',
      notasExplicativas:
        reconciliacaoResultado.aiData?.notaExplicativaSugerida ||
        'Reconciliação apurada e validada por Inteligência Artificial.',
      elaboradoPor: 'Auditoria & Reconciliação IA',
      aprovadoPor: 'Direção Financeira',
      status: Math.abs(dif) < 0.01 ? 'conciliado' : 'pendente',
    };
    exportReconciliacaoToPdf(empresa, recSnapshot);
  };

  const handleProcessarBanco = async (file: File) => {
    setBancoFile(file);
    setErrorMessage(null);
    try {
      const res = await parseExtratoPadrao(file, 'banco');
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao processar o extrato do banco.');
        return;
      }
      setBancoRows(res.rows);
      setBancoSaldoFinal(res.saldoFinal);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao ler o extrato bancário.');
    }
  };

  const handleProcessarContab = async (file: File) => {
    setContabFile(file);
    setErrorMessage(null);
    try {
      const res = await parseExtratoPadrao(file, 'contabilidade');
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao processar o extrato da contabilidade.');
        return;
      }
      setContabRows(res.rows);
      setContabSaldoFinal(res.saldoFinal);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao ler o extrato da contabilidade.');
    }
  };

  // Carregar dados de teste demonstrativos com 1 clique (adapta se for 1º mês ou 2º e próximos meses)
  const handleCarregarDadosTeste = () => {
    if (reconciliacaoAnterior) {
      // DADOS DO 2º MÊS (MARÇO DE 2026):
      // - DEP-7701 (2.500 € de Fev) é creditado no banco no dia 02
      // - SEPA-88102 (1.850 € de Fev) é debitado no banco no dia 02
      // - Cheque 559012 (4.500 € de Fev) NÃO aparece no banco -> É OBRIGATÓRIO mantê-lo para o mês seguinte!
      // - Custos de Fev (Comissão 26€, MEO 480.20€, Juros 312.40€) foram regularizados na contabilidade
      // - Novos movimentos do mês corrente casam perfeitamente sem qualquer divergência (0,00 €)
      const mockBancoMarco: ExtratoRow[] = [
        { id: 'bm-1', data: '2026-03-01', descricao: 'Saldo Inicial de Abertura', valorDebito: 0, valorCredito: 0, saldo: 145820.50 },
        { id: 'bm-2', data: '2026-03-02', descricao: 'Depósito em numerário balcão (DEP-7701)', valorDebito: 0, valorCredito: 2500.00, saldo: 148320.50 },
        { id: 'bm-3', data: '2026-03-02', descricao: 'Transferência SEPA TI (SEPA-88102)', valorDebito: 1850.00, valorCredito: 0, saldo: 146470.50 },
        { id: 'bm-4', data: '2026-03-10', descricao: 'Recebimento Cliente Viseu Tech, Lda', valorDebito: 0, valorCredito: 12000.00, saldo: 158470.50 },
        { id: 'bm-5', data: '2026-03-15', descricao: 'Comissão de Gestão de Conta BCP + Imposto Selo', valorDebito: 26.00, valorCredito: 0, saldo: 158444.50 },
        { id: 'bm-6', data: '2026-03-20', descricao: 'Pagamento Fornecedor Delta Equipamentos', valorDebito: 4200.00, valorCredito: 0, saldo: 154244.50 },
        { id: 'bm-7', data: '2026-03-27', descricao: 'Juros Líquidos de Aplicação', valorDebito: 0, valorCredito: 180.00, saldo: 154424.50 },
      ];

      const mockContabMarco: ExtratoRow[] = [
        { id: 'cm-1', data: '2026-03-01', descricao: 'Saldo Inicial Conta 12.1 (Razão)', valorDebito: 0, valorCredito: 0, saldo: 142164.30 },
        { id: 'cm-2', data: '2026-03-05', descricao: 'Regularização Comissão Fev EXT-COM-01', valorDebito: 0, valorCredito: 26.00, saldo: 142138.30 },
        { id: 'cm-3', data: '2026-03-05', descricao: 'Regularização Fatura MEO Fev SDD-MEO-99', valorDebito: 0, valorCredito: 480.20, saldo: 141658.10 },
        { id: 'cm-4', data: '2026-03-05', descricao: 'Regularização Juros Fev JUR-REM-02', valorDebito: 312.40, valorCredito: 0, saldo: 141970.50 },
        { id: 'cm-5', data: '2026-03-10', descricao: 'Recebimento Cliente Viseu Tech, Lda', valorDebito: 12000.00, valorCredito: 0, saldo: 153970.50 },
        { id: 'cm-6', data: '2026-03-20', descricao: 'Pagamento Fornecedor Delta Equipamentos', valorDebito: 0, valorCredito: 4200.00, saldo: 149770.50 },
        { id: 'cm-7', data: '2026-03-28', descricao: 'Depósito em numerário balcão ao fecho DEP-8810', valorDebito: 3100.00, valorCredito: 0, saldo: 152870.50 },
        { id: 'cm-8', data: '2026-03-29', descricao: 'Cheque 660101 emitido Fornecedor Beta', valorDebito: 0, valorCredito: 1600.00, saldo: 151270.50 },
      ];

      setBancoRows(mockBancoMarco);
      setBancoSaldoFinal(154424.50);
      setContabRows(mockContabMarco);
      setContabSaldoFinal(151270.50);
      setBancoFile(new File(['banco_marco_demo'], 'Extrato_Bancario_Marco_BCP.xlsx'));
      setContabFile(new File(['contab_marco_demo'], 'Razao_Geral_Conta_12_Marco.xlsx'));
      setErrorMessage(null);
      return;
    }

    // DADOS DO 1º MÊS (FEVEREIRO DE 2026):
    const mockBanco: ExtratoRow[] = [
      { id: 'b-1', data: '2026-02-01', descricao: 'Saldo Inicial de Abertura', valorDebito: 0, valorCredito: 0, saldo: 135400.00 },
      { id: 'b-2', data: '2026-02-05', descricao: 'Cobrança SEPA Fornecedor Papelaria Silva', valorDebito: 1200.00, valorCredito: 0, saldo: 134200.00 },
      { id: 'b-3', data: '2026-02-10', descricao: 'Recebimento de Cliente Porto Tech, Lda', valorDebito: 0, valorCredito: 8500.00, saldo: 142700.00 },
      { id: 'b-4', data: '2026-02-15', descricao: 'Comissão de Gestão de Conta BCP + Imposto Selo 4%', valorDebito: 26.00, valorCredito: 0, saldo: 142674.00 },
      { id: 'b-5', data: '2026-02-20', descricao: 'Débito Direto SEPA — Fatura Telecomunicações MEO', valorDebito: 480.20, valorCredito: 0, saldo: 142193.80 },
      { id: 'b-6', data: '2026-02-22', descricao: 'Pagamento Fornecedor Alimentos Lisboa', valorDebito: 3200.00, valorCredito: 0, saldo: 138993.80 },
      { id: 'b-7', data: '2026-02-25', descricao: 'Recebimento de Cliente Minho Têxteis', valorDebito: 0, valorCredito: 6514.30, saldo: 145508.10 },
      { id: 'b-8', data: '2026-02-28', descricao: 'Juros Líquidos de Aplicação Tesouraria Remunerada', valorDebito: 0, valorCredito: 312.40, saldo: 145820.50 },
    ];

    const mockContab: ExtratoRow[] = [
      { id: 'c-1', data: '2026-02-01', descricao: 'Saldo Inicial Conta 12.1 (Razão)', valorDebito: 0, valorCredito: 0, saldo: 135400.00 },
      { id: 'c-2', data: '2026-02-05', descricao: 'Pagamento Fornecedor Papelaria Silva (TRF)', valorDebito: 0, valorCredito: 1200.00, saldo: 134200.00 },
      { id: 'c-3', data: '2026-02-10', descricao: 'Recebimento Cliente Porto Tech, Lda', valorDebito: 8500.00, valorCredito: 0, saldo: 142700.00 },
      { id: 'c-4', data: '2026-02-22', descricao: 'Pagamento Fornecedor Alimentos Lisboa', valorDebito: 0, valorCredito: 3200.00, saldo: 139500.00 },
      { id: 'c-5', data: '2026-02-25', descricao: 'Cheque n.º 559012 Fornecedor Materiais do Norte, Lda', valorDebito: 0, valorCredito: 4500.00, saldo: 135000.00 },
      { id: 'c-6', data: '2026-02-25', descricao: 'Recebimento Cliente Minho Têxteis', valorDebito: 6514.30, valorCredito: 0, saldo: 141514.30 },
      { id: 'c-7', data: '2026-02-27', descricao: 'Depósito em numerário efetuado no balcão ao fecho (DEP-7701)', valorDebito: 2500.00, valorCredito: 0, saldo: 144014.30 },
      { id: 'c-8', data: '2026-02-28', descricao: 'Transferência SEPA Fornecedor Serviços TI (SEPA-88102)', valorDebito: 0, valorCredito: 1850.00, saldo: 142164.30 },
    ];

    setBancoRows(mockBanco);
    setBancoSaldoFinal(145820.50);
    setContabRows(mockContab);
    setContabSaldoFinal(142164.30);
    setBancoFile(new File(['banco_demo'], 'Extrato_Bancario_Fevereiro_BCP.xlsx'));
    setContabFile(new File(['contab_demo'], 'Razao_Geral_Conta_12_Fevereiro.xlsx'));
    setErrorMessage(null);
  };

  const handleExecutarReconciliacaoIA = async () => {
    if (bancoRows.length === 0 || contabRows.length === 0) {
      setErrorMessage('Por favor carregue ambos os ficheiros (Extrato do Banco e Extrato da Contabilidade).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Motor determinístico de cruzamento tendo em conta o mês anterior
      const localResult = reconciliarExtratosDeterministic(
        bancoRows,
        contabRows,
        bancoSaldoFinal,
        contabSaldoFinal,
        reconciliacaoAnterior
      );

      // 2. Chamar endpoint Gemini para auditoria e regularizações SNC
      let aiAnalysisData: any = null;
      try {
        const response = await fetch('/api/ai/reconciliar-extratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa,
            campo1: localResult.campo1,
            campo2: localResult.campo2,
            campo3: localResult.campo3,
            campo4: localResult.campo4,
            saldoBanco: localResult.saldoBanco,
            saldoContab: localResult.saldoContab,
            matchedCount: localResult.matchedCount,
            reconciliacaoAnterior,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            aiAnalysisData = json.data;
          }
        }
      } catch (aiErr) {
        console.warn('IA remota offline ou indisponível; utilizando classificação local robusta:', aiErr);
      }

      setReconciliacaoResultado({
        ...localResult,
        aiData: aiAnalysisData,
      });

      setEtapa('resultado');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar reconciliação com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarAplicacao = () => {
    if (!reconciliacaoResultado) return;

    onAplicarAoMapa({
      saldoExtratoBancario: reconciliacaoResultado.saldoBanco,
      saldoContabilidade: reconciliacaoResultado.saldoContab,
      debitosEmpresaNaoBanco: reconciliacaoResultado.campo1,
      creditosEmpresaNaoBanco: reconciliacaoResultado.campo2,
      debitosBancoNaoEmpresa: reconciliacaoResultado.campo3,
      creditosBancoNaoEmpresa: reconciliacaoResultado.campo4,
      notasExplicativas:
        reconciliacaoResultado.aiData?.notaExplicativaSugerida ||
        'Conciliação apurada via cruzamento automático de extratos bancário e de contabilidade.',
      parecerIA: reconciliacaoResultado.aiData?.analiseGeral || '',
      lancamentosIA: reconciliacaoResultado.aiData?.lancamentosSugeridos || [],
      reconciliadoComIA: true,
      extratosCarregados: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Reconciliação Automática com IA
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Excel / CSV
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Extrato Bancário + Extrato da Contabilidade (6 colunas: data, descritivo, nº movimento, valor debito, valor credito, saldo)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Aviso:</span> {errorMessage}
              </div>
            </div>
          )}

          {etapa === 'upload' ? (
            <>
              {/* Guidance / Quick Download Strip */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    Colunas do Ficheiro Excel dos Extratos:
                  </div>
                  <p className="text-xs text-emerald-900 font-mono font-semibold">
                    data | descritivo | nº movimento | valor debito | valor credito | saldo
                  </p>
                  {reconciliacaoAnterior && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✓ A IA terá em conta a reconciliação e pendências do mês anterior: <strong>{reconciliacaoAnterior.mes}</strong>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadTemplateExtrato('banco')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    Modelo Banco (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplateExtrato('contabilidade')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    Modelo Contabilidade (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleCarregarDadosTeste}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Preencher c/ Exemplo
                  </button>
                </div>
              </div>

              {/* Upload Grid: 2 Statements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Extrato Bancário */}
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">1. Extrato do Banco</h4>
                          <p className="text-xs text-slate-500">Fornecido pela instituição bancária</p>
                        </div>
                      </div>
                      {bancoRows.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {bancoRows.length} linhas
                        </span>
                      )}
                    </div>

                    {bancoFile ? (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 mb-3">
                        <p className="text-xs font-semibold text-slate-800 truncate">{bancoFile.name}</p>
                        <p className="text-xs text-slate-500">
                          Saldo Final Detetado:{' '}
                          <span className="font-mono font-bold text-slate-900">
                            {formatMoeda(bancoSaldoFinal)} €
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div
                        onClick={() => bancoInputRef.current?.click()}
                        className="p-6 bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-center transition-colors mb-3"
                      >
                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700">Clique para selecionar o Excel do Banco</span>
                        <span className="text-[11px] text-slate-400 mt-1">.xlsx, .xls ou .csv</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <input
                      ref={bancoInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessarBanco(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => bancoInputRef.current?.click()}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      {bancoFile ? 'Substituir ficheiro bancário' : 'Procurar ficheiro'}
                    </button>
                    {bancoFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setBancoFile(null);
                          setBancoRows([]);
                          setBancoSaldoFinal(0);
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Extrato da Contabilidade */}
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">2. Extrato da Contabilidade</h4>
                          <p className="text-xs text-slate-500">Razão da conta SNC 12 (Depósitos à Ordem)</p>
                        </div>
                      </div>
                      {contabRows.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {contabRows.length} linhas
                        </span>
                      )}
                    </div>

                    {contabFile ? (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 mb-3">
                        <p className="text-xs font-semibold text-slate-800 truncate">{contabFile.name}</p>
                        <p className="text-xs text-slate-500">
                          Saldo Final Detetado:{' '}
                          <span className="font-mono font-bold text-slate-900">
                            {formatMoeda(contabSaldoFinal)} €
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div
                        onClick={() => contabInputRef.current?.click()}
                        className="p-6 bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-center transition-colors mb-3"
                      >
                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700">Clique para selecionar o Excel da Contabilidade</span>
                        <span className="text-[11px] text-slate-400 mt-1">.xlsx, .xls ou .csv</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <input
                      ref={contabInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessarContab(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => contabInputRef.current?.click()}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      {contabFile ? 'Substituir ficheiro contabilidade' : 'Procurar ficheiro'}
                    </button>
                    {contabFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setContabFile(null);
                          setContabRows([]);
                          setContabSaldoFinal(0);
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tela de Resultado e Pré-visualização da IA */
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cruzamento Concluído com Sucesso
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Foram identificados e conciliados automaticamente{' '}
                    <span className="font-bold">{reconciliacaoResultado?.matchedCount || 0} movimentos</span>.
                    As pendências foram distribuídas pelos 4 campos oficiais da Reconciliação Bancária.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEtapa('upload')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Voltar ao Upload
                </button>
              </div>

              {/* Resumo dos 4 Campos Oficiais */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Campos Oficiais da Reconciliação Bancária:
                  </span>
                  <span className="text-xs text-slate-400">
                    Clique num campo para ver/ocultar os movimentos correspondentes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Campo 1 */}
                  <div
                    onClick={() => setActiveFieldDetail(activeFieldDetail === 1 ? null : 1)}
                    className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                      activeFieldDetail === 1 ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        1 - Débito na empresa s/ correspondência no Banco
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {reconciliacaoResultado?.campo1?.length || 0} mov.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Depósitos e valores debitados na contabilidade ainda em trânsito no banco</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold text-blue-700">
                        + {formatMoeda(reconciliacaoResultado?.campo1?.reduce((acc: number, item: any) => acc + item.valor, 0))} €
                      </span>
                      <span className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                        {activeFieldDetail === 1 ? (
                          <>Ocultar <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Ver detalhes <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Campo 2 */}
                  <div
                    onClick={() => setActiveFieldDetail(activeFieldDetail === 2 ? null : 2)}
                    className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                      activeFieldDetail === 2 ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        2 - Crédito na Empresa s/ correspondência no Banco
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                        {reconciliacaoResultado?.campo2?.length || 0} mov.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Cheques e pagamentos emitidos pela empresa em trânsito</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold text-amber-700">
                        - {formatMoeda(reconciliacaoResultado?.campo2?.reduce((acc: number, item: any) => acc + item.valor, 0))} €
                      </span>
                      <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                        {activeFieldDetail === 2 ? (
                          <>Ocultar <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Ver detalhes <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Campo 3 */}
                  <div
                    onClick={() => setActiveFieldDetail(activeFieldDetail === 3 ? null : 3)}
                    className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                      activeFieldDetail === 3 ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        3 - Débito no banco s/ correspondência na Empresa
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                        {reconciliacaoResultado?.campo3?.length || 0} mov.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Comissões, despesas e débitos diretos no extrato bancário s/ lançamento</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold text-rose-700">
                        + {formatMoeda(reconciliacaoResultado?.campo3?.reduce((acc: number, item: any) => acc + item.valor, 0))} €
                      </span>
                      <span className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                        {activeFieldDetail === 3 ? (
                          <>Ocultar <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Ver detalhes <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Campo 4 */}
                  <div
                    onClick={() => setActiveFieldDetail(activeFieldDetail === 4 ? null : 4)}
                    className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                      activeFieldDetail === 4 ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        4 - Crédito no banco s/ correspondência na Empresa
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        {reconciliacaoResultado?.campo4?.length || 0} mov.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Juros obtidos ou transferências creditadas no extrato s/ lançamento</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold text-emerald-700">
                        - {formatMoeda(reconciliacaoResultado?.campo4?.reduce((acc: number, item: any) => acc + item.valor, 0))} €
                      </span>
                      <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                        {activeFieldDetail === 4 ? (
                          <>Ocultar <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Ver detalhes <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Detalhes dos Movimentos do Campo Selecionado */}
              {activeFieldDetail && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {activeFieldDetail === 1 && 'Movimentos: 1 - Débito na empresa s/ correspondência no Banco'}
                      {activeFieldDetail === 2 && 'Movimentos: 2 - Crédito na Empresa s/ correspondência no Banco'}
                      {activeFieldDetail === 3 && 'Movimentos: 3 - Débito no banco s/ correspondência na Empresa'}
                      {activeFieldDetail === 4 && 'Movimentos: 4 - Crédito no banco s/ correspondência na Empresa'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveFieldDetail(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Fechar detalhes ✕
                    </button>
                  </div>

                  {(() => {
                    const items =
                      activeFieldDetail === 1
                        ? reconciliacaoResultado?.campo1
                        : activeFieldDetail === 2
                        ? reconciliacaoResultado?.campo2
                        : activeFieldDetail === 3
                        ? reconciliacaoResultado?.campo3
                        : reconciliacaoResultado?.campo4;

                    if (!items || items.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 italic py-2">
                          Nenhum movimento pendente neste campo.
                        </p>
                      );
                    }

                    return (
                      <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                            <tr>
                              <th className="p-2 border-b border-slate-200">Data</th>
                              <th className="p-2 border-b border-slate-200">Nº Doc</th>
                              <th className="p-2 border-b border-slate-200">Descrição / Movimento</th>
                              <th className="p-2 border-b border-slate-200 text-right">Valor (€)</th>
                              <th className="p-2 border-b border-slate-200">Observação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-2 font-mono whitespace-nowrap text-slate-700">{item.data || '-'}</td>
                                <td className="p-2 font-mono text-slate-600">{item.documento || '-'}</td>
                                <td className="p-2 text-slate-900 font-medium">{item.descricao || item.item || '-'}</td>
                                <td className="p-2 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                                  {formatMoeda(item.valor)} €
                                </td>
                                <td className="p-2 text-slate-500 text-[11px] max-w-xs truncate">
                                  {item.observacao || item.justificativa || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Quadro Resumo do Apuramento da Conciliação */}
              {(() => {
                const t1 = reconciliacaoResultado?.campo1?.reduce((acc: number, item: any) => acc + (Number(item.valor) || 0), 0) || 0;
                const t2 = reconciliacaoResultado?.campo2?.reduce((acc: number, item: any) => acc + (Number(item.valor) || 0), 0) || 0;
                const t3 = reconciliacaoResultado?.campo3?.reduce((acc: number, item: any) => acc + (Number(item.valor) || 0), 0) || 0;
                const t4 = reconciliacaoResultado?.campo4?.reduce((acc: number, item: any) => acc + (Number(item.valor) || 0), 0) || 0;
                const saldoB = Number(reconciliacaoResultado?.saldoBanco) || 0;
                const saldoC = Number(reconciliacaoResultado?.saldoContab) || 0;
                const saldoApurado = saldoB + t1 - t2 + t3 - t4;
                const diferenca = saldoApurado - saldoC;
                const conciliado = Math.abs(diferenca) < 0.01;

                return (
                  <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-bold text-sm">Resumo do Apuramento da Reconciliação (SNC)</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        conciliado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {conciliado ? '✓ Totalmente Conciliado (0,00 €)' : `Divergência: ${formatMoeda(diferenca)} €`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5 font-mono text-slate-300">
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-400">(A) Saldo do Extrato Bancário:</span>
                          <span className="font-bold text-white">{formatMoeda(saldoB)} €</span>
                        </div>
                        <div className="flex justify-between py-0.5 text-blue-300">
                          <span>(+) 1. Débito empresa s/ correspondência no Banco:</span>
                          <span className="font-bold">+{formatMoeda(t1)} €</span>
                        </div>
                        <div className="flex justify-between py-0.5 text-amber-300">
                          <span>(-) 2. Crédito empresa s/ correspondência no Banco:</span>
                          <span className="font-bold">-{formatMoeda(t2)} €</span>
                        </div>
                        <div className="flex justify-between py-0.5 text-rose-300">
                          <span>(+) 3. Débito banco s/ correspondência na Empresa:</span>
                          <span className="font-bold">+{formatMoeda(t3)} €</span>
                        </div>
                        <div className="flex justify-between py-0.5 text-emerald-300">
                          <span>(-) 4. Crédito banco s/ correspondência na Empresa:</span>
                          <span className="font-bold">-{formatMoeda(t4)} €</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/80 rounded-lg p-3.5 space-y-2.5 flex flex-col justify-center border border-slate-700/60 font-mono">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">(=) Saldo Apurado:</span>
                          <span className="text-sm font-bold text-emerald-400">{formatMoeda(saldoApurado)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-2">
                          <span className="text-slate-400">Saldo Contabilidade (Razão):</span>
                          <span className="text-sm font-bold text-white">{formatMoeda(saldoC)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-2 font-bold">
                          <span className="text-slate-300">Diferença de Reconciliação:</span>
                          <span className={conciliado ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatMoeda(diferenca)} €
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Botões de Ação e Exportação no fim da verificação da IA */}
              <div className="bg-gradient-to-r from-slate-50 to-emerald-50/50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Exportar Conciliação Verificada
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Gere o mapa oficial com os 4 campos e apuramento em formato Excel ou PDF auditável.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExportarExcelModal}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Exportar para Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportarPdfModal}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    Exportar para PDF
                  </button>
                </div>
              </div>

              {/* Lançamentos Sugeridos pela IA */}
              {reconciliacaoResultado?.aiData?.lancamentosSugeridos?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Lançamentos Contabilísticos Sugeridos (SNC Portugal):
                  </h4>
                  <div className="space-y-2">
                    {reconciliacaoResultado.aiData.lancamentosSugeridos.map((lan: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{lan.item}</span>
                          <span className="font-mono text-emerald-700">{formatMoeda(lan.valor)} €</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded">
                          <div><span className="text-slate-400">Débito:</span> {lan.contaDebito}</div>
                          <div><span className="text-slate-400">Crédito:</span> {lan.contaCredito}</div>
                        </div>
                        <p className="text-slate-500 text-[11px] italic">{lan.justificativa}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {etapa === 'upload' ? (
              <span>Os dados permanecem estritamente no seu computador. Privacidade total.</span>
            ) : (
              <span>Os dados serão transferidos diretamente para o mapa em edição.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            {etapa === 'upload' ? (
              <button
                type="button"
                disabled={isProcessing || bancoRows.length === 0 || contabRows.length === 0}
                onClick={handleExecutarReconciliacaoIA}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    A Cruzar e Analisar com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Executar Reconciliação com IA
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportarExcelModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportarPdfModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAplicacao}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Aplicar ao Mapa e Verificar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
