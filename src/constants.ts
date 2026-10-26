import { IncomeItem, TaxPaymentItem } from "./types";

export const DEFAULT_INCOME_ITEMS: IncomeItem[] = [
  { id: "i1", label: "Recebidos de Pessoa Jurídica pelo titular", value: 0, isSubject: true, description: "Salários, prolabore e outros rendimentos tributáveis pagos por empresas ao titular." },
  { id: "i2", label: "Recebidos de Pessoa Jurídica pelos dependentes", value: 0, isSubject: true, description: "Rendimentos tributáveis pagos por empresas aos dependentes informados na declaração." },
  { id: "i3", label: "Recebidos de Pessoa Física/Exterior pelo titular", value: 0, isSubject: true, description: "Rendimentos como aluguéis, pensões ou ganhos no exterior recebidos pelo titular." },
  { id: "i4", label: "Recebidos de Pessoa Física/Exterior pelos dependentes", value: 0, isSubject: true, description: "Rendimentos recebidos pelos dependentes de fontes físicas ou do exterior." },
  { id: "i5", label: "Recebidos acumuladamente pelo titular", value: 0, isSubject: true, description: "Rendimentos de anos anteriores recebidos acumuladamente (RRA) pelo titular." },
  { id: "i6", label: "Recebidos acumuladamente pelos dependentes", value: 0, isSubject: true, description: "Rendimentos de anos anteriores recebidos acumuladamente (RRA) pelos dependentes." },
  { id: "i7", label: "Resultado tributável da Atividade Rural", value: 0, isSubject: true, description: "Lucro apurado na exploração da atividade rural, após as deduções permitidas." },
  { id: "i8", label: "Rendimentos isentos e não tributáveis (exceto lucros e dividendos)", value: 0, isSubject: false, description: "Poupança, LCI/LCA, CRI/CRA, FII, doações e heranças, restituição de IR etc. Lucros e dividendos ficam na tabela de fontes pagadoras." },
  { id: "i9", label: "Rendimentos sujeitos à tributação exclusiva/definitiva", value: 0, isSubject: true, description: "Ganhos como 13º salário, prêmios e rendimentos de aplicações financeiras." },
  { id: "i10", label: "Rendimentos tributáveis - imposto com exigibilidade suspensa", value: 0, isSubject: true, description: "Rendimentos cujo imposto está sendo questionado judicialmente." },
  { id: "i11", label: "Depósitos judiciais do imposto", value: 0, isSubject: true, description: "Valores depositados em juízo referentes a impostos em disputa." },
];

export const DEFAULT_TAX_ITEMS: TaxPaymentItem[] = [
  { id: "t1", label: "Imposto retido na fonte do titular", value: 0, description: "Imposto de renda já descontado diretamente nos pagamentos recebidos pelo titular." },
  { id: "t2", label: "Imposto retido na fonte dos dependentes", value: 0, description: "Imposto de renda descontado nos pagamentos recebidos pelos dependentes." },
  { id: "t3", label: "Carnê-Leão do titular", value: 0, description: "Imposto mensal recolhido pelo titular sobre rendimentos de pessoas físicas ou do exterior." },
  { id: "t4", label: "Carnê-Leão dos dependentes", value: 0, description: "Imposto mensal recolhido pelos dependentes sobre seus rendimentos próprios." },
  { id: "t5", label: "Imposto complementar", value: 0, description: "Pagamento opcional de imposto feito durante o ano para antecipar o ajuste anual." },
  { id: "t6", label: "Imposto pago no exterior pelo titular e pelos dependentes", value: 0, description: "Imposto recolhido em outros países que pode ser compensado no Brasil (conforme acordos)." },
  { id: "t7", label: "Imposto retido RRA", value: 0, description: "Imposto retido na fonte sobre rendimentos recebidos acumuladamente." },
  { id: "t8", label: "Imposto pago Lei 11.033/2004", value: 0, description: "Imposto pago sobre rendimentos de ativos financeiros específicos conforme legislação." },
  { id: "t9", label: "Imposto pago sobre Ganhos de Capital", value: 0, description: "Imposto recolhido sobre o lucro na venda de bens ou direitos." },
  { id: "t10", label: "Imposto pago Ganhos de Capital Moeda Estrangeira", value: 0, description: "Imposto sobre o lucro na alienação de moeda estrangeira em espécie." },
  { id: "t11", label: "Imposto pago sobre Renda Variável", value: 0, description: "Imposto recolhido sobre operações em bolsa de valores, mercadorias e futuros." },
  { id: "t14", label: "Imposto sobre rendimentos de tributação exclusiva/definitiva", value: 0, description: "Imposto efetivamente incidente sobre os rendimentos de tributação exclusiva/definitiva. Se não informado, presume-se alíquota de 15% sobre esses rendimentos." },
  { id: "t13", label: "IRPF devido na DAA do mesmo ano", value: 0, description: "Valor do imposto a pagar apurado na Declaração de Ajuste Anual referente ao mesmo exercício." },
];

export const MIN_TAX_THRESHOLD = 600000;
export const MAX_TAX_THRESHOLD = 1200000;
export const MAX_ALIQUOT = 0.10; // 10%

// Art. 16-B redutor: nominal IRPJ + CSLL rate of the paying PJ's sector.
export const PJ_NOMINAL_RATES = [
  { value: 0.34, label: "Demais pessoas jurídicas (34%)" },
  { value: 0.4, label: "Seguradoras, capitalização e demais instituições financeiras – CSLL 15% (40%)" },
  { value: 0.45, label: "Bancos – CSLL 20% (45%)" },
];
export const DEFAULT_PJ_NOMINAL_RATE = 0.34;

// Dividend sources: sources receiving less than this each are grouped into a
// single "Demais fontes" row (no redutor) — keeps listed-company dividends of
// a few reais from cluttering the table.
export const SMALL_SOURCE_THRESHOLD = 500;
// Withholding on 2026+ dividends above R$ 50 mil/month from the same company.
export const DIVIDEND_WITHHOLDING_RATE = 0.1;
// Default allocation: everything as posterior (subject) — the conservative
// hypothesis; protected amounts must be moved explicitly.
export const DEFAULT_ALLOCATION_NOTE =
  "Alocado por padrão como posterior a 2025 (sujeito ao IRPF mínimo). Se houver deliberação até 31/12/2025, informe a parcela protegida.";
export const AGGREGATE_SOURCE_NOTE = `Fontes com menos de R$ ${SMALL_SOURCE_THRESHOLD} cada, agrupadas. Sem cálculo de redutor.`;

// Exclusive/definitive taxation: when the tax actually paid isn't informed,
// a 15% rate is presumed over that income.
export const EXCLUSIVE_INCOME_ID = "i9";
export const EXCLUSIVE_TAX_ID = "t14";
export const PRESUMED_EXCLUSIVE_TAX_RATE = 0.15;
// Tax due in the annual adjustment declaration: informative only, never added
// to the tax paid (it would count the same tax twice).
export const DAA_TAX_ID = "t13";
