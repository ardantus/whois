# 🌐 WhoisIP - Network Information Website

Website Node.js untuk deteksi IP, WHOIS lookup, Ping, Traceroute, DNS lookup, dan network tools lainnya dengan Docker Compose.

## 📋 Fitur

- **🔍 Deteksi IP Saya** - Mendeteksi IP address client (public/local)
- **🔎 WHOIS Lookup** - Informasi detail IP/domain dengan ASN & geo
- **🛰️ BGP Tools** - Upstream ASN, holder, IRR validation, reverse DNS sample
- **🧮 IP Calculator** - IPv4/IPv6 subnet calculator (compressed/expanded/binary)
- **✂️ Subnet Splitter** - Bagi subnet IPv4/IPv6 ke prefix lebih kecil
- **📧 Email Tools** - SPF, DMARC, DKIM, MX, TXT checks
- **📡 Ping & 🛣️ Traceroute** - Cek konektivitas dan rute
- **🔤 DNS / 📍 NSLookup / ⛏️ DIG** - Lookup DNS lengkap (A, AAAA, MX, NS, TXT, CNAME, SOA)

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

## 📚 API Endpoints (ringkas)

1) **GET /api/myip** – Deteksi IP client (public/local)

2) **POST /api/whois**
```json
{ "ip": "8.8.8.8" }
```
Menerima IP atau domain. Untuk IP menampilkan geo + ASN.

3) **POST /api/bgp-tools**
```json
{ "query": "AS15169" }
```
Menerima IP atau ASN; hasil upstream, holder, IRR sample, reverse DNS sample.

4) **POST /api/ip-calculator** (IPv4/IPv6)
```json
{ "address": "2001:df6:3dc0::/48", "netmask": "" }
```
`netmask` opsional untuk IPv4 jika tidak memakai CIDR.

5) **POST /api/ip-split** (IPv4/IPv6 subnet splitter)
```json
{ "address": "2001:df6:3dc0::/48", "newPrefix": "64" }
```

6) **POST /api/email-check** (SPF/DMARC/DKIM/MX/TXT)
```json
{ "domain": "example.com" }
```

7) **POST /api/ping**
```json
{ "ip": "8.8.8.8", "count": 4 }
```

8) **POST /api/traceroute**
```json
{ "ip": "8.8.8.8", "maxHops": 30 }
```

9) **POST /api/dns**
```json
{ "hostname": "google.com" }
```

10) **POST /api/nslookup**
```json
{ "query": "8.8.8.8" }
```

11) **POST /api/dig**
```json
{ "domain": "google.com", "recordType": "A" }
```
Record type: A, AAAA, MX, NS, TXT, CNAME, SOA.

12) **GET /api/docs** – Ringkasan endpoint

13) **GET /health** – Health check

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

### Local Development (localhost:3000)

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

### Production (whois.ardan.ovh)

#### Direct URL Access (Browser)
```
https://whois.ardan.ovh/api/myip
https://whois.ardan.ovh
```

#### cURL Examples

```bash
# Get my IP
curl https://whois.ardan.ovh/api/myip

# WHOIS lookup
curl -X POST https://whois.ardan.ovh/api/whois \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'

# WHOIS lookup with domain
curl -X POST https://whois.ardan.ovh/api/whois \
  -H "Content-Type: application/json" \
  -d '{"ip":"google.com"}'

# Ping
curl -X POST https://whois.ardan.ovh/api/ping \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8","count":4}'

# Traceroute
curl -X POST https://whois.ardan.ovh/api/traceroute \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8","maxHops":30}'

# DNS Lookup
curl -X POST https://whois.ardan.ovh/api/dns \
  -H "Content-Type: application/json" \
  -d '{"hostname":"google.com"}'

# DIG query
curl -X POST https://whois.ardan.ovh/api/dig \
  -H "Content-Type: application/json" \
  -d '{"domain":"google.com","recordType":"A"}'

# BGP Tools
curl -X POST https://whois.ardan.ovh/api/bgp-tools \
  -H "Content-Type: application/json" \
  -d '{"query":"AS15169"}'

# IP Calculator
curl -X POST https://whois.ardan.ovh/api/ip-calculator \
  -H "Content-Type: application/json" \
  -d '{"address":"192.168.0.0/24","netmask":""}'

# Subnet Splitter
curl -X POST https://whois.ardan.ovh/api/ip-split \
  -H "Content-Type: application/json" \
  -d '{"address":"192.168.0.0/24","newPrefix":"25"}'

# Email Records Check
curl -X POST https://whois.ardan.ovh/api/email-check \
  -H "Content-Type: application/json" \
  -d '{"domain":"google.com"}'
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
