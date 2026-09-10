import React, { useState, useRef } from 'react';
import { MovimentoConciliacao } from '../types';
import { parseFileToMovimentos, downloadSampleTemplate } from '../utils/excelParser';
import { formatMoeda } from '../utils/calculations';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (movimentos: MovimentoConciliacao[], replace: boolean) => void;
  tableTitle: string;
  tableType: 'banco' | 'empresa_rm' | 'empresa_debito';
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  tableTitle,
  tableType,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<MovimentoConciliacao[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);
    setLoading(true);

    try {
      const defaultTipo = tableType === 'banco' ? 'debito' : undefined;
      const result = await parseFileToMovimentos(uploadedFile, defaultTipo);

      if (!result.success) {
        setError(result.error || 'Erro ao processar ficheiro');
        setPreviewItems([]);
      } else if (result.data.length === 0) {
        setError('O ficheiro foi lido mas nenhuma linha válida de movimento foi encontrada.');
        setPreviewItems([]);
      } else {
        setPreviewItems(result.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao ler o ficheiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewItems.length > 0) {
      onImport(previewItems, replaceExisting);
      onClose();
    }
  };

  const resetState = () => {
    setFile(null);
    setError(null);
    setPreviewItems([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Importar Movimentos (Excel / CSV)</h3>
              <p className="text-xs text-slate-300 line-clamp-1">{tableTitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Upload Area */}
          {!file && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Arraste o ficheiro para aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Suporta ficheiros Microsoft Excel (.xlsx, .xls) e CSV (.csv)
                    </p>
                  </div>
                </div>
              </div>

              {/* Template download link */}
              <div className="mt-3 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-600">
                  Colunas esperadas: <strong>Data, Nº Doc, Descrição, Valor, Observação</strong>
                </span>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate(tableType)}
                  className="text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1.5 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descarregar Modelo
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-8 text-center text-sm text-slate-600">
              A analisar e mapear colunas do ficheiro...
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <strong className="block font-semibold mb-0.5">Erro na Importação:</strong>
                <span>{error}</span>
                <div className="mt-2">
                  <button
                    onClick={resetState}
                    className="underline text-red-700 hover:text-red-900 font-medium"
                  >
                    Tentar outro ficheiro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview of parsed rows */}
          {previewItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    {previewItems.length} movimentos detetados em{' '}
                    <span className="font-mono text-slate-900">{file?.name}</span>
                  </span>
                </div>
                <button
                  onClick={resetState}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Trocar ficheiro
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Nº Doc</th>
                      <th className="py-2 px-3">Descrição</th>
                      {tableType === 'banco' && <th className="py-2 px-3">Tipo</th>}
                      <th className="py-2 px-3 text-right">Valor</th>
                      <th className="py-2 px-3">Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {previewItems.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-mono">{row.data}</td>
                        <td className="py-1.5 px-3">{row.nDoc}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-800 truncate max-w-xs">
                          {row.descricao}
                        </td>
                        {tableType === 'banco' && (
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                row.tipo === 'credito'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {row.tipo === 'credito' ? 'Crédito' : 'Débito'}
                            </span>
                          </td>
                        )}
                        <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-900">
                          {formatMoeda(row.valor)}
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 truncate max-w-[120px]">
                          {row.observacao || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewItems.length > 10 && (
                <p className="text-[11px] text-slate-500 text-right">
                  + {previewItems.length - 10} outros movimentos serão importados
                </p>
              )}

              {/* Mode: Replace or Append */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>
                    <strong>Substituir movimentos atuais desta tabela</strong> (se desmarcado, serão adicionados ao fim da lista)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={previewItems.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Concluir Importação ({previewItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};
