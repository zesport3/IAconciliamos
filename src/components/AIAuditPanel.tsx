import React, { useState } from 'react';
import { Empresa, Reconciliacao, AIAuditResult, LancamentoSugeridoIA } from '../types';
import { formatMoeda, formatValorComMoeda, getSimboloMoeda } from '../utils/calculations';
import { GuiaSNCModal } from './GuiaSNCModal';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Send,
  HelpCircle,
  FileText,
  BookOpen,
  ArrowRight,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Scale,
} from 'lucide-react';

interface AIAuditPanelProps {
  empresa: Empresa;
  reconciliacao: Reconciliacao;
  onApplyNotaExplicativa: (nota: string) => void;
}

export const AIAuditPanel: React.FC<AIAuditPanelProps> = ({
  empresa,
  reconciliacao,
  onApplyNotaExplicativa,
}) => {
  const isSNC = true;
  const moedaSymbol = '€';

  const [loading, setLoading] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AIAuditResult | null>(
    reconciliacao.ultimaAuditoriaIA || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLancamentos, setCopiedLancamentos] = useState<boolean>(false);
  const [copiedNota, setCopiedNota] = useState<boolean>(false);
  const [appliedNota, setAppliedNota] = useState<boolean>(false);
  const [isGuiaOpen, setIsGuiaOpen] = useState<boolean>(false);

  // Active sub-tab inside audit panel
  const [activeTab, setActiveTab] = useState<'parecer' | 'lancamentos' | 'riscos' | 'chat'>('parecer');

  // Interactive Chat with Gemini
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Olá! Sou o seu Revisor Oficial de Contas (ROC) e assistente de auditoria virtual para a conciliação de ${reconciliacao.mes} da entidade ${empresa.nome}. Posso esclarecer regras do SNC (Decreto-Lei n.º 158/2009 e DL 98/2015), prazos do Banco de Portugal (cheques LUC e transferências SEPA), dedutibilidade em CIRC ou contas da Classe 1, 2 e 6.`,
    },
  ]);

  const runAIAudit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa,
          reconciliacao,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao comunicar com a inteligência artificial.');
      }

      setAuditResult(data.audit);
      setActiveTab('parecer');
    } catch (err: any) {
      console.error('Erro na auditoria com IA:', err);
      setErrorMessage(
        err?.message || 'Não foi possível efetuar a verificação por IA neste momento.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatPrompt;
    if (!textToSend.trim() || chatLoading) return;

    const newMessages = [...chatMessages, { sender: 'user' as const, text: textToSend }];
    setChatMessages(newMessages);
    if (!presetText) setChatPrompt('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa,
          reconciliacao,
          auditResult,
          prompt: textToSend,
          history: newMessages.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar resposta.');
      }

      setChatMessages((prev) => [...prev, { sender: 'ai', text: data.answer }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `Desculpe, ocorreu um erro: ${err?.message || 'Falha de conexão.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyLancamentosToClipboard = () => {
    if (!auditResult?.lancamentosSugeridos?.length) return;

    const formatted = auditResult.lancamentosSugeridos
      .map(
        (l, idx) =>
          `Lançamento #${idx + 1} - ${l.item} (${formatValorComMoeda(l.valor, empresa.moeda)})\n` +
          `• DÉBITO:  ${l.contaDebito}\n` +
          `• CRÉDITO: ${l.contaCredito}\n` +
          `• Justificação: ${l.justificativa}\n`
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(formatted);
    setCopiedLancamentos(true);
    setTimeout(() => setCopiedLancamentos(false), 3000);
  };

  const copyNotaToClipboard = () => {
    if (!auditResult?.notaExplicativaSugerida) return;
    navigator.clipboard.writeText(auditResult.notaExplicativaSugerida);
    setCopiedNota(true);
    setTimeout(() => setCopiedNota(false), 3000);
  };

  const handleApplyNota = () => {
    if (!auditResult?.notaExplicativaSugerida) return;
    onApplyNotaExplicativa(auditResult.notaExplicativaSugerida);
    setAppliedNota(true);
    setTimeout(() => setAppliedNota(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <GuiaSNCModal isOpen={isGuiaOpen} onClose={() => setIsGuiaOpen(false)} />

      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
            <Sparkles className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">
                Verificação e Auditoria com Inteligência Artificial
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                {isSNC ? 'SNC Portugal' : 'PGC-NIRF'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSNC
                ? 'Auditoria segundo o SNC (DL 158/2009), regras do Banco de Portugal e Código das Sociedades Comerciais'
                : 'Auditoria de integridade da equação, análise de pendências e sugestão de lançamentos PGC-NIRF'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsGuiaOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors cursor-pointer"
            title="Consulte as leis, normas do SNC, prazos do Banco de Portugal e contas oficiais"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Critérios SNC Portugal</span>
          </button>

          {/* Trigger Button */}
          <button
            type="button"
            onClick={runAIAudit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                <span>A Auditar Conciliação...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-900" />
                <span>{auditResult ? 'Reavaliar com IA' : 'Executar Verificação com IA'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* When no audit executed yet */}
      {!auditResult && !loading && (
        <div className="p-8 text-center text-slate-600">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Bot className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Verificação Inteligente Disponível
          </h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto mb-5">
            Clique em <strong>"Executar Verificação com IA"</strong> para auditar automaticamente os saldos do extrato vs razão, validar as tabelas de movimentos e gerar recomendações de lançamentos contabilísticos em conformidade com as leis e critérios do SNC de Portugal (DL 158/2009).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">✓ Equação e Cruzamento</span>
              <p className="text-slate-500 text-[11px]">
                Valida a fórmula A + B − C − D + E e detalha qualquer discrepância em euros (€).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">
                ✓ Lançamentos SNC (Portugal)
              </span>
              <p className="text-slate-500 text-[11px]">
                Sugere contas SNC (12 Depósitos, 6228 FSE, 244 Imposto do Selo 4% e juros).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">✓ Deteção de Riscos Legais</span>
              <p className="text-slate-500 text-[11px]">
                Verifica prazos do Banco de Portugal (8 dias cheques LUC, SEPA D+1) e arquivo de 10 anos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State Skeleton */}
      {loading && (
        <div className="p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            A Perita IA está a auditar o Mapa de Conciliação...
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            A validar a consistência matemática da equação, a cruzar débitos e créditos com o PGC-NIRF e a analisar itens em trânsito.
          </p>
        </div>
      )}

      {/* Audit Result Display */}
      {auditResult && !loading && (
        <div>
          {/* Status Header Banner */}
          <div
            className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              auditResult.statusAuditoria === 'conforme'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : auditResult.statusAuditoria === 'com_ressalvas'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {auditResult.statusAuditoria === 'conforme' ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              ) : auditResult.statusAuditoria === 'com_ressalvas' ? (
                <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Parecer da Auditoria IA
                </span>
                <span className="text-sm font-bold">
                  {auditResult.tituloStatus || 'Auditoria Concluída'}
                </span>
              </div>
            </div>

            {/* Quick Action: Apply suggested note */}
            {auditResult.notaExplicativaSugerida && (
              <button
                type="button"
                onClick={handleApplyNota}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Aplica este texto diretamente no campo de Notas Explicativas do Mapa"
              >
                {appliedNota ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aplicado às Notas!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Aplicar às Notas do Mapa</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex border-b border-slate-200 px-4 bg-slate-50/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('parecer')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'parecer'
                  ? 'border-slate-900 text-slate-900 bg-white -mb-px rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Parecer Executivo & Equação
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lancamentos')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'lancamentos'
                  ? 'border-slate-900 text-slate-900 bg-white -mb-px rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {isSNC ? 'Lançamentos Sugeridos SNC' : 'Lançamentos Sugeridos PGC-NIRF'} ({auditResult.lancamentosSugeridos?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('riscos')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'riscos'
                  ? 'border-slate-900 text-slate-900 bg-white -mb-px rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Anomalias e Recomendações ({auditResult.anomaliasERiscos?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chat'
                  ? 'border-slate-900 text-slate-900 bg-white -mb-px rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Consultar Assistente IA
            </button>
          </div>

          {/* Sub-Tab 1: Parecer Executivo & Equação */}
          {activeTab === 'parecer' && (
            <div className="p-5 space-y-5">
              {/* Executive Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Resumo Executivo da Auditoria
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                  {auditResult.resumoExecutivo}
                </div>
              </div>

              {/* Mathematical Equation Breakdown */}
              {auditResult.verificacaoMatematica && (
                <div className="p-4 bg-slate-900 text-white rounded-lg text-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold uppercase tracking-wider text-emerald-400 text-[10px]">
                      Validação Matemática da Equação
                    </span>
                    {auditResult.verificacaoMatematica.confereFormula ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        ✓ Equação Consistente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                        ⚠ Inconsistência Matemática
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {auditResult.verificacaoMatematica.detalheCalculo}
                  </p>
                </div>
              )}

              {/* Suggested Note Box */}
              {auditResult.notaExplicativaSugerida && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      Nota Explicativa Formal Sugerida para o Relatório
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyNotaToClipboard}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                      >
                        {copiedNota ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedNota ? 'Copiado' : 'Copiar Texto'}
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyNota}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold"
                      >
                        {appliedNota ? '✓ Aplicado' : '→ Inserir no Mapa'}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs text-slate-800 leading-relaxed font-sans">
                    {auditResult.notaExplicativaSugerida}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Lançamentos Sugeridos PGC-NIRF */}
          {activeTab === 'lancamentos' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lançamentos de Regularização Contabilística (PGC-NIRF)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Movimentos registados pelo banco ainda em falta no diário da empresa.
                  </p>
                </div>
                {auditResult.lancamentosSugeridos?.length > 0 && (
                  <button
                    type="button"
                    onClick={copyLancamentosToClipboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    {copiedLancamentos ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiados!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Todos</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {!auditResult.lancamentosSugeridos || auditResult.lancamentosSugeridos.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                  Não foram identificados movimentos no extrato que necessitem de lançamento de regularização.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditResult.lancamentosSugeridos.map((l, index) => (
                    <div
                      key={index}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-colors text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-slate-900 text-sm">{l.item}</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {formatValorComMoeda(l.valor, empresa.moeda)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 font-mono text-[11px]">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">
                            DÉBITO (+)
                          </span>
                          <span className="font-semibold text-sky-800">{l.contaDebito}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">
                            CRÉDITO (−)
                          </span>
                          <span className="font-semibold text-amber-800">{l.contaCredito}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-[11px] mt-1 font-sans">
                        <strong className="text-slate-700">Justificação:</strong> {l.justificativa}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Anomalias e Riscos & Recomendações */}
          {activeTab === 'riscos' && (
            <div className="p-5 space-y-6">
              {/* Anomalias e Riscos */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                  Alertas e Análise de Risco
                </h4>
                {!auditResult.anomaliasERiscos || auditResult.anomaliasERiscos.length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Nenhuma anomalia de risco detectada nesta conciliação.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {auditResult.anomaliasERiscos.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                          item.nivel === 'alto'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : item.nivel === 'medio'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                            item.nivel === 'alto'
                              ? 'bg-rose-200 text-rose-900'
                              : item.nivel === 'medio'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Risco {item.nivel}
                        </span>
                        <div>
                          <span className="font-bold block text-sm">{item.titulo}</span>
                          <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                            {item.descricao}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recomendações e Ações */}
              {auditResult.recomendacoesAcoes && auditResult.recomendacoesAcoes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
                    Plano de Ação Recomendado para o Contabilista
                  </h4>
                  <div className="space-y-2">
                    {auditResult.recomendacoesAcoes.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4: Chat com o Auditor IA */}
          {activeTab === 'chat' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Assistente Técnico de Conciliação Bancária
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tire dúvidas em tempo real sobre lançamentos, extratos e reconciliação.
                  </p>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {isSNC ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Qual a razão da diferença de conciliação e que contas do SNC (Decreto-Lei n.º 158/2009) devo inspecionar?'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      🔍 Analisar diferença no SNC
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Como contabilizo no SNC as comissões bancárias e os 4% de Imposto do Selo (TGIS 17.3.4)? Que contas uso (6228, 244)?'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      ⚖️ Imposto do Selo 4% e Comissões
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Qual o prazo legal do Banco de Portugal e LUC para cheques em circulação (8 dias e 6 meses de prescrição)?'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      🕒 Prazos Banco de Portugal / Cheques
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Redige uma nota explicativa técnica para o Anexo ao Balanço justificando os saldos bancários e itens em reconciliação.'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      📜 Redigir Nota Explicativa (Anexo)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Qual a razão da diferença de conciliação atual e que contas do PGC-NIRF devo verificar?'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      🔍 Explicar diferença atual
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Como devo proceder se um cheque emitido há mais de 3 meses ainda não foi descontado no banco?'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      🕒 Cheque pendente há mais de 3 meses
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendChatMessage(
                          'Redige um parágrafo para a Nota de Apresentação das Demonstrações Financeiras justificando os itens pendentes deste mês.'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      📝 Redigir nota para demonstrações financeiras
                    </button>
                  </>
                )}
              </div>

              {/* Messages container */}
              <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 text-xs leading-relaxed ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-lg max-w-[85%] whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2 text-xs text-slate-500 items-center">
                    <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>A pensar com base nos saldos da conciliação...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                  placeholder="Coloque a sua questão à IA sobre este mapa ou lançamentos..."
                  className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleSendChatMessage()}
                  disabled={chatLoading || !chatPrompt.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
