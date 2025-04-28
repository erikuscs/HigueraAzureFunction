# Higuera Azure Project Dashboard

This repository contains two main parts:

1. **Next.js Front End**: A React‑based dashboard UI at `/pages/dashboard/index.js` that reads data from `public/data/data.json`.
2. **Azure Functions Back End**: Serverless APIs under `/exportExcel` and `/sendEmail` to export an Excel report or send an executive summary email.

---

## Prerequisites

- Node.js (>=18) and npm
- Azure Functions Core Tools (for local function host)
- Git (for source control)

---

## Folder Structure

```text
/Users/erikherring/HigueraAzureFunction
├─ public/data/data.json      # JSON source for dashboard
├─ pages/dashboard/index.js   # Dashboard page
├─ components/                # React UI components
│  └─ HoursTrackingChart.tsx  # Chart for hours tracking
├─ exportExcel/               # Azure Function to generate Excel
│  └─ index.js
├─ sendEmail/                 # Azure Function to send email
│  └─ index.js
├─ excel-export-test/         # Standalone Excel script (Node)
│  └─ generate-excel.js
├─ infra/                     # Bicep IaC templates
│  └─ main.bicep
├─ README.md                  # This file
└─ package.json               # npm scripts & dependencies
```

---

## Quick Start

### 1. Install dependencies

```bash
cd /Users/erikherring/HigueraAzureFunction
npm install
```

### 2. Run Next.js front end

```bash
npm run dev
```

- Open your browser at `http://localhost:3000/dashboard`
- Edit `public/data/data.json` and refresh to see updated KPIs, charts, and tables.

### 3. Run Azure Functions locally

```bash
cd /Users/erikherring/HigueraAzureFunction
func host start
```

- Functions are available at `http://localhost:7071/api/exportExcel` and `/api/sendEmail`.

### 4. Generate Excel report manually

```bash
npm run generate-excel
```

- Reads `public/data/data.json` and writes `test_excel_export.xlsx` to the project root.

---

## Editing Data

1. Open `/public/data/data.json`
2. Update fields under:
   - `kpis` (budget, spent, remaining)
   - `hoursTracking` (dates, weekly data)
   - `schedule` (task completion)
   - `issues`, `recentUpdates`
3. Save and refresh the dashboard or rerun the Excel script.

---

## Deployment

1. Commit your changes:
   ```bash
git add . && git commit -m "Update dashboard data or code"
```
2. Run your CI/CD pipeline or deploy with Azure Developer CLI:
   ```bash
azd up          # provisions infra & deploys functions + static site
```

---

## Troubleshooting

- **Missing modules in Functions**: Reinstall dependencies and restart the host:
  ```bash
npm install
func host start
```
- **Build errors** in Next.js: Remove unsupported `experimental.appDir` in `next.config.js`.

---

For any questions, contact the engineering team or refer to the internal wiki.
