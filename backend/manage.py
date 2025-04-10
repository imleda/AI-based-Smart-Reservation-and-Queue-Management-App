from flask import Flask
import os
from dotenv import load_dotenv
from models import db, User, AdminSettings

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy with this app
db.init_app(app)

if __name__ == '__main__':
    with app.app_context():
        # Create the database tables
        db.create_all()
        print("Created database tables")
        
        # Create default admin settings if not exists
        if not AdminSettings.query.first():
            default_settings = AdminSettings()
            db.session.add(default_settings)
            db.session.commit()
            print("Created default admin settings")
        
        print("Database setup completed successfully") 