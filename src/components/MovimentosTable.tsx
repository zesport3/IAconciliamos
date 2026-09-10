import React, { useState } from 'react';
import { MovimentoConciliacao } from '../types';
import { formatMoeda, parseNumberSafely } from '../utils/calculations';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface MovimentosTableProps {
  title: string;
  tableType: 'campo1' | 'campo2' | 'campo3' | 'campo4' | 'banco' | 'empresa_rm' | 'empresa_debito';
  sign: '+' | '-';
  codeLetter: string; // "1", "2", "3", "4" or legacy
  items: MovimentoConciliacao[];
  onChangeItems: (items: MovimentoConciliacao[]) => void;
  subtotalsText: string;
  moedaSymbol?: string;
}

export const MovimentosTable: React.FC<MovimentosTableProps> = ({
  title,
  tableType,
  sign,
  codeLetter,
  items,
  onChangeItems,
  subtotalsText,
  moedaSymbol = '€',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Quick state for inline new row
  const defaultInitialTipo = (tableType === 'campo2' || tableType === 'campo4') ? 'credito' : 'debito';
  const [newRow, setNewRow] = useState<Partial<MovimentoConciliacao>>({
    data: new Date().toISOString().split('T')[0],
    nDoc: '',
    descricao: '',
    valor: 0,
    observacao: '',
    tipo: defaultInitialTipo,
  });
  const [isAddingRow, setIsAddingRow] = useState(false);

  const handleDeleteRow = (id: string) => {
    onChangeItems(items.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Tem a certeza que deseja limpar todos os movimentos desta tabela?')) {
      onChangeItems([]);
    }
  };

  const handleSaveNewRow = () => {
    if (!newRow.descricao && !newRow.nDoc && !newRow.valor) {
      setIsAddingRow(false);
      return;
    }

    const itemTipo = newRow.tipo || (tableType === 'campo2' || tableType === 'campo4' ? 'credito' : 'debito');

    const created: MovimentoConciliacao = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: newRow.data || new Date().toISOString().split('T')[0],
      nDoc: newRow.nDoc?.trim() || '-',
      descricao: newRow.descricao?.trim() || 'Movimento avulso',
      valor: Math.abs(Number(newRow.valor) || 0),
      observacao: newRow.observacao?.trim() || '',
      tipo: itemTipo,
    };

    onChangeItems([...items, created]);
    setNewRow({
      data: new Date().toISOString().split('T')[0],
      nDoc: '',
      descricao: '',
      valor: 0,
      observacao: '',
      tipo: defaultInitialTipo,
    });
    setIsAddingRow(false);
  };

  const handleUpdateItem = (id: string, updates: Partial<MovimentoConciliacao>) => {
    onChangeItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6 transition-all">
      {/* Table Header / Action Bar */}
      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              sign === '+'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {sign}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-semibold">
                ({codeLetter})
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">{items.length} movimento(s) registado(s)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingRow(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 font-bold" />
            + Adicionar Linha
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Limpar tabela"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold tracking-wider">
              <th className="py-2.5 px-4 w-32">Data</th>
              <th className="py-2.5 px-3 w-36">Nº Documento</th>
              <th className="py-2.5 px-4">Descrição / Beneficiário</th>
              {tableType === 'banco' && (
                <th className="py-2.5 px-3 w-32">Tipo Movimento</th>
              )}
              <th className="py-2.5 px-4 w-36 text-right">
                Valor {moedaSymbol ? `(${moedaSymbol})` : ''}
              </th>
              <th className="py-2.5 px-4 min-w-[220px]">Notas / Observações</th>
              <th className="py-2.5 px-3 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {/* If adding new manual row */}
            {isAddingRow && (
              <tr className="bg-emerald-50/40 border-b border-emerald-200">
                <td className="py-2 px-3">
                  <input
                    type="date"
                    value={newRow.data}
                    onChange={(e) => setNewRow({ ...newRow, data: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-800"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Ex: CHQ-1049"
                    value={newRow.nDoc}
                    onChange={(e) => setNewRow({ ...newRow, nDoc: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-800"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Descrição do movimento"
                    value={newRow.descricao}
                    onChange={(e) => setNewRow({ ...newRow, descricao: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-800"
                  />
                </td>
                {tableType === 'banco' && (
                  <td className="py-2 px-3">
                    <select
                      value={newRow.tipo}
                      onChange={(e) =>
                        setNewRow({ ...newRow, tipo: e.target.value as 'debito' | 'credito' })
                      }
                      className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                    >
                      <option value="debito">Débito (+B)</option>
                      <option value="credito">Crédito (-C)</option>
                    </select>
                  </td>
                )}
                <td className="py-2 px-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newRow.valor || ''}
                    onChange={(e) =>
                      setNewRow({ ...newRow, valor: parseNumberSafely(e.target.value) })
                    }
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded text-right font-mono focus:ring-1 focus:ring-slate-800"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Inserir nota desta linha..."
                    value={newRow.observacao}
                    onChange={(e) => setNewRow({ ...newRow, observacao: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-800"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveNewRow}
                      className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                      title="Salvar linha"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingRow(false)}
                      className="p-1 text-slate-400 hover:bg-slate-200 rounded cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* List items */}
            {items.length === 0 && !isAddingRow ? (
              <tr>
                <td
                  colSpan={tableType === 'banco' ? 7 : 6}
                  className="py-8 text-center text-slate-400 bg-slate-50/40 italic"
                >
                  Nenhum movimento registado neste campo.
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRow(true)}
                      className="inline-flex items-center gap-1 text-xs text-slate-800 bg-white border border-slate-300 px-3 py-1 rounded-md font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      + Adicionar linha
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isEditing ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="py-2 px-4 font-mono text-[11px]">
                      {isEditing ? (
                        <input
                          type="date"
                          value={item.data}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { data: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      ) : (
                        item.data
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.nDoc}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { nDoc: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      ) : (
                        item.nDoc
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { descricao: e.target.value })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{item.descricao}</span>
                      )}
                    </td>
                    {tableType === 'banco' && (
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <select
                            value={item.tipo || 'debito'}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                tipo: e.target.value as 'debito' | 'credito',
                              })
                            }
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                          >
                            <option value="debito">Débito (+B)</option>
                            <option value="credito">Crédito (-C)</option>
                          </select>
                        ) : item.tipo === 'credito' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <ArrowDownCircle className="w-3 h-3" />
                            Crédito (-C)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                            <ArrowUpCircle className="w-3 h-3" />
                            Débito (+B)
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-2 px-4 text-right font-mono font-semibold text-slate-900">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.valor}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              valor: parseNumberSafely(e.target.value),
                            })
                          }
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded text-right"
                        />
                      ) : (
                        formatMoeda(item.valor)
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.observacao || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { observacao: e.target.value })
                        }
                        placeholder="Inserir nota nesta linha..."
                        className="w-full text-xs px-2.5 py-1 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:bg-white rounded bg-slate-50/50 transition-colors placeholder:text-slate-400 placeholder:italic"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="Concluir edição"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                            title="Editar dados da linha"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Remover linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Subtotal Summary Footer */}
      <div className="bg-slate-100/80 px-5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{subtotalsText}</span>
        <button
          type="button"
          onClick={() => setIsAddingRow(true)}
          className="text-slate-700 hover:text-slate-900 font-semibold text-xs inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          Adicionar linha neste campo
        </button>
      </div>
    </div>
  );
};
