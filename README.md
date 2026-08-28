# LabScan 🖥️📊

**LabScan** is a web-based Decision Support System (DSS) designed for university computer labs and institutions to evaluate hardware lifecycles. It utilizes a **Weighted Multi-Criteria Decision Model (MCDM)** to assess computer hardware and classify devices into **KEEP**, **MONITOR**, or **REPLACE** recommendations.

---

## 🌟 Key Features

* 📱 **Single Device Evaluation**: Evaluate individual workstations interactively. Features auto-calculated device age based on purchase year, performance risk sliders, repair tracking, and maintenance/energy cost analysis.
* 📁 **Batch File Processing**: Drag-and-drop or upload `.xlsx`, `.csv`, or `.json` spreadsheets containing entire lab inventories. Processes hundreds of devices instantly client-side.
* 🎯 **Weighted Multi-Criteria Scoring**: Combines 5 core risk metrics into a single Composite Risk Score (0–100).
* 🔍 **Interactive Filtering & Search**: Filter batch assessment results by verdict (`ALL`, `KEEP`, `MONITOR`, `REPLACE`) or search by Device ID, Lab Name, and Model.
* 📥 **Export Functionality**: Export complete batch evaluation results to downloadable CSV reports.
* 💾 **Local Storage & History**: Client-side authentication and session history persisted securely in browser `localStorage`.

---

## 📐 Decision Scoring Model & Methodology

The application calculates a **Composite Risk Score (0–100)** across five key criteria:

| Evaluation Criterion | Weight | Sub-score Formula | Cap / Upper Boundary |
| :--- | :---: | :--- | :--- |
| **Device Age** | **20%** | $\text{ageRisk} = \min\left(100, \frac{\text{Age}}{10} \times 100\right)$ | Risk maxes out at 10+ years |
| **Performance Score** | **30%** | $\text{perfRisk} = 100 - \text{Performance Score (0-100)}$ | Risk increases as performance score decreases |
| **Repair Frequency** | **10%** | $\text{repairsRisk} = \min\left(100, \frac{\text{Repairs}}{6} \times 100\right)$ | Risk maxes out at 6+ repairs/year |
| **Maintenance Cost Ratio** | **25%** | $\text{costRisk} = \min\left(100, \frac{\text{Annual Maintenance Cost}}{\text{Replacement Price} \times 0.05} \times 100\right)$ | Reaches 100% risk when maintenance hits 5% of replacement price |
| **Energy Inefficiency** | **15%** | $\text{energyRisk} = \min\left(100, \frac{\text{Annual Energy Cost}}{12000} \times 100\right)$ | Risk maxes out at ৳12,000/year |

---

### 🚦 Verdict Threshold Ranges

$$\text{Composite Risk Score} = (0.20 \times \text{ageRisk}) + (0.30 \times \text{perfRisk}) + (0.10 \times \text{repairsRisk}) + (0.25 \times \text{costRisk}) + (0.15 \times \text{energyRisk})$$

* 🟢 **`KEEP`** ($\text{Score} < 42$): Low overall risk. Hardware is healthy, efficient, and economical to retain.
* 🟡 **`MONITOR`** ($42 \le \text{Score} \le 65$): Moderate risk. Hardware shows signs of aging or performance decline; keep under observation.
* 🔴 **`REPLACE`** ($\text{Score} > 65$): High risk. Workstation suffers from severe age, poor performance, high repair counts, or excessive maintenance costs; priority for replacement.

---

## 📂 Project Structure

```
LabScan/
├── index.html        # HTML UI structure & component layouts
├── script.js         # Core DSS algorithm, SheetJS file parsing, & UI event handlers
├── styles.css        # Modern dark-theme glassmorphism styling & animations
├── README.md         # Documentation & user guide
├── .gitignore        # Git ignore rules for temporary files
└── Data/             # Sample lab inventory datasets (Lab 1–10 & Expired Years)
    ├── Lab-1/ ... Lab-10/
    └── Device_Inventory_Evaluation_Expired_Years.xlsx
```

---

## 🚀 Quick Start Guide

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/aseerhamimmahi/LabScan.git
   ```
2. **Open in Browser**:
   * Open [`index.html`](file:///d:/CSE407/Final%20Project/index.html) directly in any modern browser (Chrome, Firefox, Edge, Safari). No web server setup or npm installation required.
3. **Usage**:
   * **Single Device Mode**: Select *Single Device Scan*, enter purchase year (Device Age calculates automatically), fill in performance and cost data, and click **Run Scan**.
   * **Batch Assessment Mode**: Select *Multiple Devices Assessment*, drag & drop any spreadsheet from `Data/` (e.g., `Device_Inventory_Evaluation_Expired_Years.xlsx`), and review the batch summary tables.

---

## 🛠️ Built With

* **HTML5 & CSS3** (Vanilla CSS variables, custom grid system, dark theme aesthetic)
* **JavaScript (ES6+)** (Vanilla client-side execution)
* **SheetJS (xlsx.full.min.js)** (Spreadsheet parsing for `.xlsx`, `.csv`, `.xls`)

---

## 📝 License

Developed for **CSE407 Final Project**. Free for academic and institutional use.
