from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import jwt
from functools import wraps
from collections import defaultdict
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from models import db, User, AdminSettings, Reservation, QueueManager
from utils import queue_manager
import json
from io import StringIO
import uuid
import random

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')

# JWT configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Initialize JWT
jwt = JWTManager(app)

# Initialize database
db.init_app(app)

# Configure CORS - Allow all origins during development
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-Session-ID"],
        "expose_headers": ["Content-Type", "X-Session-ID"]
    }
})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Session-ID')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

socketio = SocketIO(app, cors_allowed_origins=["http://localhost:5174"])

# In-memory storage
queue_data = []
queue_counter = 0
users = {
    'admin@example.com': {
        'password': 'admin123',
        'role': 'admin',
        'name': 'Admin User'
    },
    'user@example.com': {
        'password': 'user123',
        'role': 'user',
        'name': 'Regular User'
    }
}

# Service types and their configurations
services = {
    'dine-in': {
        'name': 'Dine-in',
        'max_party_size': 20,
        'average_service_time': 45,  # minutes
        'locations': ['Main Dining', 'Outdoor', 'Private Room']
    },
    'takeout': {
        'name': 'Takeout',
        'max_party_size': 1,
        'average_service_time': 15,
        'locations': ['Takeout Counter']
    },
    'delivery': {
        'name': 'Delivery',
        'max_party_size': 1,
        'average_service_time': 30,
        'locations': ['Delivery Station']
    }
}

# Analytics data
analytics = {
    'daily_stats': defaultdict(lambda: {
        'total_customers': 0,
        'average_wait_time': 0,
        'service_type_distribution': defaultdict(int)
    }),
    'hourly_stats': defaultdict(lambda: defaultdict(int))
}

