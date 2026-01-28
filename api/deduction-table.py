from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
import json
import pandas as pd
import os

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'Pot Keterlambatan.xlsx')

def load_employee_data():
    df = pd.read_excel(EXCEL_PATH, header=None)
    employees = []
    last_valid_unit = ''
    
    for i in range(8, len(df)):
        row = df.iloc[i]
        if pd.isna(row[1]) or row[1] == 'NO':
            continue
        if pd.isna(row[1]) and str(row[2]) == '0':
            continue
        try:
            current_unit = str(row[4]) if pd.notna(row[4]) and str(row[4]) != 'nan' else ''
            if current_unit and current_unit != '0':
                last_valid_unit = current_unit
            elif not current_unit or current_unit == '0' or current_unit == 'nan':
                current_unit = last_valid_unit
            
            employee = {
                'unit': current_unit,
                'jabatan': str(row[5]) if pd.notna(row[5]) else '',
                'pulang_awal_1_10': int(row[6]) if pd.notna(row[6]) and row[6] != 0 else 0,
                'pulang_awal_11_20': int(row[7]) if pd.notna(row[7]) and row[7] != 0 else 0,
                'pulang_awal_21_30': int(row[8]) if pd.notna(row[8]) and row[8] != 0 else 0,
                'pulang_awal_31_40': int(row[9]) if pd.notna(row[9]) and row[9] != 0 else 0,
                'pulang_awal_41_50': int(row[10]) if pd.notna(row[10]) and row[10] != 0 else 0,
                'pulang_awal_51_60': int(row[11]) if pd.notna(row[11]) and row[11] != 0 else 0,
                'pulang_awal_60_plus': int(row[12]) if pd.notna(row[12]) and row[12] != 0 else 0,
                'terlambat_6_10': int(row[13]) if pd.notna(row[13]) and row[13] != 0 else 0,
                'terlambat_11_15': int(row[14]) if pd.notna(row[14]) and row[14] != 0 else 0,
                'terlambat_16_20': int(row[15]) if pd.notna(row[15]) and row[15] != 0 else 0,
                'terlambat_21_25': int(row[16]) if pd.notna(row[16]) and row[16] != 0 else 0,
                'terlambat_26_30': int(row[17]) if pd.notna(row[17]) and row[17] != 0 else 0,
                'terlambat_31_45': int(row[18]) if pd.notna(row[18]) and row[18] != 0 else 0,
                'terlambat_46_60': int(row[19]) if pd.notna(row[19]) and row[19] != 0 else 0,
            }
            if employee['unit'] and employee['unit'] != '0' and employee['jabatan'] and employee['jabatan'] != '0':
                employees.append(employee)
        except:
            continue
    return employees

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        unit = unquote(params.get('unit', [''])[0])
        jabatan = unquote(params.get('jabatan', [''])[0])
        
        try:
            employees = load_employee_data()
            employee = None
            for emp in employees:
                if emp['unit'] == unit and emp['jabatan'] == jabatan:
                    employee = emp
                    break
            
            if not employee:
                response = {'success': False, 'error': f'Not found: {unit} - {jabatan}'}
            else:
                deduction_table = {
                    'pulang_awal': [
                        {'range': '1-10 menit', 'deduction': employee['pulang_awal_1_10']},
                        {'range': '11-20 menit', 'deduction': employee['pulang_awal_11_20']},
                        {'range': '21-30 menit', 'deduction': employee['pulang_awal_21_30']},
                        {'range': '31-40 menit', 'deduction': employee['pulang_awal_31_40']},
                        {'range': '41-50 menit', 'deduction': employee['pulang_awal_41_50']},
                        {'range': '51-60 menit', 'deduction': employee['pulang_awal_51_60']},
                        {'range': '> 60 menit', 'deduction': employee['pulang_awal_60_plus']},
                    ],
                    'terlambat': [
                        {'range': '6-10 menit', 'deduction': employee['terlambat_6_10']},
                        {'range': '11-15 menit', 'deduction': employee['terlambat_11_15']},
                        {'range': '16-20 menit', 'deduction': employee['terlambat_16_20']},
                        {'range': '21-25 menit', 'deduction': employee['terlambat_21_25']},
                        {'range': '26-30 menit', 'deduction': employee['terlambat_26_30']},
                        {'range': '31-45 menit', 'deduction': employee['terlambat_31_45']},
                        {'range': '46-60 menit', 'deduction': employee['terlambat_46_60']},
                    ]
                }
                response = {'success': True, 'data': {'unit': unit, 'jabatan': jabatan, 'deduction_table': deduction_table}}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response).encode())
