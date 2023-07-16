FROM node:18
ENV DEVELOPMENT production
WORKDIR /app
RUN npm install -g ts-node
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build-css
RUN npm run build-only
EXPOSE 5174
CMD [ "ts-node", "./server.ts" ]