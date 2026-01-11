# System Architecture Design Document: Portfolio Management Visualization (v3.1 - Master)

## 1. Executive Summary & Architectural Alignment

This document outlines the architecture for the "Portfolio Visualization" PWA. It is designed to be a **faithful web-native port** of the original Java Desktop Application (`Portfolio Performance`), strictly respecting its Model-View separation.

### 1.1 Architectural Mapping (Java OSGi vs Bun/React)

To ensure **Algorithmic Parity** (producing identical numbers), we mirror the original OSGi structure:

| Original Java Bundle        | Responsibility                                                  | Web Architecture Equivalent                              |
| :-------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------- |
| `name.abuchen.portfolio`    | **Headless Core**: Logic, Math, Data Models. Independent of UI. | `src/domain/*` (Pure TypeScript, No React).              |
| `name.abuchen.portfolio.ui` | **Views**: SWT/JFace Widgets, Charts.                           | `src/components/*` & `src/features/*` (React, Recharts). |
| `client.xml (XStream)`      | **Persistence**: Data serialization.                            | `src/domain/parser/*` (XML -> JSON adaptation).          |

**Implication**: The `src/domain` module must be testable **without** React, ensuring 100% logic isolation.

## 2. Data Layer Specification (The "Truth")

### 2.1 Data Reconciliation Strategy

- **Primary Key**: The `ISIN` (International Securities Identification Number) is the only reliable link between the XML Portfolio Data and the JSON Taxonomy.
- **Join Logic**:
  1.  Load `AllTaxonomies.json`. Flatten into a Map: `Map<ISIN, TaxonomyNode[]>`.
  2.  Load `ysun.portfolio.xml`. For each `<security>`, extract `isin`.
  3.  **Fallback**: If `isin` is missing in XML (rare), use `name` fuzzy match (Levenshtein < 3 distance) but log a warning.
  4.  **Validation**: Reject taxonomy mapping if `isin` is empty.

### 2.2 Numerical Scaling Standards

The XML uses fixed-point arithmetic. **HARD-CODED MAGIC NUMBERS ARE FORBIDDEN.**

- **Configuration**: Create `src/config/scaling.ts`.
  - `export const PRICE_SCALING_FACTOR = new Big(10).pow(8);`
  - `export const AMOUNT_SCALING_FACTOR = new Big(10).pow(2);`
- **Usage**: All math operations must import these constants.

### 2.3 Scalability Constraints (The "50MB Problem")

- **Current Limit**: `fast-xml-parser` loads the full DOM into RAM. For files > 20MB on mobile, this crashes tabs.
- **Mitigation**:
  - **Phase 1**: Enforce file size limit check (< 10MB) and warn user.
  - **Phase 2 (Future)**: Switch to `sax-wasm` for streaming parsing if OOM errors occur in telemetry.

### 2.4 Currency & FX Strategy (Multi-Currency Support)

Thinking like the `Core Domain`:

- **Structure**: The XML links a currency transaction to its base transaction via `<crossEntry>`.
- **Algorithm**:
  - Iterate Transactions.
  - IF `t.currency` != `portfolio.baseCurrency`:
    - Look for `t.crossEntry` (the robust link).
    - IF found: Use the `crossEntry.amount` (which is in Base Currency) for "Total Value" summation.
    - IF missing: Log Warning (Data gap).
  - **Result**: This avoids relying on external exchange rate APIs, ensuring the Web App matches the Desktop App's existing historical conversions exactly.

### 2.5 Total Value Definition

The "Total Value" displayed in the dashboard is the **Net Worth** (NAV).

$$
\text{NAV} = \sum (\text{Security}_{\text{qty}} \times \text{Price}_{\text{latest}}) + \sum \text{CashAccount}_{\text{balance}}
$$

- **Cash Accounts**: Derived from `<accounts>`.
  - `Balance` = Sum(`DEPOSIT`) - Sum(`REMOVAL`) + Sum(`DIVIDEND` in account) - Sum(`FEES` in account) + Sum(`SELL` proceeds) - Sum(`BUY` costs).

## 3. Calculation Engine Algorithms

### 3.1 Historical Price Interpolation

- **Problem**: `<prices>` are sparse (only trading days).
- **Algorithm**: **Forward Fill (Last Observation Carried Forward)**.
  - If `Price(t)` is missing, use `Price(t-1)`.
  - If `t` < `IPO_Date`, Price = Cost Basis (or 0).

### 3.2 Performance Metrics

- **Simple ROI**: $(\text{Current Value} - \text{Net Invested}) / \text{Net Invested}$.
- **Time-Weighted Return (TWR)**:
  - Must be implemented to match the "15.03%" screenshot.
  - Algorithm: Divide period into sub-periods at each **External Cash Flow** (Deposit/Withdrawal).
  - $TWR = (1 + r_1) \times (1 + r_2) \times ... \times (1 + r_n) - 1$.
  - Where $r_n = \frac{MV_{end} - CF}{MV_{start}}$.

