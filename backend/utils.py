import json
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from models import QueueManager

class QueueManager:
    def __init__(self, data_file='data/queue_data.json'):
        self.data_file = data_file
        self.reservations = []
        self.service_history = []
        self.wait_time_model = RandomForestRegressor()
        self.load_data()

    def load_data(self):
        try:
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                self.reservations = data.get('reservations', [])
                self.service_history = data.get('service_history', [])
        except FileNotFoundError:
            self.save_data()  # Create initial empty file

    def save_data(self):
        data = {
            'reservations': self.reservations,
            'service_history': self.service_history
        }
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)

    def add_reservation(self, reservation: Dict) -> Dict:
        """Add a new reservation to the queue"""
        reservation['id'] = len(self.reservations) + 1
        reservation['status'] = 'waiting'
        reservation['created_at'] = datetime.now().isoformat()
        reservation['estimated_wait'] = self.estimate_wait_time(reservation)
        
        self.reservations.append(reservation)
        self.save_data()
        return reservation

    def get_queue_position(self, reservation_id: int) -> Optional[int]:
        """Get position in queue for a reservation"""
        waiting = [r for r in self.reservations if r['status'] == 'waiting']
        for i, res in enumerate(waiting):
            if res['id'] == reservation_id:
                return i + 1
        return None

    def estimate_wait_time(self, reservation: Dict) -> int:
        """Estimate wait time in minutes using ML model"""
        if len(self.service_history) < 5:
            # Default estimation if not enough historical data
            return len([r for r in self.reservations if r['status'] == 'waiting']) * 15

        # Prepare features for prediction
        recent_history = pd.DataFrame(self.service_history[-50:])
        if len(recent_history) > 0:
            X = recent_history[['party_size', 'service_type_encoded', 'hour_of_day']]
            y = recent_history['actual_wait_time']
            
            self.wait_time_model.fit(X, y)
            
            # Prepare current reservation features
            current_features = np.array([[
                reservation['party_size'],
                hash(reservation['service_type']) % 5,  # Simple encoding
                datetime.now().hour
            ]])
            
            predicted_wait = max(5, int(self.wait_time_model.predict(current_features)[0]))
            return predicted_wait
        
        return 15  # Default wait time

    def mark_reservation_status(self, reservation_id: int, status: str, notes: str = None) -> Optional[Dict]:
        """Update reservation status and add to service history if completed"""
        for res in self.reservations:
            if res['id'] == reservation_id:
                res['status'] = status
                if notes:
                    res['notes'] = notes
                
                if status in ['served', 'no-show']:
                    # Add to service history for ML training
                    history_entry = {
                        'reservation_id': res['id'],
                        'party_size': res['party_size'],
                        'service_type': res['service_type'],
                        'service_type_encoded': hash(res['service_type']) % 5,
                        'hour_of_day': datetime.now().hour,
                        'actual_wait_time': (datetime.now() - datetime.fromisoformat(res['created_at'])).seconds // 60,
                        'status': status
                    }
                    self.service_history.append(history_entry)
                
                self.save_data()
                return res
        return None

    def get_analytics(self) -> Dict:
        """Calculate analytics for dashboard"""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Filter today's reservations
        today_reservations = [
            r for r in self.reservations 
            if datetime.fromisoformat(r['created_at']) >= today_start
        ]
        
        # Calculate statistics
        served_times = [
            h['actual_wait_time'] for h in self.service_history 
            if h['status'] == 'served'
        ]
        
        analytics = {
            'daily_count': len(today_reservations),
            'avg_wait_time': int(np.mean(served_times)) if served_times else 0,
            'peak_hours': self._calculate_peak_hours(),
            'service_type_distribution': self._calculate_service_distribution()
        }
        
        return analytics

    def _calculate_peak_hours(self) -> List[int]:
        """Calculate peak hours based on historical data"""
        hour_counts = [0] * 24
        for res in self.reservations:
            hour = datetime.fromisoformat(res['created_at']).hour
            hour_counts[hour] += 1
        
        # Return top 3 busiest hours
        peak_hours = sorted(range(24), key=lambda x: hour_counts[x], reverse=True)[:3]
        return peak_hours

    def _calculate_service_distribution(self) -> Dict[str, int]:
        """Calculate distribution of service types"""
        distribution = {}
        for res in self.reservations:
            service_type = res['service_type']
            distribution[service_type] = distribution.get(service_type, 0) + 1
        return distribution

    def export_data(self, format: str = 'json') -> str:
        """Export reservation data in specified format"""
        if format == 'json':
            return json.dumps({
                'reservations': self.reservations,
                'service_history': self.service_history
            }, indent=2)
        elif format == 'csv':
            df = pd.DataFrame(self.reservations)
            return df.to_csv(index=False)
        else:
            raise ValueError(f"Unsupported format: {format}")

# Initialize the queue manager
queue_manager = QueueManager() 