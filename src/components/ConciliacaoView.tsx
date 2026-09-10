import React, { useState, useEffect, useRef } from 'react';
import { Empresa, Reconciliacao, MovimentoConciliacao } from '../types';
import { MovimentosTable } from './MovimentosTable';
import {
  calculate4FieldsTotals,
  formatMoeda,
  formatValorComMoeda,
  parseNumberSafely,
  formatMesIdToLabel,
} from '../utils/calculations';
import { exportReconciliacaoToExcel, exportReconciliacaoToPdf } from '../utils/exportTools';
import { AIAuditPanel } from './AIAuditPanel';
import { GuiaSNCModal } from './GuiaSNCModal';
import { ReconciliarIAExcelModal } from './ReconciliarIAExcelModal';
import {
  Save,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  User,
  History,
  Sparkles,
  Scale,
} from 'lucide-react';

interface ConciliacaoViewProps {
  empresa: Empresa;
  reconciliacao: Reconciliacao;
  isPrimeiraReconciliacao?: boolean;
  reconciliacaoAnterior?: Reconciliacao | null;
  onSave: (updated: Reconciliacao) => Promise<void>;
  isSaving: boolean;
  saveSuccessMessage?: string | null;
}

export const ConciliacaoView: React.FC<ConciliacaoViewProps> = ({
  empresa,
  reconciliacao,
  isPrimeiraReconciliacao = false,
  reconciliacaoAnterior = null,
  onSave,
  isSaving,
  saveSuccessMessage,
}) => {
  const moedaSymbol = '€';

  const [saldoExtrato, setSaldoExtrato] = useState<number>(
    reconciliacao.saldoExtratoBancario || 0
  );
  const [saldoContabilidade, setSaldoContabilidade] = useState<number>(
    reconciliacao.saldoContabilidade || 0
  );

  // The 4 canonical reconciliation fields
  const [campo1, setCampo1] = useState<MovimentoConciliacao[]>(
    reconciliacao.debitosEmpresaNaoBanco || reconciliacao.debitosEmpresaNaoRegistadosBanco || []
  );
  const [campo2, setCampo2] = useState<MovimentoConciliacao[]>(
    reconciliacao.creditosEmpresaNaoBanco || reconciliacao.pagamentosRMNaoRegistadosBanco || []
  );
  const [campo3, setCampo3] = useState<MovimentoConciliacao[]>(
    reconciliacao.debitosBancoNaoEmpresa ||
      (reconciliacao.pagamentosBancoNaoRegistadosEmpresa
        ? reconciliacao.pagamentosBancoNaoRegistadosEmpresa.filter((m) => m.tipo === 'debito')
        : [])
  );
  const [campo4, setCampo4] = useState<MovimentoConciliacao[]>(
    reconciliacao.creditosBancoNaoEmpresa ||
      (reconciliacao.pagamentosBancoNaoRegistadosEmpresa
        ? reconciliacao.pagamentosBancoNaoRegistadosEmpresa.filter((m) => m.tipo === 'credito')
        : [])
  );

  const [local, setLocal] = useState<string>(
    reconciliacao.local || 'Lisboa'
  );
  const [showAIAudit, setShowAIAudit] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isGuiaOpen, setIsGuiaOpen] = useState<boolean>(false);
  const [isReconciliarIAOpen, setIsReconciliarIAOpen] = useState<boolean>(false);
  const [saveLocalNotice, setSaveLocalNotice] = useState<string | null>(null);
  const [reconciliadoComIASucesso, setReconciliadoComIASucesso] = useState<boolean>(false);
  const [isReconciliadoComIA, setIsReconciliadoComIA] = useState<boolean>(
    Boolean(reconciliacao.reconciliadoComIA)
  );
  const promptedMonthsRef = useRef<Record<string, boolean>>({});

  // Sync state when incoming reconciliacao changes
  useEffect(() => {
    setSaldoExtrato(reconciliacao.saldoExtratoBancario || 0);
    setSaldoContabilidade(reconciliacao.saldoContabilidade || 0);
    setCampo1(reconciliacao.debitosEmpresaNaoBanco || reconciliacao.debitosEmpresaNaoRegistadosBanco || []);
    setCampo2(reconciliacao.creditosEmpresaNaoBanco || reconciliacao.pagamentosRMNaoRegistadosBanco || []);
    setCampo3(
      reconciliacao.debitosBancoNaoEmpresa ||
        (reconciliacao.pagamentosBancoNaoRegistadosEmpresa
          ? reconciliacao.pagamentosBancoNaoRegistadosEmpresa.filter((m) => m.tipo === 'debito')
          : [])
    );
    setCampo4(
      reconciliacao.creditosBancoNaoEmpresa ||
        (reconciliacao.pagamentosBancoNaoRegistadosEmpresa
          ? reconciliacao.pagamentosBancoNaoRegistadosEmpresa.filter((m) => m.tipo === 'credito')
          : [])
    );
    setLocal(reconciliacao.local || 'Lisboa');
    setIsReconciliadoComIA(Boolean(reconciliacao.reconciliadoComIA));
    setHasUnsavedChanges(false);
    setSaveLocalNotice(null);
    setReconciliadoComIASucesso(false);

    // Quando abre o 2º mês e próximos meses: pedir logo os extratos do banco e contabilidade para a IA reconciliar!
    if (!isPrimeiraReconciliacao && reconciliacao?.id) {
      if (!promptedMonthsRef.current[reconciliacao.id]) {
        promptedMonthsRef.current[reconciliacao.id] = true;
        // Se ainda não foi reconciliado com IA:
        if (!reconciliacao.reconciliadoComIA) {
          setIsReconciliarIAOpen(true);
        }
      }
    }
  }, [reconciliacao.id, reconciliacao.mes, isPrimeiraReconciliacao, reconciliacao.reconciliadoComIA]);

  // Real-time calculation of the 4 categories
  const totals = calculate4FieldsTotals(
    saldoExtrato,
    campo1,
    campo2,
    campo3,
    campo4,
    saldoContabilidade
  );

  const handleTriggerSave = async () => {
    setSaveLocalNotice(null);
    const updatedData: Reconciliacao = {
      ...reconciliacao,
      saldoExtratoBancario: Number(saldoExtrato) || 0,
      saldoContabilidade: Number(saldoContabilidade) || 0,
      // 4 Canonical Fields
      campo1_debitosEmpresaSemBanco: campo1,
      campo2_creditosEmpresaSemBanco: campo2,
      campo3_debitosBancoSemEmpresa: campo3,
      campo4_creditosBancoSemEmpresa: campo4,
      totalCampo1_debitosEmpresaSemBanco: totals.totalCampo1,
      totalCampo2_creditosEmpresaSemBanco: totals.totalCampo2,
      totalCampo3_debitosBancoSemEmpresa: totals.totalCampo3,
      totalCampo4_creditosBancoSemEmpresa: totals.totalCampo4,
      debitosEmpresaNaoBanco: campo1,
      totalDebitosEmpresaNaoBanco: totals.totalCampo1,
      creditosEmpresaNaoBanco: campo2,
      totalCreditosEmpresaNaoBanco: totals.totalCampo2,
      debitosBancoNaoEmpresa: campo3,
      totalDebitosBancoNaoEmpresa: totals.totalCampo3,
      creditosBancoNaoEmpresa: campo4,
      totalCreditosBancoNaoEmpresa: totals.totalCampo4,
      // Backward compatibility fields
      pagamentosBancoNaoRegistadosEmpresa: [...campo3, ...campo4],
      totalDebitosBancoNaoRegistados: totals.totalCampo3,
      totalCreditosBancoNaoRegistados: totals.totalCampo4,
      pagamentosRMNaoRegistadosBanco: campo2,
      totalCreditosEmpresaNaoRegistados: totals.totalCampo2,
      debitosEmpresaNaoRegistadosBanco: campo1,
      totalDebitosEmpresaNaoRegistados: totals.totalCampo1,
      saldoApurado: totals.saldoApurado,
      diferencaConciliacao: totals.diferencaConciliacao,
      reconciliadoComIA: isReconciliadoComIA || !isPrimeiraReconciliacao,
      local,
      status: totals.isConciliado ? 'conciliado' : 'pendente',
    };

    await onSave(updatedData);
    setHasUnsavedChanges(false);
    setSaveLocalNotice('Conciliação gravada com sucesso!');
    setTimeout(() => {
      setSaveLocalNotice(null);
    }, 4000);
  };

  const handleExportExcel = () => {
    const currentSnapshot: Reconciliacao = {
      ...reconciliacao,
      saldoExtratoBancario: saldoExtrato,
      saldoContabilidade: saldoContabilidade,
      debitosEmpresaNaoBanco: campo1,
      totalDebitosEmpresaNaoBanco: totals.totalCampo1,
      creditosEmpresaNaoBanco: campo2,
      totalCreditosEmpresaNaoBanco: totals.totalCampo2,
      debitosBancoNaoEmpresa: campo3,
      totalDebitosBancoNaoEmpresa: totals.totalCampo3,
      creditosBancoNaoEmpresa: campo4,
      totalCreditosBancoNaoEmpresa: totals.totalCampo4,
      pagamentosBancoNaoRegistadosEmpresa: [...campo3, ...campo4],
      totalDebitosBancoNaoRegistados: totals.totalCampo3,
      totalCreditosBancoNaoRegistados: totals.totalCampo4,
      pagamentosRMNaoRegistadosBanco: campo2,
      totalCreditosEmpresaNaoRegistados: totals.totalCampo2,
      debitosEmpresaNaoRegistadosBanco: campo1,
      totalDebitosEmpresaNaoRegistados: totals.totalCampo1,
      saldoApurado: totals.saldoApurado,
      diferencaConciliacao: totals.diferencaConciliacao,
      elaboradoPor: reconciliacao.elaboradoPor || '',
      aprovadoPor: reconciliacao.aprovadoPor || '',
      local,
      notasExplicativas: reconciliacao.notasExplicativas || '',
    };
    exportReconciliacaoToExcel(empresa, currentSnapshot);
  };

  const handleExportPdf = () => {
    const currentSnapshot: Reconciliacao = {
      ...reconciliacao,
      saldoExtratoBancario: saldoExtrato,
      saldoContabilidade: saldoContabilidade,
      debitosEmpresaNaoBanco: campo1,
      totalDebitosEmpresaNaoBanco: totals.totalCampo1,
      creditosEmpresaNaoBanco: campo2,
      totalCreditosEmpresaNaoBanco: totals.totalCampo2,
      debitosBancoNaoEmpresa: campo3,
      totalDebitosBancoNaoEmpresa: totals.totalCampo3,
      creditosBancoNaoEmpresa: campo4,
      totalCreditosBancoNaoEmpresa: totals.totalCampo4,
      pagamentosBancoNaoRegistadosEmpresa: [...campo3, ...campo4],
      totalDebitosBancoNaoRegistados: totals.totalCampo3,
      totalCreditosBancoNaoRegistados: totals.totalCampo4,
      pagamentosRMNaoRegistadosBanco: campo2,
      totalCreditosEmpresaNaoRegistados: totals.totalCampo2,
      debitosEmpresaNaoRegistadosBanco: campo1,
      totalDebitosEmpresaNaoRegistados: totals.totalCampo1,
      saldoApurado: totals.saldoApurado,
      diferencaConciliacao: totals.diferencaConciliacao,
      elaboradoPor: reconciliacao.elaboradoPor || '',
      aprovadoPor: reconciliacao.aprovadoPor || '',
      local,
      notasExplicativas: reconciliacao.notasExplicativas || '',
    };
    exportReconciliacaoToPdf(empresa, currentSnapshot);
  };

  const handleAplicarReconciliacaoIA = (dados: {
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
  }) => {
    setSaldoExtrato(dados.saldoExtratoBancario);
    setSaldoContabilidade(dados.saldoContabilidade);
    setCampo1(dados.debitosEmpresaNaoBanco || []);
    setCampo2(dados.creditosEmpresaNaoBanco || []);
    setCampo3(dados.debitosBancoNaoEmpresa || []);
    setCampo4(dados.creditosBancoNaoEmpresa || []);
    setIsReconciliadoComIA(true);
    setReconciliadoComIASucesso(true);
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6 pb-12">
      <GuiaSNCModal isOpen={isGuiaOpen} onClose={() => setIsGuiaOpen(false)} />

      <ReconciliarIAExcelModal
        isOpen={isReconciliarIAOpen}
        onClose={() => setIsReconciliarIAOpen(false)}
        empresa={empresa}
        reconciliacaoAnterior={reconciliacaoAnterior}
        onAplicarAoMapa={handleAplicarReconciliacaoIA}
      />

      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-lg">
            <Landmark className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Mapa de Conciliação Bancária
              </h2>
              {totals.isConciliado ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CONCILIADO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  DIFERENÇA: {formatValorComMoeda(totals.diferencaConciliacao, 'EUR')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{empresa.nome}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{reconciliacao.mes}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                SNC Portugal
              </span>
              {reconciliacao.baseadoNoMesAnterior && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <History className="w-3 h-3 text-slate-400" />
                    Baseado em {formatMesIdToLabel(reconciliacao.baseadoNoMesAnterior)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Main AI Reconciliation from 2 Excel Statements Button */}
          <button
            type="button"
            onClick={() => setIsReconciliarIAOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all shadow-xs border border-emerald-600"
            title="Enviar Extrato do Banco + Extrato da Contabilidade em Excel e Reconciliar com IA"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Reconciliar Extratos com IA (Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGuiaOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
            title="Consultar Leis, Normativo SNC (DL 158/2009) e NCRF 27"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Critérios SNC</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAIAudit((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs border ${
              showAIAudit
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Alternar painel de Auditoria & Verificação com IA"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Auditoria IA</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Exportar para folha de cálculo Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Exportar para relatório PDF"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            PDF
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Imprimir"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTriggerSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            {isSaving ? 'A Gravar...' : 'Gravar Alterações'}
          </button>
        </div>
      </div>

      {(saveSuccessMessage || saveLocalNotice) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage || saveLocalNotice}</span>
        </div>
      )}

      {/* Workflow Banner: 1.ª Reconciliação (Manual) vs Meses Seguintes (IA com Excel 6 colunas) */}
      {isPrimeiraReconciliacao ? (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg shrink-0 mt-0.5">
              <Landmark className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-blue-950">
                  1.ª Reconciliação — Carregamento à Mão nos 4 Campos
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-200 text-blue-800 uppercase tracking-wide">
                  Histórico Inicial
                </span>
              </div>
              <p className="text-blue-800 mt-1 leading-relaxed">
                Apenas na 1.ª conciliação os movimentos em trânsito são carregados à mão nos 4 campos regulamentares: 
                <strong> 1 - Débito na Empresa s/ correspondência no Banco</strong>, 
                <strong> 2 - Crédito na Empresa s/ correspondência no Banco</strong>, 
                <strong> 3 - Débito no Banco s/ correspondência na Empresa</strong> e 
                <strong> 4 - Crédito no Banco s/ correspondência na Empresa</strong>. 
                Use o botão <strong>+ Adicionar Linha</strong> para adicionar quantas linhas necessitar em cada campo e registe notas individuais em cada linha.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-emerald-950 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-emerald-950">
                    Reconciliação Automática por Inteligência Artificial
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-200 text-emerald-900 uppercase font-semibold">
                    {isReconciliadoComIA ? 'Extratos Processados' : 'Mês Seguinte'}
                  </span>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  Extrato Bancário e Extrato da Contabilidade com as 6 colunas oficiais (<strong>data, descritivo, nº movimento, valor debito, valor credito, saldo</strong>).
                  {reconciliacaoAnterior?.mes ? ` Continuidade com pendências de ${reconciliacaoAnterior.mes}.` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReconciliarIAOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all shadow-xs border border-emerald-600 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              {isReconciliadoComIA ? 'Reabrir Extratos Excel (IA)' : 'Anexar Extratos Excel e Reconciliar'}
            </button>
          </div>

          {reconciliadoComIASucesso && (
            <div className="p-4 bg-emerald-100/90 border-2 border-emerald-500 rounded-xl text-xs text-emerald-950 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-700 text-white rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    Reconciliação Apurada pela IA — Verificação do Utilizador
                  </h4>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                    Os movimentos foram apurados e distribuídos pelos <strong>4 campos da conciliação</strong>.
                    <strong> Verifique agora se está tudo correto:</strong> confirme os valores, adicione ou remova linhas se necessário, complete as observações e, quando estiver em concordância, clique em <strong>Gravar Conciliação</strong> no topo direito.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReconciliadoComIASucesso(false)}
                className="text-emerald-800 hover:text-emerald-950 font-bold text-xs p-1"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ficha Técnica da Empresa */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md">
        <div className="border-b border-slate-700/80 pb-4 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest block">
                Ficha Técnica de Controlo Contabilístico
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
                SNC Portugal
              </span>
              {empresa.nif && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  NIF: {empresa.nif}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{empresa.nome}</h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Mês de Referência:</span>
            <span className="text-base font-bold text-emerald-300 font-mono">
              {reconciliacao.mes}
            </span>
          </div>
        </div>

        {/* Bank details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Instituição Bancária
            </span>
            <span className="font-semibold text-white text-sm">
              {empresa.banco || 'Não especificado'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Normativo & Moeda
            </span>
            <span className="font-mono text-emerald-400 text-sm font-semibold">
              SNC • EUR (€)
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Código da Conta (Razão SNC)
            </span>
            <span className="font-mono text-emerald-400 text-sm font-semibold">
              {empresa.codigoConta || '12.1 Depósitos à Ordem'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Localidade
            </span>
            <input
              type="text"
              value={local}
              onChange={(e) => {
                setLocal(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="bg-transparent border-b border-slate-600 focus:border-emerald-400 text-white font-medium text-sm w-full outline-none"
              placeholder="Ex: Lisboa ou Porto"
            />
          </div>
        </div>
      </div>

      {/* BLOCO (A) Saldo do Extrato Bancário */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-sm">
            (A)
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900 block">
              Saldo do Extrato Bancário
            </label>
            <p className="text-xs text-slate-500">
              Saldo oficial comprovado pelo extrato bancário à data de encerramento do mês.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-slate-400">{moedaSymbol}</span>
          <input
            type="number"
            step="0.01"
            value={saldoExtrato || ''}
            onChange={(e) => {
              setSaldoExtrato(parseNumberSafely(e.target.value));
              setHasUnsavedChanges(true);
            }}
            placeholder="0.00"
            className="w-52 py-2 px-3 text-right font-mono text-base font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 text-slate-900"
          />
        </div>
      </div>

      {/* AS 4 TABELAS OFICIAIS DE RECONCILIAÇÃO ESPECIFICADAS PELO UTILIZADOR */}

      {/* CAMPO 1: (+) Débito na Empresa s/ correspondência no Banco */}
      <MovimentosTable
        title="(+) 1 - Débito na Empresa s/ correspondência no Banco"
        tableType="campo1"
        sign="+"
        codeLetter="1"
        items={campo1}
        moedaSymbol={moedaSymbol}
        onChangeItems={(items) => {
          setCampo1(items);
          setHasUnsavedChanges(true);
        }}
        subtotalsText={`Subtotal Campo 1 (Débitos Empresa s/ Banco): ${formatValorComMoeda(
          totals.totalCampo1,
          'EUR'
        )}`}
      />

      {/* CAMPO 2: (-) Crédito na Empresa s/ correspondência no Banco */}
      <MovimentosTable
        title="(-) 2 - Crédito na Empresa s/ correspondência no Banco"
        tableType="campo2"
        sign="-"
        codeLetter="2"
        items={campo2}
        moedaSymbol={moedaSymbol}
        onChangeItems={(items) => {
          setCampo2(items);
          setHasUnsavedChanges(true);
        }}
        subtotalsText={`Subtotal Campo 2 (Créditos Empresa s/ Banco): ${formatValorComMoeda(
          totals.totalCampo2,
          'EUR'
        )}`}
      />

      {/* CAMPO 3: (+) Débito no Banco s/ correspondência na Empresa */}
      <MovimentosTable
        title="(+) 3 - Débito no Banco s/ correspondência na Empresa"
        tableType="campo3"
        sign="+"
        codeLetter="3"
        items={campo3}
        moedaSymbol={moedaSymbol}
        onChangeItems={(items) => {
          setCampo3(items);
          setHasUnsavedChanges(true);
        }}
        subtotalsText={`Subtotal Campo 3 (Débitos Banco s/ Empresa): ${formatValorComMoeda(
          totals.totalCampo3,
          'EUR'
        )}`}
      />

      {/* CAMPO 4: (-) Crédito no Banco s/ correspondência na Empresa */}
      <MovimentosTable
        title="(-) 4 - Crédito no Banco s/ correspondência na Empresa"
        tableType="campo4"
        sign="-"
        codeLetter="4"
        items={campo4}
        moedaSymbol={moedaSymbol}
        onChangeItems={(items) => {
          setCampo4(items);
          setHasUnsavedChanges(true);
        }}
        subtotalsText={`Subtotal Campo 4 (Créditos Banco s/ Empresa): ${formatValorComMoeda(
          totals.totalCampo4,
          'EUR'
        )}`}
      />

      {/* Resumo do Apuramento da Conciliação */}
      <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Apuramento Final da Conciliação
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              [Fórmula: Saldo Banco + (1) - (2) + (3) - (4)]
            </span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Alterações não gravadas
            </span>
          )}
        </div>

        {/* Calculations breakdown cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {/* Card 1: Saldo Apurado */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">
                Saldo Apurado
              </span>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                A + (1) - (2) + (3) - (4)
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatMoeda(totals.saldoApurado)} <span className="text-xs text-slate-500 font-normal">{moedaSymbol}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Saldo bancário ajustado pelos 4 campos de correspondência pendente.
            </p>
          </div>

          {/* Card 2: Saldo da Contabilidade */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">
                Saldo da Contabilidade
              </span>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                Razão SNC (Conta 12)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={saldoContabilidade || ''}
                onChange={(e) => {
                  setSaldoContabilidade(parseNumberSafely(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-full text-2xl font-bold font-mono text-slate-900 bg-transparent border-b border-slate-300 focus:border-slate-800 outline-none"
              />
              <span className="text-xs text-slate-500 font-normal">{moedaSymbol}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Saldo final do Livro Razão da conta 12 à data da conciliação.
            </p>
          </div>

          {/* Card 3: Diferença de Conciliação */}
          <div
            className={`p-4 rounded-xl border space-y-2 transition-all ${
              totals.isConciliado
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/90 border-rose-400 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider">
                Diferença de Conciliação
              </span>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  totals.isConciliado
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-rose-200 text-rose-900'
                }`}
              >
                {totals.isConciliado ? 'Correto (0,00)' : 'Divergência'}
              </span>
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                totals.isConciliado ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatMoeda(totals.diferencaConciliacao)} <span className="text-xs font-normal">{moedaSymbol}</span>
            </div>
            <p
              className={`text-[11px] font-medium ${
                totals.isConciliado ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {totals.isConciliado
                ? '✓ Conciliação perfeita! O saldo apurado confere com o razão.'
                : '⚠ Existe divergência entre o saldo apurado e o razão da contabilidade.'}
            </p>
          </div>
        </div>

        {/* Formulas table summary */}
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] font-sans">Saldo Banco (A)</span>
            <span className="font-semibold text-slate-800">{formatMoeda(saldoExtrato)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-sans">(+) 1 - Déb. Empresa</span>
            <span className="font-semibold text-blue-800">+{formatMoeda(totals.totalCampo1)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-sans">(-) 2 - Créd. Empresa</span>
            <span className="font-semibold text-amber-800">-{formatMoeda(totals.totalCampo2)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-sans">(+) 3 - Déb. Banco</span>
            <span className="font-semibold text-rose-800">+{formatMoeda(totals.totalCampo3)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-sans">(-) 4 - Créd. Banco</span>
            <span className="font-semibold text-emerald-800">-{formatMoeda(totals.totalCampo4)}</span>
          </div>
        </div>

        {/* Painel de Auditoria IA */}
        {showAIAudit && (
          <div className="print:hidden mt-6">
            <AIAuditPanel
              empresa={empresa}
              reconciliacao={{
                ...reconciliacao,
                saldoExtratoBancario: saldoExtrato,
                saldoContabilidade: saldoContabilidade,
                debitosEmpresaNaoBanco: campo1,
                totalDebitosEmpresaNaoBanco: totals.totalCampo1,
                creditosEmpresaNaoBanco: campo2,
                totalCreditosEmpresaNaoBanco: totals.totalCampo2,
                debitosBancoNaoEmpresa: campo3,
                totalDebitosBancoNaoEmpresa: totals.totalCampo3,
                creditosBancoNaoEmpresa: campo4,
                totalCreditosBancoNaoEmpresa: totals.totalCampo4,
                pagamentosBancoNaoRegistadosEmpresa: [...campo3, ...campo4],
                totalDebitosBancoNaoRegistados: totals.totalCampo3,
                totalCreditosBancoNaoRegistados: totals.totalCampo4,
                pagamentosRMNaoRegistadosBanco: campo2,
                totalCreditosEmpresaNaoRegistados: totals.totalCampo2,
                debitosEmpresaNaoRegistadosBanco: campo1,
                totalDebitosEmpresaNaoRegistados: totals.totalCampo1,
                saldoApurado: totals.saldoApurado,
                diferencaConciliacao: totals.diferencaConciliacao,
                local,
                notasExplicativas: reconciliacao.notasExplicativas || '',
              }}
              onApplyNotaExplicativa={() => {
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        )}

        {/* Bottom Actions & Export */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Data: <strong>{new Date().toLocaleDateString('pt-PT')}</strong>
            </span>
            {(saveLocalNotice || saveSuccessMessage) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-semibold animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {saveLocalNotice || saveSuccessMessage}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Exportar Reconciliação Bancária para Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exportar para Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Exportar Reconciliação Bancária para PDF Oficial de Auditoria"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              Exportar para PDF
            </button>
            <button
              type="button"
              onClick={handleTriggerSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              {isSaving ? 'A gravar...' : 'Gravar Conciliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
