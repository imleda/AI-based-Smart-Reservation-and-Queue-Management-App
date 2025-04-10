from datetime import datetime
from typing import Dict

class NotificationService:
    def __init__(self):
        # In a real implementation, this would be configured with SMTP settings
        self.enabled = True

    def send_reservation_confirmation(self, reservation: Dict):
        """Send confirmation email for new reservation"""
        if not self.enabled:
            return
        
        # Stub: In production, this would send a real email
        print(f"""
        [EMAIL NOTIFICATION]
        To: {reservation.get('email', 'No email provided')}
        Subject: Reservation Confirmation
        
        Dear {reservation['name']},
        
        Your reservation has been confirmed:
        - Service Type: {reservation['service_type']}
        - Party Size: {reservation['party_size']}
        - Estimated Wait Time: {reservation['estimated_wait']} minutes
        
        We'll notify you when it's almost your turn.
        
        Reference ID: {reservation['id']}
        """)

    def send_next_in_line(self, reservation: Dict):
        """Send notification when customer is next in line"""
        if not self.enabled:
            return
        
        print(f"""
        [EMAIL NOTIFICATION]
        To: {reservation.get('email', 'No email provided')}
        Subject: You're Next in Line!
        
        Dear {reservation['name']},
        
        You're next in line! Please make your way to the reception area.
        Your estimated wait time is less than 5 minutes.
        
        Reference ID: {reservation['id']}
        """)

    def send_admin_notification(self, subject: str, message: str):
        """Send notification to admin"""
        if not self.enabled:
            return
        
        print(f"""
        [ADMIN NOTIFICATION]
        Subject: {subject}
        
        {message}
        
        Time: {datetime.now().isoformat()}
        """)

# Initialize notification service
notification_service = NotificationService() 