# Token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            email = data.get('email')
            current_user = users.get(email)
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
            current_user = {**current_user, 'email': email}
        except Exception as e:
            return jsonify({'message': f'Invalid token: {str(e)}'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Admin role verification decorator
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Admin privileges required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# Load and prepare the model
def load_model():
    try:
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        # Train with dummy data
        X = np.array([[1, 2, 0], [2, 3, 1], [3, 4, 2]])
        y = np.array([10, 15, 20])
        model.fit(X, y)
        return model
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None

model = load_model()

def update_analytics(service_type, wait_time):
    now = datetime.now()
    date_key = now.strftime('%Y-%m-%d')
    hour_key = now.hour
    
    # Update daily stats
    analytics['daily_stats'][date_key]['total_customers'] += 1
    analytics['daily_stats'][date_key]['service_type_distribution'][service_type] += 1
    
    # Update hourly stats
    analytics['hourly_stats'][date_key][hour_key] += 1
    
    # Calculate new average wait time
    total_wait_time = analytics['daily_stats'][date_key]['average_wait_time'] * (analytics['daily_stats'][date_key]['total_customers'] - 1)
    total_wait_time += wait_time
    analytics['daily_stats'][date_key]['average_wait_time'] = total_wait_time / analytics['daily_stats'][date_key]['total_customers']

# Store active admin sessions
admin_sessions = {}

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.headers.get('X-Session-ID')
        if not session_id or session_id not in admin_sessions:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({"error": "Password is required"}), 400
        
    if password == 'admin123':  # In production, use proper password hashing
        session_id = str(uuid.uuid4())
        admin_sessions[session_id] = {
            'created_at': datetime.utcnow(),
            'last_active': datetime.utcnow()
        }
        return jsonify({"sessionId": session_id})
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/admin/logout', methods=['POST'])
@require_admin
def admin_logout():
    session_id = request.headers.get('X-Session-ID')
    if session_id in admin_sessions:
        del admin_sessions[session_id]
    return jsonify({"message": "Logged out successfully"})

@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'phone', 'service_type', 'party_size']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Convert party_size to integer
        try:
            party_size = int(data['party_size'])
        except ValueError:
            return jsonify({'error': 'Party size must be a number'}), 400
        
        # Validate party size limits
        max_party_sizes = {
            'dine-in': 20,
            'takeout': 10,
            'delivery': 10
        }
        
        if party_size > max_party_sizes.get(data['service_type'], 20):
            return jsonify({'error': f'Party size exceeds maximum for {data["service_type"]}'}), 400
        
        # Create new reservation
        new_reservation = Reservation(
            name=data['name'],
            phone=data['phone'],
            email=data.get('email', ''),
            party_size=party_size,
            service_type=data['service_type'],
            location=data.get('location', 'Main Dining'),
            status='waiting',
            created_at=datetime.utcnow()
        )
        
        db.session.add(new_reservation)
        db.session.commit()
        
        # Calculate queue position
        queue_position = Reservation.query.filter(
            Reservation.status == 'waiting',
            Reservation.created_at <= new_reservation.created_at
        ).count()
        
        # Emit socket event for real-time updates
        socketio.emit('new_reservation', {
            'id': new_reservation.id,
            'name': new_reservation.name,
            'party_size': new_reservation.party_size,
            'service_type': new_reservation.service_type,
            'status': new_reservation.status,
            'created_at': new_reservation.created_at.isoformat(),
            'queue_position': queue_position
        })
        
        return jsonify({
            'success': True,
            'message': 'Reservation created successfully',
            'reservation': {
                'id': new_reservation.id,
                'queue_position': queue_position
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reservations/<int:reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    """Get reservation details and position in queue"""
    reservation = Reservation.query.get(reservation_id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    # Convert to dictionary and add queue position
    reservation_data = reservation.to_dict()
    
    # Count how many waiting reservations are ahead of this one
    position = Reservation.query.filter(
        Reservation.status == 'waiting',
        Reservation.created_at < reservation.created_at
    ).count() + 1
    
    reservation_data['queue_position'] = position if reservation.status == 'waiting' else None
    
    return jsonify(reservation_data)

@app.route('/api/queue', methods=['GET'])
@require_admin
def get_queue():
    try:
        # Get all reservations, ordered by creation date
        reservations = Reservation.query.order_by(Reservation.created_at.desc()).all()
        
        # Convert to list of dictionaries with additional info
        queue_data = []
        for reservation in reservations:
            res_data = reservation.to_dict()
            # Calculate wait time in minutes
            if reservation.status == 'waiting':
                wait_time = int((datetime.utcnow() - reservation.created_at).total_seconds() / 60)
                res_data['wait_time'] = wait_time
            
            queue_data.append(res_data)
        
        return jsonify(queue_data)
    except Exception as e:
        print(f"Error fetching queue data: {str(e)}")
        return jsonify({'error': 'Failed to fetch queue data'}), 500

@app.route('/api/reservations/<int:reservation_id>/status', methods=['PUT'])
@require_admin
def update_reservation_status(reservation_id):
    """Update reservation status (admin only)"""
    data = request.json
    if 'status' not in data:
        return jsonify({'error': 'Status is required'}), 400
    
    updated = queue_manager.mark_reservation_status(
        reservation_id,
        data['status'],
        data.get('notes')
    )
    
    if updated:
        return jsonify(updated)
    return jsonify({'error': 'Reservation not found'}), 404

@app.route('/api/analytics', methods=['GET'])
@require_admin
def get_analytics():
    try:
        # Get current date
        today = datetime.now().date()
        
        # Calculate total reservations
        total_reservations = Reservation.query.count()
        
        # Calculate average wait time
        waiting_reservations = Reservation.query.filter_by(status='waiting').all()
        if waiting_reservations:
            total_wait_time = sum(
                (datetime.utcnow() - reservation.created_at).total_seconds() / 60
                for reservation in waiting_reservations
            )
            average_wait_time = f"{int(total_wait_time / len(waiting_reservations))} min"
        else:
            average_wait_time = "0 min"
        
        # Calculate peak hours based on actual data
        hour_counts = db.session.query(
            db.func.extract('hour', Reservation.created_at).label('hour'),
            db.func.count(Reservation.id).label('count')
        ).group_by(db.func.extract('hour', Reservation.created_at)).all()
        
        peak_hours = sorted(hour_counts, key=lambda x: x[1], reverse=True)[:2]
        peak_hours = [f"{int(hour):02d}:00" for hour, _ in peak_hours] if peak_hours else ["12:00", "18:00"]
        
        # Calculate current capacity
        total_seated = Reservation.query.filter_by(status='seated').count()
        max_capacity = 50  # This should come from settings
        current_capacity = f"{int((total_seated / max_capacity) * 100)}%"
        
        # Get daily stats for the last 7 days
        daily_stats = []
        for i in range(7):
            date = today - timedelta(days=i)
            count = Reservation.query.filter(
                Reservation.created_at >= datetime.combine(date, datetime.min.time()),
                Reservation.created_at < datetime.combine(date + timedelta(days=1), datetime.min.time())
            ).count()
            daily_stats.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        daily_stats.reverse()
        
        # Get service type distribution
        service_types = db.session.query(
            Reservation.service_type,
            db.func.count(Reservation.id).label('count')
        ).group_by(Reservation.service_type).all()
        
        service_type_distribution = [
            {'name': type_info[0], 'value': type_info[1]}
            for type_info in service_types
        ] if service_types else []
        
        return jsonify({
            'totalReservations': total_reservations,
            'averageWaitTime': average_wait_time,
            'peakHours': peak_hours,
            'currentCapacity': current_capacity,
            'dailyStats': daily_stats,
            'serviceTypeDistribution': service_type_distribution
        })
        
    except Exception as e:
        print(f"Error generating analytics: {str(e)}")
        return jsonify({'error': 'Failed to generate analytics'}), 500

@app.route('/api/export', methods=['GET'])
@require_admin
def export_data():
    """Export reservation data (admin only)"""
    format = request.args.get('format', 'json')
    if format not in ['json', 'csv']:
        return jsonify({'error': 'Invalid format'}), 400
    
    data = queue_manager.export_data(format)
    
    # Create in-memory file
    buffer = StringIO()
    buffer.write(data)
    buffer.seek(0)
    
    filename = f'reservations.{format}'
    return send_file(
        buffer,
        mimetype='application/json' if format == 'json' else 'text/csv',
        as_attachment=True,
        download_name=filename
    )

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if email in users:
        return jsonify({'message': 'Email already registered'}), 400
    
    users[email] = {
        'password': password,
        'role': 'user',
        'name': name
    }
    
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/services', methods=['GET'])
def get_services():
    return jsonify(services)

@app.route('/api/check-in', methods=['POST'])
@token_required
def check_in(current_user):
    global queue_counter
    data = request.json
    
    # Validate service type and location
    service_type = data.get('serviceType')
    location = data.get('location')
    
    if service_type not in services:
        return jsonify({'message': 'Invalid service type'}), 400
    
    if location not in services[service_type]['locations']:
        return jsonify({'message': 'Invalid location for service type'}), 400
    
    # Store in memory
    queue_entry = {
        'id': queue_counter,
        'name': data['name'],
        'party_size': data['partySize'],
        'service_type': service_type,
        'location': location,
        'timestamp': datetime.now().isoformat(),
        'status': 'waiting',
        'user_email': current_user['email'],
        'notifications': True
    }
    
    queue_data.append(queue_entry)
    queue_counter += 1
    
    # Predict wait time
    current_queue_length = len([entry for entry in queue_data if entry['status'] == 'waiting'])
    service_type_encoded = {'dine-in': 0, 'takeout': 1, 'delivery': 2}[service_type]
    
    prediction_input = np.array([[current_queue_length, data['partySize'], service_type_encoded]])
    predicted_wait_time = model.predict(prediction_input)[0]
    
    # Update analytics
    update_analytics(service_type, predicted_wait_time)
    
    # Emit update through WebSocket
    socketio.emit('queue_update', {
        'queueLength': current_queue_length,
        'estimatedWaitTime': float(predicted_wait_time),
        'newEntry': queue_entry
    })
    
    return jsonify({
        'message': 'Successfully joined queue',
        'estimatedWaitTime': float(predicted_wait_time),
        'queuePosition': current_queue_length,
        'entryId': queue_counter - 1
    })

@app.route('/api/queue-status', methods=['GET'])
@token_required
def queue_status(current_user):
    current_queue_length = len([entry for entry in queue_data if entry['status'] == 'waiting'])
    return jsonify({
        'queueLength': current_queue_length,
        'estimatedWaitTime': float(model.predict([[current_queue_length, 2, 0]])[0])
    })

@app.route('/api/admin/queue', methods=['GET'])
@token_required
@admin_required
def admin_queue(current_user):
    return jsonify({
        'queue': queue_data,
        'total_entries': len(queue_data),
        'waiting_entries': len([entry for entry in queue_data if entry['status'] == 'waiting'])
    })

@app.route('/api/admin/queue/<int:entry_id>', methods=['PUT'])
@token_required
@admin_required
def update_queue_entry(current_user, entry_id):
    data = request.json
    for entry in queue_data:
        if entry['id'] == entry_id:
            old_status = entry['status']
            entry['status'] = data.get('status', entry['status'])
            
            # Emit notification if status changed
            if old_status != entry['status'] and entry['notifications']:
                socketio.emit('status_update', {
                    'entryId': entry_id,
                    'newStatus': entry['status']
                })
            
            return jsonify({'message': 'Queue entry updated successfully'})
    return jsonify({'message': 'Queue entry not found'}), 404

@app.route('/api/admin/queue/<int:entry_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_queue_entry(current_user, entry_id):
    global queue_data
    for entry in queue_data:
        if entry['id'] == entry_id:
            queue_data.remove(entry)
            socketio.emit('queue_update', {
                'removedEntry': entry_id
            })
            return jsonify({'message': 'Queue entry deleted successfully'})
    return jsonify({'message': 'Queue entry not found'}), 404

@app.route('/api/admin/settings', methods=['GET'])
@require_admin
def get_admin_settings():
    return jsonify({
        "queueEnabled": True,
        "maxQueueSize": 50,
        "notificationsEnabled": True,
        "operatingHours": {
            "start": "09:00",
            "end": "22:00"
        }
    })

@app.route('/api/admin/settings', methods=['PUT'])
@jwt_required()
def update_admin_settings():
    current_user = get_jwt_identity()
    user = User.query.filter_by(email=current_user).first()
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
        
    data = request.get_json()
    
    # Here you would typically update the settings in your database
    # For now, we'll just return success
    return jsonify({'message': 'Settings updated successfully'})

@app.route('/api/user/settings', methods=['GET'])
@jwt_required()
def get_user_settings():
    current_user = get_jwt_identity()
    user = User.query.filter_by(email=current_user).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    settings = {
        'notifications': True,
        'emailNotifications': user.email_notifications,
        'smsNotifications': user.sms_notifications,
        'language': user.language or 'en',
        'theme': user.theme or 'light',
        'defaultServiceType': user.default_service_type or 'dine-in',
        'defaultLocation': user.default_location or 'Main Dining'
    }
    
    return jsonify(settings)

@app.route('/api/user/settings', methods=['PUT'])
@jwt_required()
def update_user_settings():
    current_user = get_jwt_identity()
    user = User.query.filter_by(email=current_user).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json()
    
    # Update user settings
    if 'emailNotifications' in data:
        user.email_notifications = data['emailNotifications']
    if 'smsNotifications' in data:
        user.sms_notifications = data['smsNotifications']
    if 'language' in data:
        user.language = data['language']
    if 'theme' in data:
        user.theme = data['theme']
    if 'defaultServiceType' in data:
        user.default_service_type = data['defaultServiceType']
    if 'defaultLocation' in data:
        user.default_location = data['defaultLocation']
        
    db.session.commit()
    
    return jsonify({'message': 'Settings updated successfully'})

def init_test_data():
    """Initialize test data in the database"""
    try:
        # Create test reservations
        test_reservations = [
            {
                'name': 'John Doe',
                'phone': '123-456-7890',
                'email': 'john@example.com',
                'party_size': 4,
                'service_type': 'dine-in',
                'location': 'Main Dining',
                'status': 'waiting',
                'created_at': datetime.utcnow() - timedelta(minutes=30)
            },
            {
                'name': 'Jane Smith',
                'phone': '123-456-7891',
                'email': 'jane@example.com',
                'party_size': 2,
                'service_type': 'takeout',
                'location': 'Takeout Counter',
                'status': 'seated',
                'created_at': datetime.utcnow() - timedelta(minutes=45)
            },
            {
                'name': 'Bob Wilson',
                'phone': '123-456-7892',
                'email': 'bob@example.com',
                'party_size': 6,
                'service_type': 'dine-in',
                'location': 'Outdoor',
                'status': 'waiting',
                'created_at': datetime.utcnow() - timedelta(minutes=15)
            }
        ]

        # Add test reservations to database
        for reservation_data in test_reservations:
            reservation = Reservation(**reservation_data)
            db.session.add(reservation)
        
        db.session.commit()
        print("Test data initialized successfully")
    except Exception as e:
        print(f"Error initializing test data: {str(e)}")
        db.session.rollback()

@app.route('/api/analytics/wait-times', methods=['GET'])
@require_admin
def get_wait_time_trends():
    try:
        # Get wait times for each hour of the day
        wait_times = db.session.query(
            db.func.extract('hour', Reservation.created_at).label('hour'),
            db.func.avg(
                db.func.extract('epoch', Reservation.completed_at - Reservation.created_at) / 60
            ).label('average_wait'),
            db.func.max(
                db.func.extract('epoch', Reservation.completed_at - Reservation.created_at) / 60
            ).label('max_wait')
        ).filter(
            Reservation.status == 'completed',
            Reservation.completed_at.isnot(None)
        ).group_by(
            db.func.extract('hour', Reservation.created_at)
        ).order_by(
            db.func.extract('hour', Reservation.created_at)
        ).all()

        # Format the data
        trends_data = [
            {
                'hour': int(hour),
                'average_wait': round(float(avg_wait or 0), 2),
                'max_wait': round(float(max_wait or 0), 2)
            }
            for hour, avg_wait, max_wait in wait_times
        ]

        # Fill in missing hours with zeros
        all_hours = set(range(24))
        existing_hours = {data['hour'] for data in trends_data}
        missing_hours = all_hours - existing_hours

        for hour in missing_hours:
            trends_data.append({
                'hour': hour,
                'average_wait': 0,
                'max_wait': 0
            })

        # Sort by hour
        trends_data.sort(key=lambda x: x['hour'])

        return jsonify(trends_data)
    except Exception as e:
        print(f"Error generating wait time trends: {str(e)}")
        return jsonify({'error': 'Failed to generate wait time trends'}), 500

@app.route('/api/queue/status', methods=['GET'])
def get_queue_status():
    try:
        # Get currently being served reservations
        current_reservations = Reservation.query.filter(
            Reservation.status == 'seated'
        ).order_by(Reservation.created_at.desc()).limit(5).all()

        # Get next in line reservations with priority calculation
        next_reservations = Reservation.query.filter(
            Reservation.status == 'waiting'
        ).order_by(Reservation.created_at.asc()).all()

        # Calculate priority scores for each waiting reservation
        for reservation in next_reservations:
            # Base priority on wait time
            wait_time = (datetime.utcnow() - reservation.created_at).total_seconds() / 60
            priority_score = wait_time * 0.5  # Base score from wait time

            # Adjust priority based on party size (larger parties get higher priority)
            if reservation.party_size > 4:
                priority_score += 10
            elif reservation.party_size > 2:
                priority_score += 5

            # Adjust priority based on service type
            if reservation.service_type == 'dine-in':
                priority_score += 5
            elif reservation.service_type == 'delivery':
                priority_score += 3

            # Add random factor to prevent exact ties
            priority_score += random.uniform(0, 1)
            
            reservation.priority_score = priority_score

        # Sort by priority score
        next_reservations.sort(key=lambda x: x.priority_score, reverse=True)
        next_reservations = next_reservations[:5]  # Take top 5

        # Calculate smart wait time predictions
        waiting_reservations = Reservation.query.filter(
            Reservation.status == 'waiting'
        ).all()
        
        if waiting_reservations:
            # Calculate historical average service time
            completed_reservations = Reservation.query.filter(
                Reservation.status == 'completed',
                Reservation.completed_at.isnot(None)
            ).all()
            
            if completed_reservations:
                total_service_time = sum(
                    (res.completed_at - res.created_at).total_seconds() / 60
                    for res in completed_reservations
                )
                avg_service_time = total_service_time / len(completed_reservations)
            else:
                avg_service_time = 15  # Default average service time in minutes

            # Calculate current wait time predictions
            predictions = []
            for i, reservation in enumerate(waiting_reservations):
                # Base prediction on position in queue and average service time
                base_wait = (i + 1) * avg_service_time
                
                # Adjust based on party size
                if reservation.party_size > 4:
                    base_wait *= 1.2
                elif reservation.party_size > 2:
                    base_wait *= 1.1
                
                # Adjust based on service type
                if reservation.service_type == 'dine-in':
                    base_wait *= 1.1
                elif reservation.service_type == 'delivery':
                    base_wait *= 0.9
                
                # Add random variation
                base_wait *= random.uniform(0.9, 1.1)
                
                predictions.append({
                    'reservation_id': reservation.id,
                    'estimated_wait': round(base_wait, 1)
                })

            total_wait_time = sum(pred['estimated_wait'] for pred in predictions)
            average_wait_time = total_wait_time / len(predictions)
        else:
            predictions = []
            average_wait_time = 0

        return jsonify({
            'current': [res.to_dict() for res in current_reservations],
            'next': [res.to_dict() for res in next_reservations],
            'estimated_wait_time': round(average_wait_time, 1),
            'total_waiting': len(waiting_reservations),
            'predictions': predictions,
            'last_updated': datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Error getting queue status: {str(e)}")
        return jsonify({'error': 'Failed to get queue status'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables
        # Only initialize test data if there are no reservations
        if Reservation.query.count() == 0:
            init_test_data()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True) 