# Base image
FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Expose the listening port of your app
EXPOSE 3000

# Start the server using the production build
CMD [ "node", "dist/main" ]