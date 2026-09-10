import React, { useState } from 'react';
import {
  LEGISLACAO_PORTUGAL_SNC,
  PLANO_CONTAS_SNC,
} from '../data/normativoSNC';
import {
  BookOpen,
  Scale,
  Landmark,
  FileCheck,
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

interface GuiaSNCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuiaSNCModal: React.FC<GuiaSNCModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'leis' | 'contas' | 'bdp' | 'checklist'>('leis');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Leis & Critérios Contabilísticos de Portugal
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  SNC & Banco de Portugal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistema de Normalização Contabilística (DL 158/2009), CSC e Normas Regulamentares
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

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-6 gap-2 shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('leis')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leis'
                ? 'border-emerald-600 text-slate-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Enquadramento Legal & Decretos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bdp')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bdp'
                ? 'border-emerald-600 text-slate-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Regras Banco de Portugal & Prazos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contas')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'contas'
                ? 'border-emerald-600 text-slate-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>Quadro de Contas SNC (Classe 1, 2, 6 e 7)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-emerald-600 text-slate-900 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4 text-amber-600" />
            <span>Checklist de Auditoria Mensal</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 max-h-[calc(90vh-140px)]">
          {/* TAB 1: LEIS E DECRETOS */}
          {activeTab === 'leis' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed">
                <strong>Critério Geral em Portugal:</strong> A conciliação bancária mensal é um procedimento de controlo interno indispensável exigido pelas normas do Sistema de Normalização Contabilística e pelos <strong>artigos 65.º do Código das Sociedades Comerciais</strong> e <strong>123.º do Código do IRC</strong>, garantindo a veracidade dos Meios Financeiros Líquidos perante acionistas, a Autoridade Tributária (AT) e auditores/ROCs.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LEGISLACAO_PORTUGAL_SNC.map((artigo, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-shadow hover:shadow-xs space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {artigo.diploma}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">
                        {artigo.artigo} — {artigo.titulo}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {artigo.resumo}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-1 mb-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Impacto na Conciliação Bancária:
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {artigo.impactoConciliacao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: REGRAS DO BANCO DE PORTUGAL */}
          {activeTab === 'bdp' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cheques */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Prazos de Cheques (LUC)</h4>
                    <span className="text-[11px] text-slate-500">Decreto-Lei n.º 454/91</span>
                  </div>
                  <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-700">•</span>
                      <span><strong>Apresentação a pagamento: 8 dias</strong> de calendário a contar da emissão para cheques passados em Portugal.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-700">•</span>
                      <span><strong>Prescrição Cambiária: 6 meses</strong> após o termo do prazo de apresentação. Ultrapassado este prazo, o cheque não pode ser cobrado judicialmente como título executivo.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-700">•</span>
                      <span><strong>Ação de controlo:</strong> Cheques em trânsito há mais de 30 dias devem ser verificados com o fornecedor.</span>
                    </li>
                  </ul>
                </div>

                {/* SEPA */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Transferências SEPA</h4>
                    <span className="text-[11px] text-slate-500">Regulamento UE 260/2012 / BdP</span>
                  </div>
                  <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-indigo-700">•</span>
                      <span><strong>SEPA Standard (SCT): D+1 dia útil</strong>. Ordens transmitidas até ao horário de fecho do banco devem ser creditadas no destinatário no dia útil seguinte.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-indigo-700">•</span>
                      <span><strong>SEPA Imediatas: D+0 em segundos</strong> (máx. 10 segundos), disponíveis 24/7/365.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-indigo-700">•</span>
                      <span><strong>Ação de controlo:</strong> Se uma transferência emitida não aparecer no extrato após 48h úteis, contactar o banco imediatamente.</span>
                    </li>
                  </ul>
                </div>

                {/* Imposto do Selo */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Imposto do Selo (4%)</h4>
                    <span className="text-[11px] text-slate-500">TGIS Verba 17.3.4</span>
                  </div>
                  <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-700">•</span>
                      <span><strong>Taxa de 4%:</strong> Aplica-se sobre comissões de manutenção de conta, transferências, custos de TPA e emissão de cartões.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-700">•</span>
                      <span><strong>Registo Contabilístico:</strong> Debitar a conta <strong>6228</strong> (Comissão líquida) e a conta <strong>244</strong> ou <strong>6812</strong> (Imposto do Selo de 4%), creditando a conta <strong>12</strong>.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-700">•</span>
                      <span><strong>Quitação Fiscal:</strong> Exigir sempre o extrato bancário de suporte como documento com valor probatório fiscal perante a AT (CIRC art. 23.º).</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Conservação de Documentos */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Dever Legal de Conservação de Arquivo Contabilístico (10 Anos)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  De acordo com o <strong>artigo 40.º do Código Comercial</strong> e o <strong>artigo 123.º do Código do IRC</strong>, as empresas em Portugal têm a obrigação legal de arquivar todos os mapas de conciliação bancária devidamente rubricados, acompanhados dos respetivos extratos bancários mensais e cópias dos documentos de suporte, durante o prazo de <strong>10 anos</strong> civis.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PLANO DE CONTAS SNC */}
          {activeTab === 'contas' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                O Quadro de Contas do SNC estabelece as subcontas a movimentar para a regularização dos movimentos detetados no mapa de conciliação:
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Código SNC</th>
                      <th className="py-2.5 px-3">Descrição da Conta</th>
                      <th className="py-2.5 px-3">Natureza</th>
                      <th className="py-2.5 px-3">Utilização na Conciliação Bancária</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {PLANO_CONTAS_SNC.map((cta) => (
                      <tr key={cta.codigo} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {cta.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {cta.descricao}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              cta.natureza === 'Devedora'
                                ? 'bg-blue-50 text-blue-700'
                                : cta.natureza === 'Credora'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {cta.natureza}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {cta.aplicacaoConciliacao}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CHECKLIST DE AUDITORIA */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {[
                  {
                    title: '1. Obtenção do Extrato Oficial Bancário com data-valor final',
                    desc: 'Garantir que o saldo (A) corresponde rigorosamente ao último dia útil do mês e que não existem movimentos subsequentes misturados.',
                  },
                  {
                    title: '2. Verificação de Encargos Bancários e Imposto do Selo (Tabela 1)',
                    desc: 'Identificar todas as comissões, taxas de manutenção e débito de juros. Efetuar o desdobramento entre 6228 e 244 para regularização imediata no razão.',
                  },
                  {
                    title: '3. Análise da Circulação de Cheques Emitidos (Tabela 2)',
                    desc: 'Verificar se existem cheques emitidos há mais de 8 dias (prazo legal de apresentação) ou próximos do limite de prescrição cambiária de 6 meses.',
                  },
                  {
                    title: '4. Confirmação de Depósitos e Transferências em Trânsito (Tabela 3)',
                    desc: 'Validar depósitos de numerário efetuados no fecho do mês ou pagamentos SEPA em processamento interbancário.',
                  },
                  {
                    title: '5. Validação da Equação de Conciliação (A + B - C - D + E = Saldo Contabilidade)',
                    desc: 'A diferença apurada deve ser rigorosamente zero (0,00 €). Se existir diferença, não encerrar o período sem localizar o erro de registo.',
                  },
                  {
                    title: '6. Redação da Nota Explicativa para o Anexo ao Balanço',
                    desc: 'Justificar os itens materiais em trânsito com datas, número de documento e motivo da pendência.',
                  },
                  {
                    title: '7. Assinatura e Arquivo Digital/Físico por 10 anos',
                    desc: 'Recolher a assinatura de quem elaborou (Técnico de Contas / CC) e de quem aprovou (Diretor Financeiro / Gerência) e arquivar no dossiê de fecho mensal.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="text-[11px]">
            Conforme as normas do <strong>SNC (Decreto-Lei n.º 158/2009)</strong> e recomendações da <strong>Ordem dos Contabilistas Certificados (OCC)</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
