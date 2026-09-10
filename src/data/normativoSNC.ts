export interface ArtigoLei {
  diploma: string;
  artigo: string;
  titulo: string;
  resumo: string;
  impactoConciliacao: string;
}

export interface ContaPlanoSNC {
  codigo: string;
  descricao: string;
  natureza: 'Devedora' | 'Credora' | 'Mista';
  aplicacaoConciliacao: string;
}

export const BANCOS_PORTUGAL = [
  'Millennium BCP',
  'Caixa Geral de Depósitos (CGD)',
  'Banco Santander Totta',
  'Novo Banco',
  'Banco BPI',
  'Banco Montepio',
  'Crédito Agrícola',
  'Banco CTT',
  'Bankinter Portugal',
  'EuroBic',
];

export const LEGISLACAO_PORTUGAL_SNC: ArtigoLei[] = [
  {
    diploma: 'Decreto-Lei n.º 158/2009, de 13 de julho (com DL 98/2015)',
    artigo: 'Artigos 1.º a 14.º & Estrutura Conceptual',
    titulo: 'Sistema de Normalização Contabilística (SNC)',
    resumo:
      'Aprova o modelo de normalização contabilística em Portugal alinhado com as diretivas europeias e as normas internacionais de contabilidade (IFRS/IAS).',
    impactoConciliacao:
      'Impõe a representação fidedigna da posição financeira. As contas de Meios Financeiros Líquidos (Classe 1) devem refletir com precisão a totalidade dos direitos e obrigações monetárias à data do balanço.',
  },
  {
    diploma: 'Aviso n.º 15655/2009 / Portaria n.º 218/2015',
    artigo: 'Normas SNC — Instrumentos Financeiros',
    titulo: 'Mensuração e Controlo de Caixa e Depósitos Bancários',
    resumo:
      'Regula o reconhecimento, desreconhecimento e mensuração dos depósitos à ordem e outros instrumentos financeiros ao custo amortizado / justo valor.',
    impactoConciliacao:
      'Exige que os saldos bancários constantes do balanço sejam suportados por mapas de conciliação documental que justifiquem de forma exaustiva qualquer diferença face aos extratos das instituições de crédito.',
  },
  {
    diploma: 'Aviso n.º 15655/2009',
    artigo: 'NCRF 2 — Demonstração dos Fluxos de Caixa',
    titulo: 'Definição de Meios Financeiros Líquidos (Caixa e Depósitos)',
    resumo:
      'Determina a apresentação dos fluxos das atividades operacionais, de investimento e de financiamento.',
    impactoConciliacao:
      'O saldo final apurado de Meios Financeiros Líquidos deve corresponder com exatidão à soma das disponibilidades bancárias e de caixa apuradas nos mapas de conciliação à data de encerramento.',
  },
  {
    diploma: 'Código das Sociedades Comerciais (CSC)',
    artigo: 'Artigo 65.º e seguintes',
    titulo: 'Dever de Elaboração e Prestação das Contas do Exercício',
    resumo:
      'Determina a obrigatoriedade dos órgãos de administração elaborarem o relatório de gestão, o balanço, a demonstração dos resultados e o anexo.',
    impactoConciliacao:
      'A falta de conciliações bancárias periódicas constitui violação das boas práticas de controlo interno societário e põe em causa a certificação legal das contas pelo Revisor Oficial de Contas (ROC).',
  },
  {
    diploma: 'Código Comercial Português',
    artigo: 'Artigos 29.º a 43.º',
    titulo: 'Obrigatoriedade de Escrituração Mercantil e Arquivo (10 Anos)',
    resumo:
      'Obriga todos os comerciantes a terem escrituração mercantil organizada e a manterem em arquivo todos os livros, correspondência e documentos comprovativos.',
    impactoConciliacao:
      'Os extratos bancários, cópias de cheques emitidos, comprovativos de transferências SEPA e os mapas mensais de conciliação assinados devem ser guardados por um período mínimo legal de 10 anos.',
  },
  {
    diploma: 'Código do Imposto do Selo (CIS)',
    artigo: 'TGIS Verba 17.3.4',
    titulo: 'Tributação de Comissões e Encargos Bancários (4%)',
    resumo:
      'Incidência de Imposto do Selo à taxa de 4% sobre comissões, despesas de manutenção, anuidades de cartões e outros serviços cobrados por instituições de crédito.',
    impactoConciliacao:
      'As despesas debitadas no extrato bancário devem ser desdobradas na contabilidade entre FSE (conta 6228) e Imposto do Selo suportado (conta 244 ou 6812), exigindo respetiva quitação para efeitos fiscais.',
  },
  {
    diploma: 'Código do IRC (CIRC)',
    artigo: 'Artigos 17.º, 23.º e 123.º',
    titulo: 'Requisitos Contabilísticos e Comprovação Fiscal de Gastos',
    resumo:
      'Define que o lucro tributável das empresas é apurado com base no SNC. Os gastos só são fiscalmente dedutíveis se estiverem devidamente documentados e suportados.',
    impactoConciliacao:
      'Débitos bancários sem suporte (comissões não documentadas, transferências sem fatura-recibo) correm o risco de não aceitação fiscal pelo Fisco (Autoridade Tributária e Aduaneira - AT) e tributação autónoma.',
  },
  {
    diploma: 'Banco de Portugal / Lei Uniforme sobre Cheques (LUC)',
    artigo: 'DL n.º 454/91 & Instruções do SICOI',
    titulo: 'Prazos de Apresentação (8 dias) e Prescrição de Cheques (6 meses)',
    resumo:
      'Fixa que o cheque emitido em Portugal deve ser apresentado a pagamento no prazo de 8 dias. A ação cambiária contra o sacador prescreve decorridos 6 meses após o termo do prazo de apresentação.',
    impactoConciliacao:
      'Cheques emitidos pela empresa em trânsito há mais de 8 dias exigem acompanhamento; se ultrapassarem 6 meses, o contabilista deve contactar o beneficiário e proceder à regularização contabilística da dívida.',
  },
  {
    diploma: 'Regulamento (UE) n.º 260/2012 / Banco de Portugal',
    artigo: 'Área Única de Pagamentos em Euros (SEPA)',
    titulo: 'Prazos de Execução de Transferências SEPA (D+1 e Imediatas D+0)',
    resumo:
      'Estabelece os requisitos técnicos e de negócio para as transferências a crédito (SCT) e débitos diretos (SDD) em euros na União Europeia.',
    impactoConciliacao:
      'Transferências bancárias entre contas de instituições em Portugal ou no espaço SEPA têm prazo máximo de execução de D+1 dia útil. Qualquer transferência pendente há mais de 48h sinaliza anomalia ou estorno.',
  },
];

