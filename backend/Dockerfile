FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Expose the port that the app will run on
EXPOSE 5000

# Define the command to run the app
CMD ["npm", "start"]
