from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from alembic.config import Config
from alembic import command

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Import models
from models import User, AdminSettings

# Initialize Flask-Migrate
migrate = Migrate(app, db)

def init_migrations():
    with app.app_context():
        # Create the database tables
        db.create_all()
        
        # Set up Alembic configuration
        config = Config()
        config.set_main_option('script_location', 'migrations')
        config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
        
        try:
            # Initialize migrations directory
            command.init(config, 'migrations')
            print("Initialized migrations directory")
            
            # Create initial migration
            command.revision(config, autogenerate=True, message='Initial migration')
            print("Created initial migration")
            
            # Apply migration
            command.upgrade(config, 'head')
            print("Applied migration")
            
            # Create default admin settings if not exists
            if not AdminSettings.query.first():
                default_settings = AdminSettings()
                db.session.add(default_settings)
                db.session.commit()
                print("Created default admin settings")
                
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == '__main__':
    init_migrations() 