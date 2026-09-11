import React, { useState, useEffect, useRef } from 'react';
import { Empresa, Reconciliacao } from './types';
import { DEMO_EMPRESA, DEMO_RECONCILIACAO } from './data/seedData';
import {
  getStoredEmpresas,
  createStoredEmpresa,
  updateStoredEmpresa,
  deleteStoredEmpresa,
  getStoredReconciliacoes,
  saveStoredReconciliacao,
  deleteStoredReconciliacao,
  getActiveEmpresaId,
  setActiveEmpresaId,
  getActiveRecId,
  setActiveRecId,
  resetAllToDemo,
  exportBackupJson,
  importBackupJson,
} from './utils/storage';
import { EmpresaModal } from './components/EmpresaModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { NovaConciliacaoModal } from './components/NovaConciliacaoModal';
import { ConciliacaoView } from './components/ConciliacaoView';
import { HomePage } from './components/HomePage';

import {
  Building2,
  Landmark,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Sparkles,
  ShieldCheck,
  Download,
  Upload,
  Layers,
  ChevronDown,
  ArrowLeft,
  Home,
} from 'lucide-react';

export default function App() {
  // View mode: 'home' (página inicial para escolher a empresa) | 'workspace' (dentro da empresa selecionada)
  const [viewMode, setViewMode] = useState<'home' | 'workspace'>('home');

  // Empresas state
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState<boolean>(false);
  const [empresaToEdit, setEmpresaToEdit] = useState<Empresa | null>(null);

  // Delete modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Reconciliações state for active company
  const [reconciliacoes, setReconciliacoes] = useState<Reconciliacao[]>([]);
  const [selectedReconciliacaoId, setSelectedReconciliacaoId] = useState<string | null>(null);
  const [isNovaConciliacaoOpen, setIsNovaConciliacaoOpen] = useState<boolean>(false);

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial load from local storage
  useEffect(() => {
    const loadedEmpresas = getStoredEmpresas();
    setEmpresas(loadedEmpresas);

    const activeId = getActiveEmpresaId();
    if (activeId && loadedEmpresas.some((e) => e.id === activeId)) {
      setSelectedEmpresaId(activeId);
    } else if (loadedEmpresas.length > 0) {
      setSelectedEmpresaId(loadedEmpresas[0].id);
      setActiveEmpresaId(loadedEmpresas[0].id);
    }
  }, []);

  // 2. Load Reconciliações whenever selectedEmpresaId changes
  useEffect(() => {
    if (!selectedEmpresaId) {
      setReconciliacoes([]);
      setSelectedReconciliacaoId(null);
      return;
    }

    setActiveEmpresaId(selectedEmpresaId);
    const recs = getStoredReconciliacoes(selectedEmpresaId);
    setReconciliacoes(recs);

    const activeRecId = getActiveRecId();
    if (activeRecId && recs.some((r) => r.id === activeRecId)) {
      setSelectedReconciliacaoId(activeRecId);
    } else if (recs.length > 0) {
      setSelectedReconciliacaoId(recs[0].id);
      setActiveRecId(recs[0].id);
    } else {
      setSelectedReconciliacaoId(null);
    }
  }, [selectedEmpresaId]);

  // Update active rec in storage when changed
  const handleSelectReconciliacao = (recId: string) => {
    setSelectedReconciliacaoId(recId);
    setActiveRecId(recId);
  };

  // Active Empresa & Active Reconciliação
  const activeEmpresa = empresas.find((e) => e.id === selectedEmpresaId) || null;
  const activeReconciliacao =
    reconciliacoes.find((r) => r.id === selectedReconciliacaoId) || null;

  // Handle Select Empresa from Home Page
  const handleSelectEmpresaFromHome = (empresaId: string) => {
    setSelectedEmpresaId(empresaId);
    setActiveEmpresaId(empresaId);
    setViewMode('workspace');
  };

  // Handle Save / Edit Empresa
  const handleSaveEmpresa = async (
    empresaData: Omit<Empresa, 'id' | 'criadoEm'>,
    id?: string
  ) => {
    if (id) {
      // Update existing
      const updated = updateStoredEmpresa(id, empresaData);
      if (updated) {
        setEmpresas((prev) => prev.map((e) => (e.id === id ? updated : e)));
        setSaveSuccessMsg(`Empresa "${updated.nome}" atualizada!`);
      }
    } else {
      // Create new
      const nova = createStoredEmpresa(empresaData);
      setEmpresas((prev) => [...prev, nova]);
      setSelectedEmpresaId(nova.id);
      setActiveEmpresaId(nova.id);
      setViewMode('workspace');
      setSaveSuccessMsg(`Empresa "${nova.nome}" criada com sucesso!`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Delete Empresa handler
  const handleDeleteEmpresa = (empresa: Empresa) => {
    setDeleteModalConfig({
      isOpen: true,
      title: `Eliminar "${empresa.nome}"`,
      message: `Tem a certeza que deseja eliminar esta empresa? Todos os mapas de conciliação associados a esta empresa serão permanentemente eliminados do armazenamento local.`,
      action: () => {
        deleteStoredEmpresa(empresa.id);
        const remaining = empresas.filter((e) => e.id !== empresa.id);
        setEmpresas(remaining);
        if (selectedEmpresaId === empresa.id) {
          const nextId = remaining[0]?.id || null;
          setSelectedEmpresaId(nextId);
          if (nextId) setActiveEmpresaId(nextId);
          setViewMode('home');
        }
        setSaveSuccessMsg(`Empresa "${empresa.nome}" eliminada.`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      },
    });
  };

  // Handle Create New Conciliação
  const handleCreateReconciliacao = async (newRecData: Partial<Reconciliacao>) => {
    if (!selectedEmpresaId || !newRecData.id) return;

    const fullRec: Reconciliacao = {
      id: newRecData.id,
      mes: newRecData.mes || newRecData.id,
      saldoExtratoBancario: newRecData.saldoExtratoBancario || 0,
      saldoContabilidade: newRecData.saldoContabilidade || 0,
      debitosEmpresaNaoBanco: newRecData.debitosEmpresaNaoBanco || newRecData.campo1_debitosEmpresaSemBanco || [],
      totalDebitosEmpresaNaoBanco: newRecData.totalDebitosEmpresaNaoBanco || 0,
      creditosEmpresaNaoBanco: newRecData.creditosEmpresaNaoBanco || newRecData.campo2_creditosEmpresaSemBanco || [],
      totalCreditosEmpresaNaoBanco: newRecData.totalCreditosEmpresaNaoBanco || 0,
      debitosBancoNaoEmpresa: newRecData.debitosBancoNaoEmpresa || newRecData.campo3_debitosBancoSemEmpresa || [],
      totalDebitosBancoNaoEmpresa: newRecData.totalDebitosBancoNaoEmpresa || 0,
      creditosBancoNaoEmpresa: newRecData.creditosBancoNaoEmpresa || newRecData.campo4_creditosBancoSemEmpresa || [],
      totalCreditosBancoNaoEmpresa: newRecData.totalCreditosBancoNaoEmpresa || 0,
      campo1_debitosEmpresaSemBanco: newRecData.campo1_debitosEmpresaSemBanco || newRecData.debitosEmpresaNaoBanco || [],
      campo2_creditosEmpresaSemBanco: newRecData.campo2_creditosEmpresaSemBanco || newRecData.creditosEmpresaNaoBanco || [],
      campo3_debitosBancoSemEmpresa: newRecData.campo3_debitosBancoSemEmpresa || newRecData.debitosBancoNaoEmpresa || [],
      campo4_creditosBancoSemEmpresa: newRecData.campo4_creditosBancoSemEmpresa || newRecData.creditosBancoNaoEmpresa || [],
      totalCampo1_debitosEmpresaSemBanco: newRecData.totalCampo1_debitosEmpresaSemBanco || 0,
      totalCampo2_creditosEmpresaSemBanco: newRecData.totalCampo2_creditosEmpresaSemBanco || 0,
      totalCampo3_debitosBancoSemEmpresa: newRecData.totalCampo3_debitosBancoSemEmpresa || 0,
      totalCampo4_creditosBancoSemEmpresa: newRecData.totalCampo4_creditosBancoSemEmpresa || 0,
      pagamentosBancoNaoRegistadosEmpresa: [
        ...(newRecData.campo3_debitosBancoSemEmpresa || newRecData.debitosBancoNaoEmpresa || []),
        ...(newRecData.campo4_creditosBancoSemEmpresa || newRecData.creditosBancoNaoEmpresa || []),
      ],
      totalDebitosBancoNaoRegistados: newRecData.totalCampo3_debitosBancoSemEmpresa || newRecData.totalDebitosBancoNaoEmpresa || 0,
      totalCreditosBancoNaoRegistados: newRecData.totalCampo4_creditosBancoSemEmpresa || newRecData.totalCreditosBancoNaoEmpresa || 0,
      pagamentosRMNaoRegistadosBanco: newRecData.campo2_creditosEmpresaSemBanco || newRecData.creditosEmpresaNaoBanco || [],
      totalCreditosEmpresaNaoRegistados: newRecData.totalCampo2_creditosEmpresaSemBanco || newRecData.totalCreditosEmpresaNaoBanco || 0,
      debitosEmpresaNaoRegistadosBanco: newRecData.campo1_debitosEmpresaSemBanco || newRecData.debitosEmpresaNaoBanco || [],
      totalDebitosEmpresaNaoRegistados: newRecData.totalCampo1_debitosEmpresaSemBanco || newRecData.totalDebitosEmpresaNaoBanco || 0,
      saldoApurado: newRecData.saldoApurado ?? (newRecData.saldoExtratoBancario || 0),
      diferencaConciliacao: newRecData.diferencaConciliacao ?? 0,
      status: newRecData.status || 'pendente',
      elaboradoPor: newRecData.elaboradoPor || '',
      aprovadoPor: newRecData.aprovadoPor || '',
      local: newRecData.local || 'Lisboa',
      notasExplicativas: newRecData.notasExplicativas || '',
      baseadoNoMesAnterior: newRecData.baseadoNoMesAnterior,
      reconciliadoComIA: newRecData.reconciliadoComIA || false,
      extratosCarregados: newRecData.extratosCarregados || false,
      atualizadoEm: new Date().toISOString(),
    };

    saveStoredReconciliacao(selectedEmpresaId, fullRec);
    const updatedList = getStoredReconciliacoes(selectedEmpresaId);
    setReconciliacoes(updatedList);
    handleSelectReconciliacao(fullRec.id);
    setSaveSuccessMsg(`Conciliação de ${fullRec.mes} criada com sucesso!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Handle Save Current Conciliação
  const handleSaveCurrentReconciliacao = async (updated: Reconciliacao) => {
    if (!selectedEmpresaId || !updated.id) return;

    setIsSaving(true);
    try {
      saveStoredReconciliacao(selectedEmpresaId, updated);
      const updatedList = getStoredReconciliacoes(selectedEmpresaId);
      setReconciliacoes(updatedList);
      setSaveSuccessMsg(`Conciliação de ${updated.mes} guardada localmente com sucesso!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Erro ao guardar reconciliação localmente:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Month Reconciliação
  const handleDeleteReconciliacao = (rec: Reconciliacao) => {
    if (!selectedEmpresaId) return;

    setDeleteModalConfig({
      isOpen: true,
      title: `Eliminar Conciliação de ${rec.mes}`,
      message: `Tem a certeza que deseja eliminar o mapa de conciliação de ${rec.mes}? Esta ação não pode ser desfeita.`,
      action: () => {
        deleteStoredReconciliacao(selectedEmpresaId, rec.id);
        const remaining = reconciliacoes.filter((r) => r.id !== rec.id);
        setReconciliacoes(remaining);
        if (selectedReconciliacaoId === rec.id) {
          const nextId = remaining[0]?.id || null;
          setSelectedReconciliacaoId(nextId);
          if (nextId) setActiveRecId(nextId);
        }
        setSaveSuccessMsg(`Conciliação de ${rec.mes} eliminada.`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      },
    });
  };

  // Load Seed / Demo Data (SNC Portugal) - 100% Reliable Offline
  const handleLoadDemoData = () => {
    const { empresa, reconciliacao } = resetAllToDemo();
    setEmpresas([empresa]);
    setSelectedEmpresaId(empresa.id);
    setReconciliacoes([reconciliacao]);
    setSelectedReconciliacaoId(reconciliacao.id);
    setViewMode('workspace');
    setSaveSuccessMsg('Demonstração pronta (SNC Portugal) carregada com sucesso!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Backup Export
  const handleExportBackup = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conciliacao_bancaria_snc_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveSuccessMsg('Cópia de segurança descarregada com sucesso!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Backup Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackupJson(content);
        if (ok) {
          const loaded = getStoredEmpresas();
          setEmpresas(loaded);
          if (loaded.length > 0) {
            setSelectedEmpresaId(loaded[0].id);
          }
          setSaveSuccessMsg('Dados restaurados com sucesso a partir da cópia de segurança!');
        } else {
          alert('Ficheiro de cópia de segurança inválido.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Application Bar - Clean, offline, no accounts */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title - clicking returns to home page */}
          <div
            onClick={() => setViewMode('home')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Ir para a Página de Início (Escolher Empresa)"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span className="group-hover:text-emerald-300 transition-colors">Conciliação Bancária</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700">
                  🇵🇹 SNC Portugal
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Apuramento de extratos bancários e razão contabilístico segundo o SNC
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Button to return to Home if inside Workspace */}
            {viewMode === 'workspace' && (
              <button
                type="button"
                onClick={() => setViewMode('home')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Voltar à lista de empresas para escolher outra"
              >
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Página de Início</span>
                <span className="sm:hidden">Início</span>
              </button>
            )}

            {/* 100% Offline Privacy Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Offline</span>
            </div>

            {/* Export JSON Backup */}
            <button
              type="button"
              onClick={handleExportBackup}
              title="Exportar cópia de segurança em JSON dos dados locais"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Guardar Cópia</span>
            </button>

            {/* Import JSON Backup */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Restaurar dados a partir de ficheiro JSON"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Restaurar</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json,application/json"
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Flash Notification */}
        {saveSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in shadow-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {saveSuccessMsg}
            </span>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Conditional View: Home Page or Company Workspace */}
        {viewMode === 'home' || empresas.length === 0 ? (
          <HomePage
            empresas={empresas}
            onSelectEmpresa={handleSelectEmpresaFromHome}
            onNovaEmpresa={() => {
              setEmpresaToEdit(null);
              setIsEmpresaModalOpen(true);
            }}
            onEditEmpresa={(emp) => {
              setEmpresaToEdit(emp);
              setIsEmpresaModalOpen(true);
            }}
            onDeleteEmpresa={handleDeleteEmpresa}
          />
        ) : (
          /* Active Empresa Workspace */
          <div className="space-y-6 animate-fade-in">
            {/* Breadcrumb / Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Voltar à Página de Início para selecionar outra empresa"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                  <span>← Escolher Outra Empresa</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-700" />
                  {activeEmpresa?.nome || 'Empresa Selecionada'}
                </span>
                {activeEmpresa?.nif && (
                  <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 hidden md:inline">
                    NIF: {activeEmpresa.nif}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver Todas as Empresas</span>
                </button>
              </div>
            </div>

            {/* Ecrã de Seleção e Gestão de Empresas */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Empresa Selector */}
                <div className="flex items-start sm:items-center gap-3 flex-1">
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Empresa Ativa
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'})
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <div className="relative inline-block w-full sm:w-auto min-w-[280px] max-w-md">
                        <select
                          value={selectedEmpresaId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedEmpresaId(val);
                            setActiveEmpresaId(val);
                          }}
                          className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-800 cursor-pointer shadow-2xs"
                        >
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id} className="text-slate-900 text-sm py-1">
                              {emp.nome} {emp.nif ? `(NIF: ${emp.nif})` : ''} • {emp.banco || 'Sem banco'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {activeEmpresa && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="hidden xl:inline font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            Razão: {activeEmpresa.codigoConta || '12.1.01'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Actions: Trocar, Editar, Remover, Nova */}
                <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewMode('home')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                    title="Ir para a página inicial com todos os cartões de empresas"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    Mudar de Empresa
                  </button>

                  {activeEmpresa && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEmpresaToEdit(activeEmpresa);
                          setIsEmpresaModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                        title="Editar informações da empresa e conta bancária"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmpresa(activeEmpresa)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Eliminar esta empresa e respetivas conciliações"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </>
                  )}

                  {/* Prominent "+ Nova Empresa" Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaToEdit(null);
                      setIsEmpresaModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    + Nova Empresa
                  </button>
                </div>
              </div>
            </section>

            {/* Month Selector & Months History */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Meses de Conciliação — {activeEmpresa?.nome}
                  </h3>
                  <span className="text-xs text-slate-400">
                    ({reconciliacoes.length} {reconciliacoes.length === 1 ? 'mês' : 'meses'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNovaConciliacaoOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + Nova Conciliação Mensal
                </button>
              </div>

              {/* Month pills list */}
              {reconciliacoes.length === 0 ? (
                <div className="py-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                  Ainda não existem conciliações registadas para {activeEmpresa?.nome}.
                  <button
                    onClick={() => setIsNovaConciliacaoOpen(true)}
                    className="block mx-auto mt-2 text-emerald-700 hover:underline font-semibold"
                  >
                    Clique aqui para iniciar a primeira conciliação
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {reconciliacoes.map((rec) => {
                    const isSelected = rec.id === selectedReconciliacaoId;
                    const isConciliado =
                      rec.status === 'conciliado' ||
                      Math.abs(rec.diferencaConciliacao || 0) < 0.01;

                    return (
                      <div
                        key={rec.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        onClick={() => handleSelectReconciliacao(rec.id)}
                      >
                        <span className="font-semibold">{rec.mes}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConciliado ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          title={isConciliado ? 'Conciliado' : 'Com diferença'}
                        />
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReconciliacao(rec);
                            }}
                            className="text-slate-400 hover:text-red-300 ml-1 p-0.5"
                            title="Eliminar este mês"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reconciliation View or Empty state */}
            {activeReconciliacao && activeEmpresa ? (() => {
              const recsSorted = [...reconciliacoes].sort((a, b) => a.id.localeCompare(b.id));
              const currentIndex = recsSorted.findIndex((r) => r.id === activeReconciliacao.id);
              const isPrimeiraReconciliacao = currentIndex === 0;
              const reconciliacaoAnterior = currentIndex > 0 ? recsSorted[currentIndex - 1] : null;

              return (
                <ConciliacaoView
                  empresa={activeEmpresa}
                  reconciliacao={activeReconciliacao}
                  isPrimeiraReconciliacao={isPrimeiraReconciliacao}
                  reconciliacaoAnterior={reconciliacaoAnterior}
                  onSave={handleSaveCurrentReconciliacao}
                  isSaving={isSaving}
                  saveSuccessMessage={saveSuccessMsg}
                />
              );
            })() : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">
                  Selecione um mês no histórico acima ou clique em "+ Nova Conciliação Mensal".
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <EmpresaModal
        isOpen={isEmpresaModalOpen}
        onClose={() => {
          setIsEmpresaModalOpen(false);
          setEmpresaToEdit(null);
        }}
        onSave={handleSaveEmpresa}
        empresaToEdit={empresaToEdit}
      />

      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() =>
          setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={deleteModalConfig.action}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
      />

      {activeEmpresa && (
        <NovaConciliacaoModal
          isOpen={isNovaConciliacaoOpen}
          onClose={() => setIsNovaConciliacaoOpen(false)}
          onCreate={handleCreateReconciliacao}
          existingReconciliacoes={reconciliacoes}
          empresa={activeEmpresa}
          defaultLocal="Lisboa"
        />
      )}
    </div>
  );
}
