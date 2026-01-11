# Portfolio Web App - v3.1 Delivery Walkthrough

## 1. Quick Start

Run the application in **Docker** (recommended):

```bash
cd web-app
docker-compose up --build
```

> Open http://localhost:5173

## 2. Verification & Testing

The project includes a robust suite of tests (Algorithmic Parity).
Run them inside Docker:

```bash
cd web-app
docker-compose run --rm app bun test
```

**Expected Output**:

- **XML Parser**: Verified (1e8 scaling, Zod validation).
- **Holdings**: Verified (10 Buy - 5 Sell = 5).
- **Valuation**: Verified (Forward Fill pricing).
- **Performance (TWR)**: Verified (**21.00%** benchmark).
- **Taxonomy Engine**: Verified (Recursive parsing & UI Switcher logic).

## 3. Architecture Highlights

- **Headless Engine**: `src/domain/engine` contains pure TS logic, mathematically identical to Java core.
- **Web Worker**: `src/workers/parser.worker.ts` handles XML parsing off-thread.
- **Zero-Copy UI**: `usePortfolioStore` (Zustand) bridges the Worker and React.
- **Data Safety**: Strict `Big.js` arithmetic and `Zod` schema validation.
- **Pixel Perfect**: Tailwind CSS configured with `Inter` (tnum) and specific color tokens (`#1a1a1a`, `#34d399`).

## 4. Usage

1.  **Load Data**: Use the designated `ysun.portfolio.xml` or any exported XML.
2.  **Dashboard**: View Total Value, TWR, Asset Allocation, and History.
3.  **Loading**: Observe Skeleton loaders during parsing.