export const PLANO_CONTAS_SNC: ContaPlanoSNC[] = [
  {
    codigo: '12',
    descricao: 'Depósitos à ordem',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Conta principal objeto da conciliação bancária (subcontas 121 Millennium BCP, 122 CGD, etc.).',
  },
  {
    codigo: '11',
    descricao: 'Caixa',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Movimentada no depósito de numerário em trânsito ou levantamentos de caixa.',
  },
  {
    codigo: '13',
    descricao: 'Outros depósitos bancários',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Contas poupança, depósitos a prazo e aplicações de tesouraria de curto prazo.',
  },
  {
    codigo: '221',
    descricao: 'Fornecedores c/c',
    natureza: 'Credora',
    aplicacaoConciliacao: 'Pagamentos emitidos (cheques, transferências SEPA) pendentes de débito no extrato.',
  },
  {
    codigo: '211',
    descricao: 'Clientes c/c',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Recebimentos efetuados por TPA, débitos diretos SEPA ou transferências em trânsito.',
  },
  {
    codigo: '244',
    descricao: 'Estado e Outros Entes Públicos — Imposto do Selo',
    natureza: 'Credora',
    aplicacaoConciliacao: 'Registo do Imposto do Selo (4% - TGIS verba 17.3.4) liquidado sobre comissões bancárias.',
  },
  {
    codigo: '278',
    descricao: 'Outros devedores e credores (Contas de transição)',
    natureza: 'Mista',
    aplicacaoConciliacao: 'Transferências internas entre contas da mesma empresa ainda não compensadas em ambos os bancos.',
  },
  {
    codigo: '6228',
    descricao: 'FSE — Outros serviços especializados / Comissões bancárias',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Comissões de gestão de conta, taxas de processamento de transferências e encargos de cartões.',
  },
  {
    codigo: '6911',
    descricao: 'Gastos de Financiamento — Juros suportados de empréstimos e descobertos',
    natureza: 'Devedora',
    aplicacaoConciliacao: 'Juros cobrados pelo banco por descoberto bancário ou facilidades de crédito de tesouraria.',
  },
  {
    codigo: '7911',
    descricao: 'Rendimentos de Financiamento — Juros obtidos de depósitos',
    natureza: 'Credora',
    aplicacaoConciliacao: 'Juros remuneratórios creditados pelo banco em contas remuneradas ou aplicações.',
  },
];
