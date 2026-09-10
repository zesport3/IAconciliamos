import React, { useState, useEffect, useRef } from 'react';
import { Empresa, MovimentoConciliacao, Reconciliacao, ReconciliacaoImportResult } from '../types';
import {
  MESES_PT,
  getPreviousMonthId,
  formatValorComMoeda,
  formatMoeda,
  calculate4FieldsTotals,
  parseNumberSafely,
} from '../utils/calculations';
import {
  downloadModeloReconciliacaoInicial,
  parseReconciliacaoInicialExcel,
} from '../utils/excelParser';
import {
  Calendar,
  Check,
  X,
  History,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Plus,
  Trash2,
  Scale,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface NovaConciliacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newRec: Partial<Reconciliacao>) => Promise<void>;
  existingReconciliacoes: Reconciliacao[];
  empresa?: Empresa | null;
  defaultElaboradoPor?: string;
  defaultAprovadoPor?: string;
  defaultLocal?: string;
}

export const NovaConciliacaoModal: React.FC<NovaConciliacaoModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingReconciliacoes,
  empresa,
  defaultElaboradoPor = '',
  defaultAprovadoPor = '',
  defaultLocal,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const moedaSymbol = '€';
  const resolvedLocal = defaultLocal || 'Lisboa';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ano, setAno] = useState<number>(currentYear);
  const [mesIdx, setMesIdx] = useState<number>(currentMonthIdx);
  const [saldoExtrato, setSaldoExtrato] = useState<number>(0);
  const [saldoContabilidade, setSaldoContabilidade] = useState<number>(0);
  const [baseadoEm, setBaseadoEm] = useState<Reconciliacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFirstConciliacao, setIsFirstConciliacao] = useState(false);
  const [modoManual, setModoManual] = useState<boolean>(false);

  // 4 campos oficiais com múltiplas linhas cada
  const [campo1, setCampo1] = useState<MovimentoConciliacao[]>([]);
  const [campo2, setCampo2] = useState<MovimentoConciliacao[]>([]);
  const [campo3, setCampo3] = useState<MovimentoConciliacao[]>([]);
  const [campo4, setCampo4] = useState<MovimentoConciliacao[]>([]);

  // Secção opcional de importação Excel
  const [showExcelImport, setShowExcelImport] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ReconciliacaoImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [elaboradoPorVal, setElaboradoPorVal] = useState<string>(defaultElaboradoPor);
  const [aprovadoPorVal, setAprovadoPorVal] = useState<string>(defaultAprovadoPor);
  const [localVal, setLocalVal] = useState<string>(resolvedLocal);
  const [notasVal, setNotasVal] = useState<string>('');

  const mesId = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
  const mesLabel = `${MESES_PT[mesIdx]} de ${ano}`;

  useEffect(() => {
    if (!isOpen) {
      setImportFileName(null);
      setImportResult(null);
      setImportError(null);
      setCampo1([]);
      setCampo2([]);
      setCampo3([]);
      setCampo4([]);
      setShowExcelImport(false);
      return;
    }

    const prevMonthId = getPreviousMonthId(mesId);
    const foundPrev = existingReconciliacoes.find((r) => r.id === prevMonthId);

    if (foundPrev) {
      setBaseadoEm(foundPrev);
      setSaldoContabilidade(foundPrev.saldoApurado);
      setIsFirstConciliacao(false);
    } else {
      setBaseadoEm(null);
      if (existingReconciliacoes.length === 0) {
        setIsFirstConciliacao(true);
      } else {
        setIsFirstConciliacao(false);
      }
    }
  }, [ano, mesIdx, isOpen, existingReconciliacoes]);

  if (!isOpen) return null;

  const alreadyExists = existingReconciliacoes.some((r) => r.id === mesId);

  // Adicionar linha a um dos 4 campos
  const handleAddLinha = (campoNum: 1 | 2 | 3 | 4) => {
    const defaultDate = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-01`;
    const novaLinha: MovimentoConciliacao = {
      id: `mov-${campoNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data: defaultDate,
      nDoc: '',
      descricao: '',
      valor: 0,
      observacao: '',
    };

    if (campoNum === 1) setCampo1((prev) => [...prev, novaLinha]);
    else if (campoNum === 2) setCampo2((prev) => [...prev, novaLinha]);
    else if (campoNum === 3) setCampo3((prev) => [...prev, novaLinha]);
    else if (campoNum === 4) setCampo4((prev) => [...prev, novaLinha]);
  };

  // Atualizar campo de uma linha específica
  const handleUpdateLinha = (
    campoNum: 1 | 2 | 3 | 4,
    index: number,
    field: keyof MovimentoConciliacao,
    val: any
  ) => {
    const updater = (prev: MovimentoConciliacao[]) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    };

    if (campoNum === 1) setCampo1(updater);
    else if (campoNum === 2) setCampo2(updater);
    else if (campoNum === 3) setCampo3(updater);
    else if (campoNum === 4) setCampo4(updater);
  };

  // Eliminar linha de um campo
  const handleDeleteLinha = (campoNum: 1 | 2 | 3 | 4, index: number) => {
    const remover = (prev: MovimentoConciliacao[]) => prev.filter((_, i) => i !== index);
    if (campoNum === 1) setCampo1(remover);
    else if (campoNum === 2) setCampo2(remover);
    else if (campoNum === 3) setCampo3(remover);
    else if (campoNum === 4) setCampo4(remover);
  };

  // Processar importação opcional de Excel
  const handleProcessFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setImportError('Por favor selecione um ficheiro Excel válido (.xlsx ou .xls).');
      return;
    }

    setIsParsingFile(true);
    setImportError(null);

    try {
      const result = await parseReconciliacaoInicialExcel(file);
      if (!result.success) {
        setImportError(result.error || 'Não foi possível ler os dados do ficheiro.');
        setIsParsingFile(false);
        return;
      }

      setImportFileName(file.name);
      setImportResult(result);

      // Preencher valores e os 4 campos na aplicação
      setSaldoExtrato(result.saldoExtratoBancario);
      setSaldoContabilidade(result.saldoContabilidade);
      setCampo1(result.campo1 || []);
      setCampo2(result.campo2 || []);
      setCampo3(result.campo3 || []);
      setCampo4(result.campo4 || []);

      if (result.elaboradoPor) setElaboradoPorVal(result.elaboradoPor);
      if (result.aprovadoPor) setAprovadoPorVal(result.aprovadoPor);
      if (result.local) setLocalVal(result.local);
      if (result.notasExplicativas) setNotasVal(result.notasExplicativas);

      if (result.mesId) {
        const parts = result.mesId.split('-');
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y)) setAno(y);
          if (!isNaN(m) && m >= 0 && m <= 11) setMesIdx(m);
        }
      }
    } catch (err: any) {
      console.error('Erro ao ler ficheiro de conciliação:', err);
      setImportError('Ocorreu um erro ao processar o ficheiro Excel. Verifique a formatação.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    downloadModeloReconciliacaoInicial(empresa || undefined);
  };

  // Cálculo em tempo real dos 4 campos
  const currentCalc = calculate4FieldsTotals(
    saldoExtrato,
    campo1,
    campo2,
    campo3,
    campo4,
    saldoContabilidade
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyExists) return;

    setLoading(true);
    try {
      const isAIMode = !isFirstConciliacao && !modoManual;
      const effectiveSaldoContab = isAIMode
        ? (baseadoEm?.saldoApurado ?? saldoContabilidade ?? 0)
        : saldoContabilidade;
      const effectiveSaldoExtrato = isAIMode ? (saldoExtrato || 0) : saldoExtrato;

      await onCreate({
        id: mesId,
        mes: mesLabel,
        saldoExtratoBancario: effectiveSaldoExtrato,
        saldoContabilidade: effectiveSaldoContab,
        reconciliadoComIA: false,
        extratosCarregados: false,
        campo1_debitosEmpresaSemBanco: isAIMode ? [] : campo1,
        campo2_creditosEmpresaSemBanco: isAIMode ? [] : campo2,
        campo3_debitosBancoSemEmpresa: isAIMode ? [] : campo3,
        campo4_creditosBancoSemEmpresa: isAIMode ? [] : campo4,
        totalCampo1_debitosEmpresaSemBanco: isAIMode ? 0 : currentCalc.totalCampo1,
        totalCampo2_creditosEmpresaSemBanco: isAIMode ? 0 : currentCalc.totalCampo2,
        totalCampo3_debitosBancoSemEmpresa: isAIMode ? 0 : currentCalc.totalCampo3,
        totalCampo4_creditosBancoSemEmpresa: isAIMode ? 0 : currentCalc.totalCampo4,
        debitosEmpresaNaoBanco: isAIMode ? [] : campo1,
        creditosEmpresaNaoBanco: isAIMode ? [] : campo2,
        debitosBancoNaoEmpresa: isAIMode ? [] : campo3,
        creditosBancoNaoEmpresa: isAIMode ? [] : campo4,
        totalDebitosEmpresaNaoBanco: isAIMode ? 0 : currentCalc.totalCampo1,
        totalCreditosEmpresaNaoBanco: isAIMode ? 0 : currentCalc.totalCampo2,
        totalDebitosBancoNaoEmpresa: isAIMode ? 0 : currentCalc.totalCampo3,
        totalCreditosBancoNaoEmpresa: isAIMode ? 0 : currentCalc.totalCampo4,
        pagamentosBancoNaoRegistadosEmpresa: isAIMode ? [] : [...campo3, ...campo4],
        totalDebitosBancoNaoRegistados: isAIMode ? 0 : currentCalc.totalCampo3,
        totalCreditosBancoNaoRegistados: isAIMode ? 0 : currentCalc.totalCampo4,
        pagamentosRMNaoRegistadosBanco: isAIMode ? [] : campo2,
        totalCreditosEmpresaNaoRegistados: isAIMode ? 0 : currentCalc.totalCampo2,
        debitosEmpresaNaoRegistadosBanco: isAIMode ? [] : campo1,
        totalDebitosEmpresaNaoRegistados: isAIMode ? 0 : currentCalc.totalCampo1,
        saldoApurado: isAIMode ? effectiveSaldoExtrato : currentCalc.saldoApurado,
        diferencaConciliacao: isAIMode ? 0 : currentCalc.diferencaConciliacao,
        elaboradoPor: elaboradoPorVal || defaultElaboradoPor,
        aprovadoPor: aprovadoPorVal || defaultAprovadoPor,
        local: localVal || resolvedLocal || 'Lisboa',
        notasExplicativas: notasVal,
        baseadoNoMesAnterior: baseadoEm?.id || undefined,
        status: isAIMode ? 'pendente' : (Math.abs(currentCalc.diferencaConciliacao) < 0.01 ? 'conciliado' : 'pendente'),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {isFirstConciliacao ? 'Primeira Reconciliação Bancária' : 'Nova Conciliação Bancária'}
                </h3>
                {isFirstConciliacao && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wider">
                    Abertura Inicial
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {empresa?.nome ? `${empresa.nome} • ` : ''}
                {empresa?.banco || 'Conta Bancária'} • Normativo SNC
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Banner de Orientação */}
          {isFirstConciliacao ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    Registo dos Saldos e Movimentos de Abertura na Aplicação
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Insira o <strong>Saldo do Extrato Bancário</strong> e o <strong>Saldo da Contabilidade</strong>.
                    Registe diretamente nos <strong>4 campos</strong> abaixo os movimentos pendentes de reconciliação.
                    Pode adicionar quantas linhas precisar clicando no botão <strong>(+)</strong> de cada campo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExcelImport(!showExcelImport)}
                  className="shrink-0 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/80 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  {showExcelImport ? 'Ocultar importação Excel' : 'Importar ficheiro Excel'}
                </button>
              </div>
            </div>
          ) : modoManual ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Registo manual direto na aplicação dos saldos e movimentos pendentes nos 4 campos.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExcelImport(!showExcelImport)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                {showExcelImport ? 'Fechar importação Excel' : 'Importar de ficheiro Excel'}
              </button>
            </div>
          ) : null}

          {/* Secção Opcional: Importar de Excel (apenas 1º mês ou modo manual) */}
          {(isFirstConciliacao || modoManual) && showExcelImport && (
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Importar Ficheiro Excel (.xlsx) Preenchido
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Opcional: se já tiver um ficheiro Excel com as folhas dos 4 campos, carregue-o para pré-preencher os campos abaixo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descarregar Modelo Excel (.xlsx)
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                    : importResult
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={onFileInputChange}
                  className="hidden"
                />

                {isParsingFile ? (
                  <div className="flex flex-col items-center py-2 space-y-1.5">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-700">A processar ficheiro Excel...</p>
                  </div>
                ) : importResult ? (
                  <div className="flex items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{importFileName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Dados carregados
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {campo1.length + campo2.length + campo3.length + campo4.length} movimentos distribuídos pelos 4 campos. Pode editá-los livremente abaixo.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium"
                    >
                      Substituir
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2 space-y-1">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-800">
                      Clique para escolher ou arraste o ficheiro Excel (.xlsx)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Os movimentos serão colocados imediatamente nos 4 campos da aplicação
                    </p>
                  </div>
                )}
              </div>

              {importError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* Período: Mês & Ano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Mês de Referência
              </label>
              <select
                value={mesIdx}
                onChange={(e) => setMesIdx(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
              >
                {MESES_PT.map((mes, idx) => (
                  <option key={idx} value={idx}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Ano
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10) || currentYear)}
                min={2000}
                max={2099}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono"
              />
            </div>
          </div>

          {alreadyExists && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              Aviso: Já existe uma conciliação registada para <strong>{mesLabel}</strong>. Pode abri-la diretamente na lista lateral.
            </div>
          )}

          {/* Notificação de saldo do mês anterior (se existir) */}
          {baseadoEm && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-950">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                <History className="w-4 h-4 text-blue-600" />
                <span>Continuidade Contabilística: Mês anterior ({baseadoEm.mes})</span>
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                O Saldo Apurado de fecho ({formatValorComMoeda(baseadoEm.saldoApurado, empresa?.moeda)}) foi pré-preenchido no Saldo da Contabilidade.
              </p>
            </div>
          )}

          {/* Card Especial para 2º e Próximos Meses: IA Reconciliação */}
          {!isFirstConciliacao && !modoManual && (
            <div className="space-y-4 py-1">
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border-2 border-emerald-300 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-emerald-100" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-emerald-950">
                        Reconciliação Automática por Inteligência Artificial
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full uppercase">
                        2.º e Próximos Meses
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Para o mês de <strong>{mesLabel}</strong>, a aplicação solicitará de imediato os ficheiros Excel do <strong>Extrato Bancário</strong> e do <strong>Extrato da Contabilidade</strong> (formato canónico de 6 colunas: <em>data, descritivo, nº movimento, valor debito, valor credito, saldo</em>).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl space-y-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">1</span>
                      Cruzamento de Extratos pela IA
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Ao criar o mês, ser-lhe-ão pedidos logo os 2 ficheiros Excel para a IA cruzar os movimentos e preencher os 4 campos da conciliação.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl space-y-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">2</span>
                      Verificação pelo Utilizador
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Após o processamento da IA, você verifica no mapa se está tudo correto e pode fazer quaisquer ajustes antes de gravar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setModoManual(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline decoration-slate-300 hover:decoration-slate-500 transition-colors cursor-pointer"
                >
                  Prefiro preencher manualmente os 4 campos deste mês (sem IA)
                </button>
              </div>
            </div>
          )}

          {/* Secção Manual (Apenas 1º Mês ou se o utilizador optou por preenchimento manual) */}
          {(isFirstConciliacao || modoManual) && (
            <>
              {modoManual && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
                  <span>A preencher manualmente os 4 campos deste mês.</span>
                  <button
                    type="button"
                    onClick={() => setModoManual(false)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Voltar ao modo automático c/ IA
                  </button>
                </div>
              )}

              {/* Saldos Iniciais: Extrato e Contabilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            {/* Saldo Extrato Bancário */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 uppercase tracking-wide">
                (A) Saldo do Extrato Bancário ({moedaSymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={saldoExtrato || ''}
                onChange={(e) => setSaldoExtrato(parseNumberSafely(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Saldo no extrato bancário emitido pelo banco à data de fecho.
              </span>
            </div>

            {/* Saldo da Contabilidade */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 uppercase tracking-wide">
                Saldo da Contabilidade (Razão SNC - Conta 12) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={saldoContabilidade || ''}
                onChange={(e) => setSaldoContabilidade(parseNumberSafely(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Saldo contabilístico apurado no razão da empresa à mesma data.
              </span>
            </div>
          </div>

          {/* OS 4 CAMPOS DA RECONCILIAÇÃO COM BOTÃO + PARA ADICIONAR LINHAS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  Campos da Reconciliação Bancária (SNC Portugal)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Preencha os movimentos pendentes diretamente em cada um dos 4 campos. Pode adicionar múltiplas linhas com o botão <strong>(+)</strong>.
                </p>
              </div>
            </div>

            {/* CAMPO 1 */}
            <div className="border border-blue-200 bg-blue-50/25 rounded-2xl p-4 space-y-3 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-200/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                      1 - Débito na empresa s/ correspondência no Banco
                    </h5>
                  </div>
                  <p className="text-[11px] text-blue-800/80 mt-0.5 ml-7">
                    Valores debitados na empresa (ex: depósitos efetuados) ainda em trânsito no banco.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-xs font-bold text-blue-900">
                    +{formatMoeda(currentCalc.totalCampo1)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar linha</span>
                  </button>
                </div>
              </div>

              {campo1.length === 0 ? (
                <div className="py-2 px-3 bg-white/80 border border-dashed border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-800">
                  <span>Nenhum movimento pendente no Campo 1.</span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(1)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    <Plus className="w-3 h-3" /> Adicionar 1.ª linha
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-2">
                    <div className="col-span-2">Data</div>
                    <div className="col-span-2">Nº Doc</div>
                    <div className="col-span-4">Descrição do Movimento</div>
                    <div className="col-span-2 text-right">Valor (€)</div>
                    <div className="col-span-2">Observação</div>
                  </div>

                  {campo1.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-white rounded-xl border border-blue-100 shadow-2xs items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="date"
                          value={item.data || ''}
                          onChange={(e) => handleUpdateLinha(1, idx, 'data', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Nº Doc / Ref"
                          value={item.nDoc || ''}
                          onChange={(e) => handleUpdateLinha(1, idx, 'nDoc', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Depósito em trânsito...)"
                          value={item.descricao || ''}
                          onChange={(e) => handleUpdateLinha(1, idx, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.valor === 0 ? '' : item.valor}
                          onChange={(e) =>
                            handleUpdateLinha(
                              1,
                              idx,
                              'valor',
                              Math.abs(parseNumberSafely(e.target.value))
                            )
                          }
                          className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Obs (opcional)"
                          value={item.observacao || ''}
                          onChange={(e) => handleUpdateLinha(1, idx, 'observacao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLinha(1, idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                          title="Eliminar linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAMPO 2 */}
            <div className="border border-amber-200 bg-amber-50/25 rounded-2xl p-4 space-y-3 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <h5 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                      2 - Crédito na Empresa s/ correspondência no Banco
                    </h5>
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-0.5 ml-7">
                    Valores creditados na empresa (ex: cheques emitidos, pagamentos em trânsito) por refletir no extrato.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-xs font-bold text-amber-900">
                    -{formatMoeda(currentCalc.totalCampo2)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar linha</span>
                  </button>
                </div>
              </div>

              {campo2.length === 0 ? (
                <div className="py-2 px-3 bg-white/80 border border-dashed border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <span>Nenhum movimento pendente no Campo 2.</span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(2)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
                  >
                    <Plus className="w-3 h-3" /> Adicionar 1.ª linha
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-2">
                    <div className="col-span-2">Data</div>
                    <div className="col-span-2">Nº Doc</div>
                    <div className="col-span-4">Descrição do Movimento</div>
                    <div className="col-span-2 text-right">Valor (€)</div>
                    <div className="col-span-2">Observação</div>
                  </div>

                  {campo2.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-white rounded-xl border border-amber-100 shadow-2xs items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="date"
                          value={item.data || ''}
                          onChange={(e) => handleUpdateLinha(2, idx, 'data', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Nº Doc / Chq"
                          value={item.nDoc || ''}
                          onChange={(e) => handleUpdateLinha(2, idx, 'nDoc', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Cheque emitido...)"
                          value={item.descricao || ''}
                          onChange={(e) => handleUpdateLinha(2, idx, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.valor === 0 ? '' : item.valor}
                          onChange={(e) =>
                            handleUpdateLinha(
                              2,
                              idx,
                              'valor',
                              Math.abs(parseNumberSafely(e.target.value))
                            )
                          }
                          className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Obs (opcional)"
                          value={item.observacao || ''}
                          onChange={(e) => handleUpdateLinha(2, idx, 'observacao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLinha(2, idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                          title="Eliminar linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAMPO 3 */}
            <div className="border border-rose-200 bg-rose-50/25 rounded-2xl p-4 space-y-3 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-200/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <h5 className="font-bold text-xs text-rose-950 uppercase tracking-wide">
                      3 - Débito no banco s/ correspondência na Empresa
                    </h5>
                  </div>
                  <p className="text-[11px] text-rose-800/80 mt-0.5 ml-7">
                    Comissões, despesas, juros bancários ou débitos diretos no extrato sem lançamento na contabilidade.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-xs font-bold text-rose-900">
                    +{formatMoeda(currentCalc.totalCampo3)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(3)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar linha</span>
                  </button>
                </div>
              </div>

              {campo3.length === 0 ? (
                <div className="py-2 px-3 bg-white/80 border border-dashed border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                  <span>Nenhum movimento pendente no Campo 3.</span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(3)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline"
                  >
                    <Plus className="w-3 h-3" /> Adicionar 1.ª linha
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-2">
                    <div className="col-span-2">Data</div>
                    <div className="col-span-2">Nº Doc</div>
                    <div className="col-span-4">Descrição do Movimento</div>
                    <div className="col-span-2 text-right">Valor (€)</div>
                    <div className="col-span-2">Observação</div>
                  </div>

                  {campo3.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-white rounded-xl border border-rose-100 shadow-2xs items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="date"
                          value={item.data || ''}
                          onChange={(e) => handleUpdateLinha(3, idx, 'data', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Nº Doc / Ref"
                          value={item.nDoc || ''}
                          onChange={(e) => handleUpdateLinha(3, idx, 'nDoc', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Comissão de manutenção...)"
                          value={item.descricao || ''}
                          onChange={(e) => handleUpdateLinha(3, idx, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.valor === 0 ? '' : item.valor}
                          onChange={(e) =>
                            handleUpdateLinha(
                              3,
                              idx,
                              'valor',
                              Math.abs(parseNumberSafely(e.target.value))
                            )
                          }
                          className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Obs (opcional)"
                          value={item.observacao || ''}
                          onChange={(e) => handleUpdateLinha(3, idx, 'observacao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLinha(3, idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                          title="Eliminar linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAMPO 4 */}
            <div className="border border-emerald-200 bg-emerald-50/25 rounded-2xl p-4 space-y-3 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      4
                    </span>
                    <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
                      4 - Crédito no banco s/ correspondência na Empresa
                    </h5>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5 ml-7">
                    Juros obtidos, transferências recebidas ou créditos no extrato sem lançamento na contabilidade.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-xs font-bold text-emerald-900">
                    -{formatMoeda(currentCalc.totalCampo4)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(4)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar linha</span>
                  </button>
                </div>
              </div>

              {campo4.length === 0 ? (
                <div className="py-2 px-3 bg-white/80 border border-dashed border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <span>Nenhum movimento pendente no Campo 4.</span>
                  <button
                    type="button"
                    onClick={() => handleAddLinha(4)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    <Plus className="w-3 h-3" /> Adicionar 1.ª linha
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-2">
                    <div className="col-span-2">Data</div>
                    <div className="col-span-2">Nº Doc</div>
                    <div className="col-span-4">Descrição do Movimento</div>
                    <div className="col-span-2 text-right">Valor (€)</div>
                    <div className="col-span-2">Observação</div>
                  </div>

                  {campo4.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-white rounded-xl border border-emerald-100 shadow-2xs items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="date"
                          value={item.data || ''}
                          onChange={(e) => handleUpdateLinha(4, idx, 'data', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Nº Doc / Ref"
                          value={item.nDoc || ''}
                          onChange={(e) => handleUpdateLinha(4, idx, 'nDoc', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Juros auferidos...)"
                          value={item.descricao || ''}
                          onChange={(e) => handleUpdateLinha(4, idx, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.valor === 0 ? '' : item.valor}
                          onChange={(e) =>
                            handleUpdateLinha(
                              4,
                              idx,
                              'valor',
                              Math.abs(parseNumberSafely(e.target.value))
                            )
                          }
                          className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Obs (opcional)"
                          value={item.observacao || ''}
                          onChange={(e) => handleUpdateLinha(4, idx, 'observacao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLinha(4, idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                          title="Eliminar linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QUADRO RESUMO DO APURAMENTO DA CONCILIAÇÃO */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm">Resumo do Apuramento da Reconciliação (SNC)</h4>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentCalc.isConciliado
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {currentCalc.isConciliado
                  ? '✓ Totalmente Conciliado (0,00 €)'
                  : `Divergência: ${formatMoeda(currentCalc.diferencaConciliacao)} €`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">(A) Saldo Extrato Bancário:</span>
                  <span className="font-bold text-white">{formatMoeda(saldoExtrato)} €</span>
                </div>
                <div className="flex justify-between py-0.5 text-blue-300">
                  <span>(+) 1. Débitos empresa s/ Banco:</span>
                  <span className="font-bold">+{formatMoeda(currentCalc.totalCampo1)} €</span>
                </div>
                <div className="flex justify-between py-0.5 text-amber-300">
                  <span>(-) 2. Créditos empresa s/ Banco:</span>
                  <span className="font-bold">-{formatMoeda(currentCalc.totalCampo2)} €</span>
                </div>
                <div className="flex justify-between py-0.5 text-rose-300">
                  <span>(+) 3. Débitos banco s/ Empresa:</span>
                  <span className="font-bold">+{formatMoeda(currentCalc.totalCampo3)} €</span>
                </div>
                <div className="flex justify-between py-0.5 text-emerald-300">
                  <span>(-) 4. Créditos banco s/ Empresa:</span>
                  <span className="font-bold">-{formatMoeda(currentCalc.totalCampo4)} €</span>
                </div>
              </div>

              <div className="bg-slate-800/90 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-center border border-slate-700/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">(=) Saldo Apurado:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatMoeda(currentCalc.saldoApurado)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-2">
                  <span className="text-slate-400">Saldo da Contabilidade:</span>
                  <span className="text-sm font-bold text-white">
                    {formatMoeda(saldoContabilidade)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-2 font-bold">
                  <span className="text-slate-300">Diferença de Conciliação:</span>
                  <span className={currentCalc.isConciliado ? 'text-emerald-400' : 'text-rose-400'}>
                    {formatMoeda(currentCalc.diferencaConciliacao)} €
                  </span>
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-4 shrink-0">
            <span className="text-xs text-slate-500">
              {!isFirstConciliacao && !modoManual
                ? 'Os extratos bancário e contabilidade serão solicitados logo a seguir.'
                : `${campo1.length + campo2.length + campo3.length + campo4.length} movimentos registados nos 4 campos.`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || alreadyExists}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
                  !isFirstConciliacao && !modoManual
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {!isFirstConciliacao && !modoManual ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    {loading ? 'A criar...' : 'Criar Mês e Anexar Extratos c/ IA'}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    {loading ? 'A processar...' : isFirstConciliacao ? 'Criar 1.ª Reconciliação' : 'Iniciar Conciliação Manual'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
