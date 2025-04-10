# AI-Powered Smart Reservation and Queue Management App

A modern, full-stack restaurant management system that leverages AI to optimize queue management and enhance customer experience. This application provides real-time queue tracking, smart wait time predictions, and comprehensive analytics for restaurant administrators.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

##  Key Features

### Customer Features
- **Smart Reservation System**
  - Easy-to-use reservation interface
  - Real-time queue position tracking
  - Automated wait time estimates
  - Multi-service type support (Dine-in, Takeout, Delivery)
  - Email and SMS notifications
  - Queue position updates
  - Multi-language support
  - Custom preferences settings

### Admin Features
- **Comprehensive Dashboard**
  - Real-time queue management
  - Reservation status updates
  - Customer analytics
  - Wait time trends
  - Service type distribution
  - Peak hours analysis
  - Export functionality (JSON/CSV)
  - Staff performance metrics

### Technical Features
- **AI-Powered Predictions**
  - Smart wait time estimation
  - Peak hour predictions
  - Resource optimization suggestions
  - Customer behavior analytics
- **Real-time Updates**
  - WebSocket integration
  - Live queue updates
  - Instant status notifications
- **Security**
  - JWT authentication
  - Session management
  - Role-based access control
  - Secure API endpoints

##  Technology Stack

### Backend
- **Framework**: Flask (Python 3.8+)
- **Database**: SQLAlchemy
- **Real-time Communication**: Flask-SocketIO
- **Authentication**: Flask-JWT-Extended
- **Key Libraries**:
  - `pandas` - Data analysis
  - `scikit-learn` - ML predictions
  - `numpy` - Numerical computations
  - `pytest` - Testing

### Frontend
- **Framework**: React 18+
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context
- **Key Libraries**:
  - `socket.io-client` - Real-time updates
  - `react-router-dom` - Routing
  - `axios` - API calls
  - `@mui/x-data-grid` - Data tables
  - `recharts` - Analytics charts

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 14.0 or higher
- npm or yarn
- Git

##  Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/imleda/AI-Powered-Smart-Reservation-and-Queue-Management-App.git
cd AI-Powered-Smart-Reservation-and-Queue-Management-App
```

2. Create and activate virtual environment:
```bash
python -m venv venv
# On Windows:
venv\\Scripts\\activate
# On Unix or MacOS:
source venv/bin/activate
```

3. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration:
# DATABASE_URL=sqlite:///queue.db
# SECRET_KEY=your-secret-key
# SMTP_SERVER=your-smtp-server
# SMTP_PORT=587
# SMTP_USERNAME=your-email
# SMTP_PASSWORD=your-password
```

5. Initialize the database:
```bash
flask db upgrade
```

6. Run the backend server:
```bash
flask run
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration:
# VITE_API_URL=http://localhost:5000
# VITE_SOCKET_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

##  Security Configuration

1. Change default admin password in production
2. Configure CORS settings in backend/app.py
3. Set up proper SSL certificates
4. Configure rate limiting
5. Enable security headers

##  Database Schema

### User Table
- id (Primary Key)
- email (Unique)
- password_hash
- role
- created_at
- settings (JSON)
  - email_notifications
  - sms_notifications
  - language
  - theme
  - default_service_type
  - default_location

### Reservation Table
- id (Primary Key)
- user_id (Foreign Key)
- name
- phone
- email
- party_size
- service_type
- status
- created_at
- estimated_wait_time
- actual_wait_time
- notes

##  API Documentation

### Public Endpoints
- POST /api/reservations - Create reservation
- GET /api/reservations/:id - Get reservation status
- GET /api/queue/status - Get current queue status

### Protected Endpoints
- GET /api/admin/queue - Get full queue
- PUT /api/admin/reservations/:id - Update reservation
- GET /api/admin/analytics - Get analytics
- POST /api/admin/export - Export data

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

##  Performance Optimization

- Implemented database indexing
- API response caching
- Frontend bundle optimization
- Image optimization
- Lazy loading components

##  Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Authors

- **imleda** - *Initial work*

##  Acknowledgments

- Material-UI team for the excellent UI components
- Flask team for the robust backend framework
- All contributors who have helped shape this project

##  Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

##  Roadmap

- [ ] Mobile application development
- [ ] Integration with popular POS systems
- [ ] AI-powered table optimization
- [ ] Customer loyalty program
- [ ] Advanced analytics dashboard
- [ ] Multi-location support
- [ ] Kitchen display system integration
- [ ] Staff scheduling optimization 
