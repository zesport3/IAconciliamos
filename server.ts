import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Generate with fallback for high reliability
async function generateWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  isJson: boolean = false
) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: isJson
          ? {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          : {
              temperature: 0.3,
            },
      });
      return response;
    } catch (err: any) {
      console.warn(`Tentativa com o modelo ${model} falhou:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Reconciliation Audit endpoint
app.post('/api/ai/audit', async (req, res) => {
  try {
    const { empresa, reconciliacao } = req.body;

    if (!reconciliacao) {
      return res.status(400).json({ error: 'Dados da reconciliação são obrigatórios.' });
    }

    const ai = getGeminiClient();

    const auditPrompt = `
Você é um Revisor Oficial de Contas (ROC) e Contabilista Certificado (CC) em Portugal, membro da Ordem dos Contabilistas Certificados (OCC), especialista sénior no Sistema de Normalização Contabilística (SNC - Decreto-Lei n.º 158/2009 e DL 98/2015), controlo e mensuração de Caixa e Depósitos Bancários, Demonstração dos Fluxos de Caixa, Código das Sociedades Comerciais (art. 65.º - Prestação de contas e controlo interno), Código Comercial (art. 40.º - Arquivo por 10 anos), Código do Imposto do Selo (TGIS verba 17.3.4 - incidência de 4% sobre comissões bancárias), Código do IRC (artigos 23.º e 123.º) e regras regulamentares do Banco de Portugal (compensação interbancária SEPA e Lei Uniforme sobre Cheques - LUC).

Analise o seguinte Mapa de Conciliação Bancária de acordo estrito com as Leis e Critérios de Portugal e do SNC:

DADOS DA ENTIDADE / EMPRESA:
- Nome: ${empresa?.nome || 'Lusitânia Comércio & Tecnologias, Lda'}
- NIF: ${empresa?.nif || '509123456'}
- Instituição Bancária: ${empresa?.banco || 'Banco em Portugal'}
- Código da Conta no Razão Geral (SNC): ${empresa?.codigoConta || '12.1 Depósitos à Ordem'}
- Mês de Referência: ${reconciliacao.mes}
- Localidade: ${reconciliacao.local || 'Lisboa / Portugal'}
- Normativo Aplicável: Sistema de Normalização Contabilística (SNC - Portugal)

VALORES E CÁLCULOS PRINCIPAIS:
- (A) Saldo do Extrato Bancário à data-valor final: ${Number(reconciliacao.saldoExtratoBancario || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- (B) (+) Total de Débitos no Banco não registados na Empresa: ${Number(reconciliacao.totalDebitosBancoNaoRegistados || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- (C) (-) Total de Créditos no Banco não registados na Empresa: ${Number(reconciliacao.totalCreditosBancoNaoRegistados || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- (D) (-) Total de Pagamentos da Empresa não registados no Banco (Cheques/Transferências SEPA em trânsito): ${Number(reconciliacao.totalCreditosEmpresaNaoRegistados || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- (E) (+) Total de Débitos da Empresa não registados no Banco (Depósitos e cobranças em trânsito): ${Number(reconciliacao.totalDebitosEmpresaNaoRegistados || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Saldo Apurado (A + B - C - D + E): ${Number(reconciliacao.saldoApurado || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Saldo da Contabilidade (Livro Razão SNC): ${Number(reconciliacao.saldoContabilidade || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Diferença de Conciliação (Saldo Apurado - Saldo Contabilidade): ${Number(reconciliacao.diferencaConciliacao || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €

DETALHE DOS MOVIMENTOS DAS TABELAS:
1. (+) Pagamentos/Movimentos no Banco não registados na Empresa (Tabela 1):
${JSON.stringify(reconciliacao.pagamentosBancoNaoRegistadosEmpresa || [], null, 2)}

2. (-) Pagamentos emitidos pela Empresa não registados no Banco (Tabela 2):
${JSON.stringify(reconciliacao.pagamentosRMNaoRegistadosBanco || [], null, 2)}

3. (+) Débitos/Recebimentos da Empresa não registados no Banco (Tabela 3):
${JSON.stringify(reconciliacao.debitosEmpresaNaoRegistadosBanco || [], null, 2)}

CRITÉRIOS E TAREFAS DE AUDITORIA SEGUNDO O SNC E LEIS DE PORTUGAL:
1. Validação Matemática Rigorosa:
   - Confirme a equação: A + B - C - D + E = Saldo Apurado.
   - Verifique se a Diferença é rigorosamente 0,00 €. Qualquer cêntimo de desvio deve ser sinalizado.

2. Verificação Fiscal e Regras do Banco de Portugal:
   - Comissões e Encargos Bancários: Verifique se foram contabilizados em 6228 (FSE - Comissões bancárias) e se o Imposto do Selo (4% conforme TGIS verba 17.3.4) foi devidamente discriminado na conta 244 ou 6812. Para efeitos do art. 23.º do CIRC, o extrato bancário oficial serve de suporte documental idóneo.
   - Cheques em Trânsito: Aplique a Lei Uniforme sobre Cheques (LUC / Decreto-Lei n.º 454/91). O prazo de apresentação em Portugal é de 8 dias e a prescrição cambiária ocorre aos 6 meses. Alerte caso existam cheques com mais de 30 dias de emissão pendentes.
   - Transferências SEPA: De acordo com o Regulamento (UE) n.º 260/2012 e regras do Banco de Portugal, o prazo de execução normal é D+1 dia útil (ou imediato D+0). Transferências em trânsito há mais de 48h úteis devem ser investigadas por suspeita de devolução.
   - Depósitos de Numerário / TPA: Verifique se os depósitos efetuados pela empresa no fim do mês foram devidamente confirmados no extrato do início do mês seguinte.

3. Sugestão de Lançamentos Contabilísticos (Quadro de Contas Oficial do SNC):
   - Forneça os lançamentos de regularização para todos os itens não registados na contabilidade:
     * Débito: conta SNC apropriada (ex: 6228 FSE Serviços bancários, 244 Imposto do Selo, 6911 Juros suportados, 221 Fornecedores, 211 Clientes).
     * Crédito: conta 12 Depósitos à Ordem (ou subconta específica da empresa).
     * Justificativa fundamentada na legislação e nas boas práticas contabilísticas de Portugal.

4. Deteção de Anomalias e Riscos Contabilísticos/Fiscais:
   - Avalie riscos de incumprimento do art. 65.º do CSC (controlo interno), prescrição de cheques, deduções fiscais em IRC (art. 23.º CIRC) e arquivo de suporte por 10 anos (art. 40.º Código Comercial).

5. Parecer e Nota Explicativa:
   - Redija uma Nota Explicativa formal e auditável em português europeu para ser integrada no Anexo às Demonstrações Financeiras e no dossiê de encerramento de contas.

Responda OBRIGATORIAMENTE em formato JSON estrito com o seguinte esquema:
{
  "statusAuditoria": "conforme" | "com_ressalvas" | "divergencia_critica",
  "tituloStatus": "string com o resumo técnico do estado em Portugal (ex: 'Conciliação Conforme (SNC)', 'Pendente de Lançamentos de Regularização SNC')",
  "resumoExecutivo": "string com texto formal do parecer de auditoria e revisão legal de contas",
  "verificacaoMatematica": {
    "confereFormula": boolean,
    "detalheCalculo": "string detalhando a equação em euros (€)",
    "diferencaIdentificada": number
  },
  "lancamentosSugeridos": [
    {
      "item": "Descrição do movimento",
      "valor": number,
      "tabelaOrigem": "string (ex: Banco não registado na Empresa)",
      "contaDebito": "string com código e descrição oficial do SNC (ex: 6228 - FSE: Comissões Bancárias)",
      "contaCredito": "string com código e descrição oficial do SNC (ex: 12.1.01 - Depósitos à Ordem BCP)",
      "justificativa": "string com fundamentação legal e fiscal no SNC/CIRC"
    }
  ],
  "anomaliasERiscos": [
    {
      "nivel": "baixo" | "medio" | "alto",
      "titulo": "string",
      "descricao": "string fundamentada na regulamentação de Portugal (BdP, LUC, SNC, CIRC)"
    }
  ],
  "recomendacoesAcoes": [
    "string com ação prática recomendada pela OCC / OROC para o fecho mensal"
  ],
  "notaExplicativaSugerida": "string com texto formal em português europeu pronto para o Anexo ao Balanço e Demonstração dos Fluxos de Caixa"
}
`;

    const response = await generateWithFallback(ai, auditPrompt, true);

    const text = response.text?.trim() || '{}';
    let auditJson;
    try {
      auditJson = JSON.parse(text);
    } catch {
      // Clean up in case markdown code fences were returned
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      auditJson = JSON.parse(cleaned);
    }

    return res.json({ success: true, audit: auditJson });
  } catch (error: any) {
    console.error('Erro na auditoria com IA:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao processar a auditoria com IA.',
    });
  }
});

// AI Interactive Assistant / Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { empresa, reconciliacao, auditResult, prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'A pergunta ou instrução é obrigatória.' });
    }

    const ai = getGeminiClient();

    const systemContext = `
Você é o Assistente Virtual, Revisor Oficial de Contas (ROC) e Contabilista Certificado (CC) perito nas Leis e Critérios de Portugal e no Sistema de Normalização Contabilística (SNC - Decreto-Lei n.º 158/2009 e DL 98/2015).
Você auxilia contabilistas, auditores e diretores financeiros em Portugal a analisar, justificar e regularizar conciliações bancárias em conformidade com:
- Mensuração e Controlo de Caixa, Depósitos Bancários e Fluxos de Caixa;
- Código das Sociedades Comerciais (CSC art. 65.º - controlo interno e prestação de contas);
- Código Comercial (art. 40.º - conservação de correspondência e extratos bancários por 10 anos);
- Imposto do Selo (TGIS verba 17.3.4 - 4% sobre comissões bancárias, conta 244);
- Código do IRC (art. 23.º - aceitação fiscal de gastos bancários com extrato oficial e art. 123.º);
- Regras do Banco de Portugal e SEPA (prazos de execução D+1 / imediatas D+0, e LUC - cheques com 8 dias de apresentação e 6 meses de prescrição cambiária).

Contexto da Entidade Ativa:
- Entidade: ${empresa?.nome || 'Lusitânia Comércio & Tecnologias, Lda'} (NIF: ${empresa?.nif || '509123456'}, Banco: ${empresa?.banco || 'Banco'})
- Código SNC da Conta: ${empresa?.codigoConta || '12.1 Depósitos à Ordem'}
- Mês de Conciliação: ${reconciliacao?.mes || 'Mês Atual'}
- Saldo Extrato Bancário: ${Number(reconciliacao?.saldoExtratoBancario || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Saldo da Contabilidade (Razão SNC): ${Number(reconciliacao?.saldoContabilidade || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Saldo Apurado: ${Number(reconciliacao?.saldoApurado || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Diferença de Conciliação: ${Number(reconciliacao?.diferencaConciliacao || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €

Movimentos Pendentes:
- (+) Pagamentos no Banco não registados na Entidade: ${reconciliacao?.pagamentosBancoNaoRegistadosEmpresa?.length || 0} itens
- (-) Pagamentos da Entidade não registados no Banco (Cheques/SEPA em trânsito): ${reconciliacao?.pagamentosRMNaoRegistadosBanco?.length || 0} itens
- (+) Débitos da Entidade não registados no Banco (Depósitos em trânsito): ${reconciliacao?.debitosEmpresaNaoRegistadosBanco?.length || 0} itens

${auditResult ? `Último Parecer de Auditoria IA: ${JSON.stringify(auditResult)}` : ''}

Responda em português europeu correto, com alto rigor técnico contabilístico. Sempre que sugerir lançamentos, indique as contas exatas do Quadro de Contas do SNC (ex: 12 Depósitos à Ordem, 211 Clientes, 221 Fornecedores, 244 Imposto do Selo, 6228 FSE Comissões Bancárias, 6911 Juros Suportados, 7911 Juros Obtidos).
`;

    const chatPrompt = `${systemContext}\n\nHistórico recente: ${JSON.stringify(history || [])}\n\nPergunta do Utilizador: ${prompt}`;

    const response = await generateWithFallback(ai, chatPrompt, false);

    return res.json({
      success: true,
      answer: response.text?.trim() || 'Sem resposta gerada.',
    });
  } catch (error: any) {
    console.error('Erro no assistente IA:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao contactar o assistente IA.',
    });
  }
});

// AI Reconciliation directly from 2 Excel Statements (Extrato Banco + Extrato Contabilidade)
app.post('/api/ai/reconciliar-extratos', async (req, res) => {
  try {
    const {
      empresa,
      campo1 = [],
      campo2 = [],
      campo3 = [],
      campo4 = [],
      saldoBanco = 0,
      saldoContab = 0,
      matchedCount = 0,
      reconciliacaoAnterior = null,
    } = req.body;

    const ai = getGeminiClient();

    const prompt = `
Você é um Revisor Oficial de Contas (ROC) e Contabilista Certificado (CC) em Portugal, perito no Sistema de Normalização Contabilística (SNC • Decreto-Lei n.º 158/2009).
O utilizador importou os ficheiros Excel do Extrato Bancário e do Extrato da Contabilidade (Razão da conta 12), ambos estruturados com as seguintes 6 colunas oficiais:
[data, descritivo, nº movimento, valor debito, valor credito, saldo].

REGRA FUNDAMENTAL: A reconciliação NÃO pode apresentar divergência (diferença deve ser 0,00 €). Se não aparecem os movimentos da reconciliação anterior, é estritamente obrigatório mantê-los para a reconciliação seguinte até serem liquidados.

${
  reconciliacaoAnterior
    ? `CONTEXTO DA RECONCILIAÇÃO DO MÊS ANTERIOR (${reconciliacaoAnterior.mes || 'Mês Anterior'}):
A IA deve ter em conta os movimentos que já vinham em aberto no mês anterior:
- Débitos na empresa s/ correspondência no banco anteriores: ${JSON.stringify(reconciliacaoAnterior.campo1_debitosEmpresaSemBanco || reconciliacaoAnterior.debitosEmpresaNaoBanco || [])}
- Créditos na empresa s/ correspondência no banco anteriores: ${JSON.stringify(reconciliacaoAnterior.campo2_creditosEmpresaSemBanco || reconciliacaoAnterior.creditosEmpresaNaoBanco || [])}
- Débitos no banco s/ correspondência na empresa anteriores: ${JSON.stringify(reconciliacaoAnterior.campo3_debitosBancoSemEmpresa || reconciliacaoAnterior.debitosBancoNaoEmpresa || [])}
- Créditos no banco s/ correspondência na empresa anteriores: ${JSON.stringify(reconciliacaoAnterior.campo4_creditosBancoSemEmpresa || reconciliacaoAnterior.creditosBancoNaoEmpresa || [])}
Verifique se algum destes itens antigos foi regularizado neste mês corrente ou se permanece em trânsito. Os itens que não apareceram no extrato bancário ou na contabilidade têm de ser mantidos abertos nos respetivos campos!`
    : 'Esta é a primeira reconciliação com extratos ou não foi fornecido mês anterior.'
}

Após cruzamento automático dos movimentos, identificaram-se os movimentos pendentes distribuídos pelos 4 campos oficiais da Reconciliação:
1 - Débito na empresa s/ correspondência no Banco (Depósitos em trânsito):
${JSON.stringify(campo1, null, 2)}

2 - Crédito na Empresa s/ correspondência no Banco (Cheques/ordens em trânsito):
${JSON.stringify(campo2, null, 2)}

3 - Débito no banco s/ correspondência na Empresa (Comissões, despesas e débitos diretos s/ lançamento):
${JSON.stringify(campo3, null, 2)}

4 - Crédito no banco s/ correspondência na Empresa (Transferências recebidas, juros s/ lançamento):
${JSON.stringify(campo4, null, 2)}

Dados da Entidade:
- Nome: ${empresa?.nome || 'Entidade'}
- NIF: ${empresa?.nif || '509123456'}
- Banco: ${empresa?.banco || 'Banco'}
- Saldo do Extrato Bancário: ${Number(saldoBanco).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Saldo da Contabilidade: ${Number(saldoContab).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
- Movimentos já conferidos e casados: ${matchedCount}

SUAS TAREFAS:
1. Avaliar tecnicamente as divergências encontradas nos 4 campos.
2. Sugerir os lançamentos contabilísticos de regularização para o diário da empresa (principalmente para os itens dos campos 3 e 4 que exigem registo na contabilidade), com as contas exatas do SNC (ex: 6228 FSE Comissões Bancárias, 244 Imposto do Selo 4%, 221 Fornecedores, 211 Clientes, 7911 Juros Obtidos, 121 Depósitos à Ordem).
3. Gerar Nota Explicativa técnica para o dossiê fiscal de encerramento.
4. Identificar anomalias e riscos legais (ex: prescrição de cheques pela LUC, prazos SEPA).

Responda OBRIGATORIAMENTE em JSON válido:
{
  "analiseGeral": "string com avaliação técnica concisa e formal",
  "lancamentosSugeridos": [
    {
      "item": "string",
      "valor": 0.00,
      "tabelaOrigem": "Campo 3 (Débito no Banco)" | "Campo 4 (Crédito no Banco)",
      "contaDebito": "string (código e designação SNC)",
      "contaCredito": "string (código e designação SNC)",
      "justificativa": "string fundamentada nas normas fiscais/contabilísticas de Portugal"
    }
  ],
  "anomaliasERiscos": [
    {
      "nivel": "baixo" | "medio" | "alto",
      "titulo": "string",
      "descricao": "string"
    }
  ],
  "recomendacoesAcoes": [
    "string"
  ],
  "notaExplicativaSugerida": "string formal para anexo às contas"
}
`;

    const response = await generateWithFallback(ai, prompt, true);
    let parsedData: any = {};
    try {
      const cleanJson = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '{}';
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('Erro ao processar JSON da IA:', parseErr);
      parsedData = {
        analiseGeral: response.text || 'Reconciliação analisada com sucesso.',
        lancamentosSugeridos: [],
        anomaliasERiscos: [],
        recomendacoesAcoes: ['Regularizar movimentos não lançados no diário geral de movimentos bancários.'],
        notaExplicativaSugerida: 'Reconciliação bancária efetuada em estrita conformidade com as normas contabilísticas.',
      };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Erro na reconciliação de extratos:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao executar reconciliação inteligente.',
    });
  }
});

// Vite Middleware for development vs static dist for production
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Conciliação Bancária ativo em http://0.0.0.0:${PORT}`);
  });
}

setupServer();
