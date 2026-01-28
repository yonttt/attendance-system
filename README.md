# Attendance Impact System - Salary Deduction Calculator

A web application for calculating employee salary deductions based on lateness or early departure.

## Features
- Calculate deductions for lateness (Terlambat)
- Calculate deductions for early departure (Pulang Awal)
- View deduction tables per unit and position
- Batch calculation for multiple incidents
- Modern dark theme UI with glassmorphism effects

## Project Structure (Vercel-Ready)

```
├── api/                    # Python serverless functions
│   ├── employees.py       # Get all employees
│   ├── units.py           # Get unique units
│   ├── positions.py       # Get positions by unit
│   ├── calculate.py       # Calculate single deduction
│   └── deduction-table.py # Get deduction table
├── data/
│   └── Pot Keterlambatan.xlsx  # Excel data source
├── public/                 # Static frontend files
│   ├── index.html         # Main HTML
│   ├── style.css          # Styling
│   └── app.js             # JavaScript logic
├── vercel.json            # Vercel configuration
├── requirements.txt       # Python dependencies
└── .gitignore
```

## Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)

### Steps

1. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/attendance-impact-system.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect the configuration
   - Click "Deploy"

4. **Done!** Your app will be live at `https://your-project.vercel.app`

## Local Development

To run locally with Flask (original backend):

```bash
# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install flask flask-cors pandas openpyxl

# Run the original Flask app
python app.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees` | GET | Get all employees |
| `/api/units` | GET | Get unique units |
| `/api/positions?unit=X` | GET | Get positions by unit |
| `/api/calculate` | POST | Calculate deduction |
| `/api/deduction-table?unit=X&jabatan=Y` | GET | Get deduction table |

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python (Vercel Serverless Functions)
- **Data**: Excel (pandas, openpyxl)
