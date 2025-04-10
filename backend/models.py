from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User preferences
    email_notifications = db.Column(db.Boolean, default=True)
    sms_notifications = db.Column(db.Boolean, default=False)
    language = db.Column(db.String(10), default='en')
    theme = db.Column(db.String(20), default='light')
    default_service_type = db.Column(db.String(20), default='dine-in')
    default_location = db.Column(db.String(50), default='Main Dining')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'created_at': self.created_at.isoformat(),
            'preferences': {
                'email_notifications': self.email_notifications,
                'sms_notifications': self.sms_notifications,
                'language': self.language,
                'theme': self.theme,
                'default_service_type': self.default_service_type,
                'default_location': self.default_location
            }
        }

class Reservation(db.Model):
    __tablename__ = 'reservations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    party_size = db.Column(db.Integer, nullable=False)
    service_type = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='waiting')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'party_size': self.party_size,
            'service_type': self.service_type,
            'location': self.location,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'wait_time': (self.completed_at - self.created_at).total_seconds() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<Reservation {self.id}: {self.name} - {self.status}>'

class AdminSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    max_queue_size = db.Column(db.Integer, default=50)
    notifications_enabled = db.Column(db.Boolean, default=True)
    auto_cleanup_enabled = db.Column(db.Boolean, default=True)
    cleanup_interval_minutes = db.Column(db.Integer, default=60)
    operating_hours_start = db.Column(db.String(5), default='09:00')
    operating_hours_end = db.Column(db.String(5), default='22:00')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'max_queue_size': self.max_queue_size,
            'notifications_enabled': self.notifications_enabled,
            'auto_cleanup_enabled': self.auto_cleanup_enabled,
            'cleanup_interval_minutes': self.cleanup_interval_minutes,
            'operating_hours': {
                'start': self.operating_hours_start,
                'end': self.operating_hours_end
            },
            'updated_at': self.updated_at.isoformat()
        }

class QueueManager:
    def __init__(self):
        self.queue = []
        self.counter = 0

    def add_to_queue(self, reservation):
        self.counter += 1
        entry = {
            'id': self.counter,
            **reservation,
            'status': 'waiting',
            'created_at': datetime.utcnow()
        }
        self.queue.append(entry)
        return entry

    def remove_from_queue(self, entry_id):
        self.queue = [entry for entry in self.queue if entry['id'] != entry_id]

    def get_queue_position(self, entry_id):
        waiting_entries = [entry for entry in self.queue if entry['status'] == 'waiting']
        for i, entry in enumerate(waiting_entries):
            if entry['id'] == entry_id:
                return i + 1
        return None

    def update_status(self, entry_id, new_status):
        for entry in self.queue:
            if entry['id'] == entry_id:
                entry['status'] = new_status
                return entry
        return None 