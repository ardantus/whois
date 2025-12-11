# 🌐 WhoisIP - Network Information Website

Website Node.js untuk deteksi IP, WHOIS lookup, Ping, Traceroute, DNS lookup, dan network tools lainnya dengan Docker Compose.

## 📋 Fitur

- **🔍 Deteksi IP Saya** - Mendeteksi IP address client
- **🔎 WHOIS Lookup** - Informasi detail tentang IP address
- **📡 Ping** - Cek connectivity ke IP address
- **🛣️ Traceroute** - Trace rute paket ke tujuan
- **🔤 DNS Lookup** - Resolve hostname ke IP address
- **📍 NSLookup** - Reverse lookup IP ke hostname
- **⛏️ DIG** - DNS Information Groper dengan berbagai record type (A, AAAA, MX, NS, TXT, CNAME, SOA)

## 🚀 Quick Start

### Requirements
- Docker & Docker Compose installed

### Run dengan Docker Compose

```bash
# Masuk ke folder project
cd whois

# Build dan run
docker-compose up -d

# Cek status container
docker-compose ps

# Lihat logs
docker-compose logs -f whois-app
```

Website akan berjalan di: **http://localhost:3000**

## 📚 API Endpoints

### 1. Get My IP
```bash
GET /api/myip
```

**Response:**
```json
{
  "success": true,
  "ip": "YOUR.IP.ADDRESS",
  "timestamp": "2024-12-11T10:00:00.000Z"
}
```

### 2. WHOIS Lookup
```bash
POST /api/whois
Content-Type: application/json

{
  "ip": "8.8.8.8"
}
```

### 3. Ping
```bash
POST /api/ping
Content-Type: application/json

{
  "ip": "8.8.8.8",
  "count": 4
}
```

### 4. Traceroute
```bash
POST /api/traceroute
Content-Type: application/json

{
  "ip": "8.8.8.8",
  "maxHops": 30
}
```

### 5. DNS Lookup
```bash
POST /api/dns
Content-Type: application/json

{
  "hostname": "google.com"
}
```

### 6. NSLookup
```bash
POST /api/nslookup
Content-Type: application/json

{
  "query": "8.8.8.8"
}
```

### 7. DIG
```bash
POST /api/dig
Content-Type: application/json

{
  "domain": "google.com",
  "recordType": "A"
}
```

Record types tersedia: A, AAAA, MX, NS, TXT, CNAME, SOA

### 8. API Documentation
```bash
GET /api/docs
```

### 9. Health Check
```bash
GET /health
```

## 📁 Struktur Folder

```
whois/
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Docker image configuration
├── package.json          # Node.js dependencies
├── server.js             # Main server application
└── public/
    └── index.html        # Frontend web interface
```

## 🛠️ Docker Compose Management

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build

# Remove volumes
docker-compose down -v
```

## 🔧 Environment Variables

Anda dapat customize di `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

## 📊 Dependencies

### Runtime
- `express` - Web framework
- `cors` - Cross-origin requests
- `body-parser` - Parse request body
- `axios` - HTTP client
- `whois` - WHOIS lookup
- `ip` - IP utilities

### System Dependencies (di Docker)
- `iputils` - ping command
- `bind-tools` - DNS tools
- `curl` - HTTP tool
- `wget` - Download tool

## 💻 Testing API dengan cURL

```bash
# Get my IP
curl http://localhost:3000/api/myip

# WHOIS lookup
curl -X POST http://localhost:3000/api/whois \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'

# Ping
curl -X POST http://localhost:3000/api/ping \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8","count":4}'

# Traceroute
curl -X POST http://localhost:3000/api/traceroute \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'

# DIG
curl -X POST http://localhost:3000/api/dig \
  -H "Content-Type: application/json" \
  -d '{"domain":"google.com","recordType":"A"}'
```

## ⚠️ Security Notes

- Input validation dilakukan untuk mencegah command injection
- Batasan jumlah packets untuk ping (max 10)
- Batasan jumlah hops untuk traceroute (max 64)
- CORS diaktifkan (adjust sesuai kebutuhan production)

## 🐛 Troubleshooting

### Container tidak bisa start
```bash
# Cek logs
docker-compose logs whois-app

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port 3000 sudah digunakan
Edit `docker-compose.yml` dan ubah port:
```yaml
ports:
  - "8080:3000"  # External:Internal
```

### Traceroute/Ping timeout
Beberapa network policy mungkin block ICMP. Coba test dengan IP yang lebih accessible.

## 📝 Notes

- Website ini berjalan di Alpine Linux untuk image yang lebih ringan
- Semua command dijalankan dalam container dengan safety sanitization
- Logs disimpan di volume `/app/logs` (jika dikonfigurasi)

## 📄 License

MIT

## 👨‍💻 Author

Created for network information and diagnostics purposes.

---

**Happy Network Exploring! 🚀**
