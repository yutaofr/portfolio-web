# Development Plan: Portfolio Visualization App (Execution Phase)

## 0. Engineering Standards

- **Strict Typing**: No `any`. Use `zod` schemas for external data.
- **Math**: All currency math via `big.js`. `src/config/scaling.ts` is the Source of Truth.
- **Testing**:
  - **Unit**: `bun test` for `src/domain` logic (Headless).
  - **Integration**: `golden.xml` must pass exact TWR/Holding checks.
- **Style**: `eslint` + `prettier` (Standard React). Data attributes `data-testid` on all interactable elements.

## Phase 1: Foundation & Scaffolding

**Goal**: A running "Hello World" app in Docker with all infra ready.

- [x] **1.1. Scaffolding**
  - **Context**: Root directory.
  - **Action**: `bun create vite` (React+TS). Install `tailwindcss`, `shadcn/ui`, `lucide-react`, `recharts`, `zod`, `big.js`, `fast-xml-parser`.
  - **Verification**: `bun run dev` shows Vite default page.
- [x] **1.2. Dockerization**
  - **Context**: `Dockerfile`, `docker-compose.yml`.
  - **Action**: Create multi-stage build (Dev vs Prod). Map port 5173.
  - **Verification**: `docker-compose up` serves the app. User can access `localhost:5173`.
- [x] **1.3. Configuration & Types**
  - **Context**: `src/config/scaling.ts`, `src/domain/types.ts`.
  - **Action**: Define `PRICE_SCALING_FACTOR (1e8)` and core interfaces (`Security`, `Transaction`).
  - **Verification**: `import { PRICE_SCALING_FACTOR }` works in a test file.

## Phase 2: The Core "Headless" Engine (Domain Layer)

**Goal**: Parse specific XML/JSON and produce correct mathematical results. **NO UI WORK HERE.**

- [x] **2.1. XML Parser & Zod Schema**
  - **Context**: `src/domain/parser/schema.ts`, `src/domain/parser/xmlParser.ts`.
  - **Action**: Implement `XmlSecuritySchema`. Parse `golden.xml` fixture.
  - **Verification**: `bun test` confirms `19250000000` -> `Big(192.50)`.
- [x] **2.2. Transaction Replay Engine**
  - **Context**: `src/domain/engine/holdings.ts`.
  - **Action**: Implement `calculateHoldings(transactions, date)`. Handle BUY/SELL logic.
  - **Verification**: **Golden Dataset Test**: 10 Buy - 5 Sell = 5 Holdings.
- [x] **2.3. Cash & NAV Engine**
  - **Context**: `src/domain/engine/valuation.ts`.
  - **Action**: Sum `DEPOSIT/REMOVAL` vs `BUY/SELL` cost basis.
  - **Verification**: `calculateNAV()` returns correct Equity + Cash sum.
- [x] **2.4. Performance (TWR) Engine**
  - **Context**: `src/domain/engine/performance.ts`.
  - **Action**: Implement TWR algorithm (Time-weighting across cash flows).
  - **Verification**: **Golden Dataset Test**: Must output **21.00%**.

## Phase 3: The Application Core (State & Worker)

**Goal**: Connect the Engine to the React App via Web Worker.

- [x] **3.1. Web Worker Setup**
  - **Context**: `src/workers/parser.worker.ts`.
  - **Action**: Move XML logic to worker. Use `Comlink` or raw `postMessage` with Transferable ArrayBuffer.
  - **Verification**: UI thread does not freeze when parsing 4MB file.
- [x] **3.2. Global Store (Zustand)**
  - **Context**: `src/store/usePortfolioStore.ts`.
  - **Action**: Create `status` (IDLE/LOADING/READY/ERROR) and `data` (PortfolioState).
  - **Verification**: React DevTools shows store update after Worker completes.

## Phase 4: UI Construction (Pixel Perfect)

**Goal**: Visuals matching the Screenshots.

- [x] **4.1. Design System & Theme**
  - **Context**: `tailwind.config.js`, `src/index.css`.
  - **Action**: Define colors `#1a1a1a`, `#2d2d2d`, `#34d399`. Set font `Inter`.
  - **Verification**: A dummy card with `bg-surface text-primary` matches screenshot hex.
- [x] **4.2. App Shell**
  - **Context**: `src/App.tsx`, `src/components/layout/TopBar.tsx`.
  - **Action**: Mobile layout, "Freshness Badge", "Global Filter" dropdown.
- [x] **4.3. Dashboard Widgets**
  - **Context**: `src/features/dashboard/*`.
  - **Action**:
    - `KPIWidget`: Total Value, TWR.
    - `AllocationWidget`: Recharts Pie with **Taxonomy Switcher**.
    - `HistoryWidget`: Recharts Area.
  - **Verification**: Visual regression vs Screenshot.

## Phase 5: Polish & Robustness

- [x] **5.1. UX Polish**
  - **Context**: `src/components/ui/Skeleton.tsx`.
  - **Action**: Add Shimmer during loading. Use `tnum` font features.
- [x] **5.2. Error Boundaries**
  - **Context**: `src/components/ErrorBoundary.tsx`.
  - **Action**: Catch Zod validation errors and show "Reset Data" button.