## 4. Component Architecture & UI Theme

### 4.1 Theme Token Definition (Derived from Screenshots)

- `--background`: `#1a1a1a` (Dark Grey)
- `--surface`: `#2d2d2d` (Cards)
- `--primary`: `#34d399` (Emerald 400 - for positive numbers)
- `--destructive`: `#f87171` (Red 400 - for negative numbers/drawdown)
- `--chart-1`: `#fa8f8e` (Asset Alloc)
- `--chart-2`: `#869668`
- `--chart-3`: `#897ccc`

**Typography & Micro-interactions**:

- **Font**: **Inter** (Google Fonts). Use `font-feature-settings: "tnum"` (Tabular Numbers) for all financial data to ensure alignment.
- **Loading State**: NO Spinners. Use **Skeleton Screens** (shimmer effect) matching the card layout during XML parsing.
- **Empty State**: If portfolio is empty, display a branded illustration with a clear "Connect Google Drive" CTA.

### 4.2 Web Worker Strategy

- **File**: `src/workers/parser.worker.ts`
- **Responsibility**:
  1.  Receive `ArrayBuffer` from Main Thread via **Transferable Objects** (Zero-Copy).
  2.  Check/Install `fast-xml-parser`.
  3.  Parse XML -> Raw JSON.
  4.  Run `Scaling` & `ISIN Mapping`.
  5.  Return sanitized `PortfolioState`.
- **Main Thread**: Shows `<Skeleton />` while worker runs.
- **Validation**:
  - The Worker MUST use a `zod` schema to validate the _structure_ of the parsed XML before processing.
  - `const XmlSecuritySchema = z.object({ uuid: z.string(), prices: z.array(...) })`.
  - Fail fast if the XML version > 68 or structure changes.

### 4.3 Robustness & Error Handling

- **React Error Boundaries**: Wrap the Dashboard and Parsers.
  - If XML parsing fails (e.g., malformed tag), show a graceful "Data Import Error" UI instead of White Screen of Death (WSOD).
  - Provide a "Reset Data" button to clear corrupted LocalStorage/IndexedDB.
- **Validation Zod Schemas**: Use `zod` to validate the shape of the JSON produced by the Web Worker. Do not trust the worker output blindly.

## 5. Quality Assurance & Test Specification

### 5.1 The "Golden Dataset"

Since the production XML is large (92k lines) and purely in EUR, we define a **Golden Sub-set** for automated testing.

- **Source**: Extract `tests/fixtures/golden.xml`.
- **Contents**:
  - **1 Security**: `ISH NSDAQ 100` (UUID: `76e8...`).
  - **Price History**: 3 days of prices.
    - T1: `19250000000` (192.50)
    - T2: `19244000000` (192.44)
    - T3: `19060000000` (190.60)
  - **2 Transactions**:
    - `BUY` 10 shares @ 192.50 (T1).
    - `SELL` 5 shares @ 190.60 (T3).
- **Expected Result (Calculated)**:
  - **Holdings**: 5 Shares.
  - **Market Value (T3)**: 5 \* 190.60 = **953.00 EUR**.
  - **Cash Balance**: Initial - (10*192.50) + (5*190.60).
- **Pass Criteria**: `PortfolioEngine.calculate(golden_xml)` must match these numbers to the _cent_.

### 5.2 Algorithmic Parity Tests

- **Numerical Precision**: Input `v="19250000000"` MUST parse to `Big(192.50)`. Any floating point drift is a FAIL.
- **Reference Resolution**: Parser must correctly index `<security reference="...">` to IDs.
- **TWR Validation**: The engine MUST output **21.00%** for the standard "10% then 10%" cash flow scenario, distinguishing it from simple ROI.

### 5.3 UI/UX Verification

- **Taxonomy Switcher**: Clicking "Asset Allocation" -> "Region" must update chart slices.
- **Global Filter**: Selecting a specific Portfolio must filter the Total Value calculation.
- **Visuals**: Background `#1a1a1a`, Font `Inter`.

## 6. Implementation Checklist

- [ ] **step_1_scaffold**: Init Bun+Vite+Docker.
- [ ] **step_2_domain**: Implement `types.ts` and `scaling.ts` (1e8 logic).
- [ ] **step_3_worker**: Implement XML Parsing Worker with Zod.
- [ ] **step_4_engine**: Implement `CashBalance` and `Holdings` calculator.
- [ ] **step_5_ui_core**: Setup Tailwind with custom colors.
- [ ] **step_6_dashboard**: Build Widgets one by one.
