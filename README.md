# Calculadora de IRPF Mínimo — GSGA-PR

Calculadora de tributação mínima de IRPF baseada na Lei nº 15.270/2025 para altas rendas. Aplicativo 100% front-end (React + Vite + TypeScript + Tailwind), sem backend e sem dependência de nenhuma API externa. Acompanha um gerador de planilha Excel (`tools/planilha_irpfm.py`) com as mesmas regras.

## Rodar localmente

**Pré-requisitos:** Node.js (LTS)

1. Instalar dependências:
   `npm install`
2. Rodar em modo desenvolvimento:
   `npm run dev`
3. Build de produção:
   `npm run build` (gera a pasta `dist/`)

## Estrutura

```
src/
  components/
    Calculator.tsx              # orquestrador: estado e cálculo da apuração
    DetailedView.tsx            # aba "Apuração Detalhada"
    IncomeTable.tsx             # rendimentos (exceto lucros e dividendos)
    TaxTable.tsx                # impostos pagos/retidos
    DividendSourcesTable.tsx    # lucros e dividendos por fonte pagadora + redutor Art. 16-B
    ResultsSummary.tsx          # card lateral de resultado
    Simulator.tsx               # aba "Simulador por Faixas de Renda"
    ImportDeclarationDialog.tsx # modal de importação de PDF da DIRPF
    shared/                     # CurrencyInput, Tooltip, QuickIncrementButtons, SimSliderField
  utils/
    dividends.ts      # regra dos dividendos: alocação, agrupamento, redutor e retenção por fonte
    format.ts         # formatCurrency / formatPercent / parseCurrencyBR
    pdfReport.ts      # relatório em PDF (jsPDF)
    pdfText.ts        # extração de texto de PDF no navegador (pdf.js)
    dirpfParser.ts    # mapeia o texto extraído para campos e fontes pagadoras
  types.ts
  constants.ts
tools/
  planilha_irpfm.py   # gerador da planilha de simulação (mesmas regras)
```

## Regras de cálculo

- **Base sujeita** = rendimentos tributáveis + tributação exclusiva/definitiva + parcela **posterior a 2025** dos lucros e dividendos. Os demais isentos ficam fora da base.
- **Lucros e dividendos por fonte pagadora** (uma linha por CNPJ): cada fonte separa a parcela **deliberada até 31/12/2025** (protegida, fora da base) da **posterior** (sujeita a base, retenção e redutor). **Alocação padrão: tudo como posterior** (hipótese conservadora), com ressalva na linha; a parcela protegida é informada fonte a fonte e o cálculo se ajusta.
- **Demais fontes:** fontes que pagaram menos de **R$ 500** cada são agrupadas numa única linha, sem redutor (`SMALL_SOURCE_THRESHOLD`).
- **Redutor do Art. 16-B, fonte a fonte:** parcela posterior × máx(0; alíquota efetiva da PJ + alíquota do IRPF mínimo − alíquota nominal da PJ: 34%, 40% ou 45%). Vale também para empresas do Simples Nacional. Fonte sem dados da PJ não gera redutor (com aviso). A soma fica limitada ao saldo devido e não gera restituição.
- **Retenção de 10%** sobre a parcela posterior: opcional por fonte (Sim/Não), **padrão Não**. É a única parcela restituível.
- **Tributação exclusiva:** imposto informado na DIRPF (ex.: Lei 14.754/2023) é usado como está; na falta de informação, presume-se 15%.
- **Crédito:** antecipações + imposto sobre tributação exclusiva + retenção sobre dividendos. Não se usa o "imposto devido na DAA", para evitar dupla contagem.

## Importação de declaração (PDF)

O botão "Importar Declaração IRPF" lê o PDF inteiramente no navegador (`pdf.js`, sem enviar o arquivo a lugar nenhum), reconstrói o texto em ordem de leitura por posição (x/y) — o gerador da Receita desenha rótulos e valores como blocos separados — e reconhece os campos por regex, com tela de conferência antes de aplicar.

- Campos do Resumo: rendimentos tributáveis (PJ, PF/exterior, acumulados, atividade rural) e impostos pagos (IRRF, carnê-leão, complementar, exterior, RRA, Lei 11.033).
- Fichas: total de isentos (exceto lucros e dividendos) e de tributação exclusiva; imposto da Lei 14.754/2023 quando houver.
- **Fontes pagadoras:** cada linha dos itens 09 (lucros e dividendos) e 13 (Simples Nacional) da ficha de isentos vira uma fonte, somando por CNPJ e juntando nomes quebrados em duas linhas. A soma das fontes é conferida com o total impresso do item; se houver diferença, ela entra como linha "Fonte não identificada".
- PDFs sem camada de texto (escaneados ou com texto vetorizado) são detectados e o usuário é avisado para preencher manualmente.

**Calibração:** validado contra 13 declarações reais do exercício 2026 (AC 2025), nos modelos de deduções legais e desconto simplificado. Em todas, os campos extraídos fecharam com os totais impressos (rendimentos tributáveis, imposto pago, TOTAL de cada ficha e total de cada item de dividendos versus a soma das fontes).

Para recalibrar com outro ano/versão do programa da Receita: rode `npm run dev`, importe o PDF, inspecione o texto reconstruído (`console.log(fullText)` temporário em `parseDirpf`) e ajuste os padrões em `src/utils/dirpfParser.ts`.

## Planilha de simulação

```bash
python tools/planilha_irpfm.py dados.json saida.xlsx
```

Gera uma aba por contribuinte: premissas (amarelo), dados da declaração, tabela de fontes pagadoras (alocação, dados da PJ, redutor e retenção por fonte, com conferências), e o cálculo com memória de cada linha. Tudo em fórmulas: alterar a alocação ou os dados da PJ recalcula a aba. Requer `openpyxl`.

`dados.json` é uma lista de contribuintes:

```json
[{
  "sheet": "Nome da aba", "name": "Nome completo",
  "header": "Modelo, imposto devido etc.", "source": "Origem dos dados",
  "trib": {"i1": 100000.00},
  "exempt": [["12. Poupança, LCI, LCA", 1000.00, "Ficha Isentos – item 12", "Observação"]],
  "exclusive": [["06. Aplicações financeiras", 5000.00, "Ficha Exclusiva – item 06", "Observação", false]],
  "prepaid": {"t1": 20000.00},
  "foreign_tax": 0,
  "dividend_sources": [{"name": "EMPRESA X", "cnpj": "00.000.000/0001-00", "total": 500000.00,
                        "protected": 0, "pj_profit": 0, "pj_tax": 0, "nominal": 0.34, "withholding": 0, "simples": false}],
  "declared_dividend_total": 500000.00,
  "extra_subject": {"label": "Rendimento adicional sujeito", "value": 0, "note": "Premissa"}
}]
```

O 5º elemento de `exclusive` marca o item cujo imposto foi informado (`foreign_tax`, ex.: Lei 14.754). `extra_subject` é opcional. **Não salve arquivos de dados de clientes dentro deste repositório.**
