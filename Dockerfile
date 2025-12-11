FROM node:18-alpine

WORKDIR /app

# Install system dependencies untuk ping, traceroute, dns tools
RUN apk add --no-cache \
    iputils \
    bind-tools \
    curl \
    wget \
    mtr \
    traceroute \
    nmap \
    whois

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
