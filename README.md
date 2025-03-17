# Option Chain WebSocket Application

A real-time option chain visualization application with WebSocket connectivity.

## Features

- Real-time option data visualization
- Realtime Inspector for detailed data inspection
- WebSocket connectivity for instant updates
- Responsive design with dark mode
- Subscription management for specific data streams

## Architecture

The application consists of two main parts:

1. **Backend**: Node.js WebSocket server with Express
2. **Frontend**: React application with Material UI

## Quick Start: Run with Docker

The easiest way to run the application is with Docker and Docker Compose:

```bash
# Clone the repository (if needed)
git clone <your-repo-url>
cd <repo-directory>

# Start the containers
docker-compose up -d

# The application will be available at:
# - Frontend: http://localhost
# - Backend API: http://localhost:5000
```

## Manual Deployment

### Backend

```bash
cd backend
npm install
npm start
```

The backend will run on http://localhost:5000.

### Frontend

```bash
cd frontend
npm install
npm start
```

The development server will run on http://localhost:3000.

## Cloud Deployment Options

### Option 1: Deploying to Render.com

1. Create an account on [Render](https://render.com)
2. Create a new Web Service for the backend:
   - Connect your repository
   - Set build command: `cd backend && npm install`
   - Set start command: `cd backend && npm start`
   - Set environment variable: `PORT=10000` (or any port Render assigns)

3. Create a new Web Service for the frontend:
   - Connect your repository
   - Set build command: `cd frontend && npm install && npm run build`
   - Set start command: `cd frontend && npx serve -s build`
   - Set environment variable: `REACT_APP_API_URL=https://your-backend-url`

### Option 2: Deploying to Railway

1. Create an account on [Railway](https://railway.app)
2. Create a new project
3. Add two services from GitHub:
   - Backend service (set root directory to `backend`)
   - Frontend service (set root directory to `frontend`)
4. Configure environment variables for the frontend:
   - `REACT_APP_API_URL=https://your-backend-url`

## Running in Development Mode

Start the backend:
```bash
cd backend
npm install
npm start
```

Start the frontend (in a new terminal):
```bash
cd frontend
npm install
npm start
```

## Customizing the Application

### Environment Variables

**Backend:**
- `PORT`: Port for the server (default: 5000)

**Frontend:**
- `REACT_APP_API_URL`: URL of the backend API

## Troubleshooting

- If WebSocket connection fails, check that your backend is running and accessible
- For CORS issues, ensure your backend allows connections from your frontend domain
- For deployment issues, verify that environment variables are configured correctly

## License

This project is licensed under the MIT License. 

Copyright (c) 2025 Sharad Chandra Reddy
