import React, { useState, useMemo } from 'react';
import { Empresa, Reconciliacao } from '../types';
import { getStoredReconciliacoes } from '../utils/storage';
import {
  Building2,
  Landmark,
  Plus,
  ArrowRight,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

interface HomePageProps {
  empresas: Empresa[];
  onSelectEmpresa: (empresaId: string) => void;
  onNovaEmpresa: () => void;
  onEditEmpresa: (empresa: Empresa) => void;
  onDeleteEmpresa: (empresa: Empresa) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  empresas,
  onSelectEmpresa,
  onNovaEmpresa,
  onEditEmpresa,
  onDeleteEmpresa,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Map each empresa with its stored reconciliações metadata
  const empresasWithMeta = useMemo(() => {
    return empresas.map((emp) => {
      const recs = getStoredReconciliacoes(emp.id);
      const latestRec = recs.length > 0 ? recs[0] : null;
      const isLatestConciliado =
        latestRec &&
        (latestRec.status === 'conciliado' ||
          Math.abs(latestRec.diferencaConciliacao || 0) < 0.01);

      return {
        empresa: emp,
        recsCount: recs.length,
        latestRec,
        isLatestConciliado,
      };
    });
  }, [empresas]);

  // Filter based on search input
  const filteredEmpresas = useMemo(() => {
    if (!searchTerm.trim()) return empresasWithMeta;
    const term = searchTerm.toLowerCase();
    return empresasWithMeta.filter(
      ({ empresa }) =>
        empresa.nome.toLowerCase().includes(term) ||
        (empresa.nif && empresa.nif.toLowerCase().includes(term)) ||
        empresa.banco.toLowerCase().includes(term) ||
        empresa.codigoConta.toLowerCase().includes(term)
    );
  }, [empresasWithMeta, searchTerm]);

  const totalRecsCount = useMemo(() => {
    return empresasWithMeta.reduce((acc, curr) => acc + curr.recsCount, 0);
  }, [empresasWithMeta]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Portal de Gestão de Conciliação Bancária • SNC Portugal</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Escolha a Empresa para Iniciar
          </h2>

          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Selecione uma das entidades registadas para aceder aos mapas de conciliação bancária,
            apuramento de movimentos pendentes nos 4 campos oficiais, verificação por Inteligência
            Artificial e emissão de relatórios de auditoria em Excel e PDF.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider">
                  Empresas
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {empresas.length} {empresas.length === 1 ? 'registada' : 'registadas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider">
                  Mapas de Conciliação
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {totalRecsCount} {totalRecsCount === 1 ? 'período' : 'períodos'}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider">
                  Normativo Contabilístico
                </span>
                <span className="text-sm font-bold text-slate-900">
                  SNC • NCRF 27 (Portugal)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome da empresa, NIF ou banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-2xs placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onNovaEmpresa}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            + Nova Empresa
          </button>
        </div>
      </div>

      {/* Grid of Companies */}
      {filteredEmpresas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchTerm
              ? 'Nenhuma empresa encontrada para a pesquisa'
              : 'Ainda não existem empresas registadas'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm
              ? `Não foram encontrados resultados correspondentes a "${searchTerm}". Tente pesquisar por outro termo.`
              : 'Registe a sua empresa para gerir as reconciliações bancárias com precisão contabilística.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Limpar pesquisa
              </button>
            ) : (
              <button
                type="button"
                onClick={onNovaEmpresa}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Registar Empresa
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEmpresas.map(
            ({ empresa, recsCount, latestRec, isLatestConciliado }) => (
              <div
                key={empresa.id}
                onClick={() => onSelectEmpresa(empresa.id)}
                className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer"
              >
                {/* Top of Card */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white rounded-xl text-slate-800 transition-colors">
                      <Building2 className="w-5 h-5" />
                    </div>

                    {/* Action buttons (edit/delete) */}
                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onEditEmpresa(empresa)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar Empresa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEmpresa(empresa)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar Empresa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Company Name & NIF */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                    {empresa.nome}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {empresa.nif ? (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                        NIF: {empresa.nif}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Sem NIF registado</span>
                    )}
                    <span className="text-[11px] font-mono text-slate-600 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-200">
                      Razão: {empresa.codigoConta || '12.1.01'}
                    </span>
                  </div>

                  {/* Bank info */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                    <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">
                      {empresa.banco || 'Instituição Bancária não definida'}
                    </span>
                  </div>

                  {/* Reconciliations summary info */}
                  <div className="mt-3 flex items-center justify-between text-xs bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {recsCount === 0
                          ? 'Sem conciliações'
                          : `${recsCount} ${recsCount === 1 ? 'mês registado' : 'meses registados'}`}
                      </span>
                    </div>

                    {latestRec ? (
                      <div className="flex items-center gap-1">
                        {isLatestConciliado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Conciliado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Pendente
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Novo</span>
                    )}
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                    Clique para aceder
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 group-hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
