# Free Deployment Instructions

## Option 1: Render.com (100% Free)

1. **Create a Render account** at [render.com](https://render.com)
   - Sign up with GitHub to easily connect your repositories

2. **Deploy the Backend**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: option-chain-backend
     - Root Directory: `backend`
     - Runtime: Node
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: Free

3. **Deploy the Frontend**:
   - Click "New" → "Static Site"
   - Connect the same repository
   - Configure:
     - Name: option-chain-frontend
     - Root Directory: `frontend`
     - Build Command: `npm install && npm run build`
     - Publish Directory: `build`
     - Plan: Free
   - Environment Variables:
     - Add `REACT_APP_API_URL` = your backend URL

4. **Access Your Deployed Application**:
   - Frontend URL: https://your-frontend-name.onrender.com
   - Backend URL: https://your-backend-name.onrender.com

## Option 2: Quick Local Demo with Ngrok

1. **Start the Backend** (already running on port 5000)

2. **Start the Frontend** (in a new terminal):
   ```
   cd frontend
   npm start
   ```

3. **Create Public URL with Ngrok**:
   - Install ngrok if not already installed:
     ```
     npm install -g ngrok
     ```
   
   - Create a tunnel for the backend:
     ```
     ngrok http 5000
     ```
     
   - Create another tunnel for the frontend:
     ```
     ngrok http 3000
     ```

4. **Share the Generated URLs**:
   - Backend URL: The URL from the first ngrok command (ends with .ngrok.io)
   - Frontend URL: The URL from the second ngrok command (ends with .ngrok.io)

## Option 3: GitHub Pages + Backend Service

1. **Deploy Frontend to GitHub Pages**:
   - Update package.json:
     ```
     "homepage": "https://yourusername.github.io/repo-name",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
     ```
   
   - Install GitHub Pages tool:
     ```
     npm install --save-dev gh-pages
     ```
   
   - Deploy:
     ```
     npm run deploy
     ```

2. **Deploy Backend to Railway (Free)**:
   - Visit [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Deploy backend directory
   - Configure environment variables

3. **Connect Both**:
   - Set `REACT_APP_API_URL` to point to your Railway backend
