# Option Chain WebSocket Application

## Project Overview
This application provides real-time option chain data visualization with WebSocket connectivity. It allows users to monitor option prices and subscribe to specific data streams.

## Key Features
- Real-time option data updates via WebSocket
- Dark mode UI with responsive design
- Subscription management for specific option tokens
- Detailed data inspection with the Realtime Inspector
- Connect/disconnect controls for WebSocket connections

## Technologies Used
- **Frontend**: React, Material UI, WebSocket Workers
- **Backend**: Node.js, Express, WebSocket

## Live Demo
To create a live demo link, deploy using one of these options:

### Quick Deployment Options
1. **Render.com** (Free tier available)
   - Visit: https://render.com
   - Deploy the backend as a Web Service
   - Deploy the frontend as a Static Site
   - Connect them using environment variables

2. **Railway.app** (Free tier available)
   - Visit: https://railway.app
   - Create a new project
   - Deploy both services from your GitHub repository

3. **Netlify + Heroku**
   - Deploy frontend to Netlify: https://netlify.com
   - Deploy backend to Heroku: https://heroku.com

## Running Locally
1. Start the backend:
   ```
   cd backend
   npm install
   npm start
   ```

2. Start the frontend:
   ```
   cd frontend
   npm install
   npm start
   ```

3. Access the application at: http://localhost:3000

## Docker Deployment
For the simplest deployment, use Docker:
```
docker-compose up -d
```

Access at: http://localhost

## Project Structure
- `/frontend` - React application
- `/backend` - Node.js WebSocket server
- `/docker-compose.yml` - Container orchestration
- `/README.md` - Detailed documentation

## Screenshots
(Add screenshots after deployment)

## Created By
[Your Name] - [Date]
