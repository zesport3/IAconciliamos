import React, { useState, useEffect } from 'react';
import { Empresa } from '../types';
import { BANCOS_PORTUGAL } from '../data/normativoSNC';
import {
  Building2,
  Landmark,
  Hash,
  X,
  Check,
  Scale,
  FileBadge,
} from 'lucide-react';

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (empresaData: Omit<Empresa, 'id' | 'criadoEm'>, id?: string) => Promise<void>;
  empresaToEdit?: Empresa | null;
}

export const EmpresaModal: React.FC<EmpresaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  empresaToEdit,
}) => {
  const [nome, setNome] = useState('');
  const [nif, setNif] = useState('');
  const [banco, setBanco] = useState('');
  const [codigoConta, setCodigoConta] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empresaToEdit) {
      setNome(empresaToEdit.nome || '');
      setNif(empresaToEdit.nif || '');
      setBanco(empresaToEdit.banco || '');
      setCodigoConta(empresaToEdit.codigoConta || '');
    } else {
      setNome('');
      setNif('');
      setBanco('Millennium BCP');
      setCodigoConta('12.1.01 Depósitos à Ordem');
    }
  }, [empresaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSaving(true);
    try {
      await onSave(
        {
          nome: nome.trim(),
          nif: nif.trim(),
          banco: banco.trim(),
          codigoConta: codigoConta.trim(),
          normativo: 'SNC',
          moeda: 'EUR',
        },
        empresaToEdit ? empresaToEdit.id : undefined
      );
      onClose();
    } catch (err) {
      console.error('Error saving empresa:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {empresaToEdit ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                SNC Portugal (Decreto-Lei n.º 158/2009)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Informação Normativa */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🇵🇹</span>
              <div>
                <span className="font-semibold text-slate-900">Normativo Contabilístico: SNC Portugal</span>
                <p className="text-[11px] text-slate-500">Moeda: Euro (€) • Demonstrações Financeiras em conformidade legal</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SNC
            </span>
          </div>

          {/* Nome e NIF */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Nome da Empresa *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lusitânia Tecnologias & Comércio, Lda"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                NIF (9 dígitos)
              </label>
              <div className="relative">
                <FileBadge className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="509123456"
                  maxLength={15}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Instituição Bancária */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Instituição Bancária
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ex: Millennium BCP, Caixa Geral de Depósitos, Santander"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            {/* Sugestões rápidas de bancos em Portugal */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BANCOS_PORTUGAL.slice(0, 5).map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBanco(b)}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Código da Conta no Razão SNC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Código de Conta no SNC (Classe 1 — Meios Financeiros Líquidos)
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={codigoConta}
                onChange={(e) => setCodigoConta(e.target.value)}
                placeholder="Ex: 12.1.01 (Depósitos à Ordem BCP)"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              No SNC português, as contas bancárias de Depósitos à Ordem iniciam por 12 (ex: 12.1.01 BCP ou 12.2 CGD).
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              {saving ? 'A gravar...' : empresaToEdit ? 'Atualizar Empresa' : 'Gravar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
