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
        
        # Get unit from query params
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        unit = unquote(params.get('unit', [''])[0])
        
        try:
            employees = load_employee_data()
            positions = list(set([emp['jabatan'] for emp in employees if emp['unit'] == unit]))
            positions.sort()
            response = {'success': True, 'data': positions}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response).encode())
