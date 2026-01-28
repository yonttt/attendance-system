from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime

# MongoDB connection
try:
    from pymongo import MongoClient
    from bson import ObjectId
    
    MONGO_URI = os.environ.get('MONGODB_URI', '')
    
    if MONGO_URI:
        client = MongoClient(MONGO_URI)
        db = client['attendance_system']
        attendance_collection = db['attendance_records']
        MONGO_AVAILABLE = True
    else:
        MONGO_AVAILABLE = False
except ImportError:
    MONGO_AVAILABLE = False

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Get attendance records"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if not MONGO_AVAILABLE:
            response = {'success': False, 'error': 'MongoDB not configured'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            # Parse query parameters
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            # Build filter
            filter_query = {}
            if 'unit' in params:
                filter_query['unit'] = params['unit'][0]
            if 'jabatan' in params:
                filter_query['jabatan'] = params['jabatan'][0]
            if 'name' in params and params['name'][0]:
                filter_query['name'] = {'$regex': params['name'][0], '$options': 'i'}
            
            # Get records sorted by date descending
            records = list(attendance_collection.find(filter_query).sort('date', -1))
            
            # Convert ObjectId to string
            for record in records:
                record['_id'] = str(record['_id'])
            
            response = {'success': True, 'data': records}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response, default=json_serial).encode())
    
    def do_POST(self):
        """Create new attendance record"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if not MONGO_AVAILABLE:
            response = {'success': False, 'error': 'MongoDB not configured'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Check if record already exists for same date, name, unit, jabatan
            existing = attendance_collection.find_one({
                'date': data['date'],
                'name': data['name'],
                'unit': data['unit'],
                'jabatan': data['jabatan']
            })
            
            if existing:
                # Update existing record
                attendance_collection.update_one(
                    {'_id': existing['_id']},
                    {'$set': data}
                )
                response = {'success': True, 'message': 'Record updated', 'id': str(existing['_id'])}
            else:
                # Insert new record
                data['created_at'] = datetime.utcnow()
                result = attendance_collection.insert_one(data)
                response = {'success': True, 'message': 'Record created', 'id': str(result.inserted_id)}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_PUT(self):
        """Update attendance record"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if not MONGO_AVAILABLE:
            response = {'success': False, 'error': 'MongoDB not configured'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            record_id = data.pop('_id', None)
            if not record_id:
                response = {'success': False, 'error': 'Record ID required'}
            else:
                data['updated_at'] = datetime.utcnow()
                result = attendance_collection.update_one(
                    {'_id': ObjectId(record_id)},
                    {'$set': data}
                )
                if result.modified_count > 0:
                    response = {'success': True, 'message': 'Record updated'}
                else:
                    response = {'success': False, 'error': 'Record not found'}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_DELETE(self):
        """Delete attendance record"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if not MONGO_AVAILABLE:
            response = {'success': False, 'error': 'MongoDB not configured'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            record_id = data.get('_id')
            if not record_id:
                response = {'success': False, 'error': 'Record ID required'}
            else:
                result = attendance_collection.delete_one({'_id': ObjectId(record_id)})
                if result.deleted_count > 0:
                    response = {'success': True, 'message': 'Record deleted'}
                else:
                    response = {'success': False, 'error': 'Record not found'}
        except Exception as e:
            response = {'success': False, 'error': str(e)}
        
        self.wfile.write(json.dumps(response).encode())
