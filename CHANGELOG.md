# Changelog

All notable changes to WhoisIP project will be documented in this file.

## [1.4.1] - 2025-12-12

### Fixed
- **IP Detection Bug** - Fixed `/api/myip` endpoint detecting server IP instead of client IP
  - Removed external API call (`ipify.org`) that incorrectly returned server's public IP
  - Implemented proper client IP detection from request headers
  - Now correctly reads `x-forwarded-for` header for proxied connections
  - Fallback to `socket.remoteAddress` for direct connections
  - Proper handling of IPv6-mapped IPv4 addresses (removes `::ffff:` prefix)
  - Removes port numbers from returned IP addresses
- Updated frontend IP type label from "Public/Local IP" to "Client IP"

### Technical
- Implemented `getClientIP()` helper function in `/api/myip` endpoint
- Better header parsing for production environments (proxies, load balancers)
- More robust IPv6 to IPv4 conversion logic

## [1.4.0] - 2025-12-11

### Added
- **🧮 Full IPv6 Calculator** - Complete IPv6 subnet calculation support
  - IPv6 address expansion (handles :: shorthand notation)
  - Binary representation of IPv6 addresses (128-bit)
  - Network address calculation from prefix length
  - First and last address range detection
  - Total address count display (2^n format)
  - Support for full IPv6 CIDR notation parsing
- **🔀 Subnet Splitter** - New network splitting functionality
  - Split IPv4 subnets into smaller subnets with CIDR math
  - Split IPv6 prefixes into smaller address ranges
  - Displays subnet details: network, broadcast, hostMin, hostMax
  - Shows available hosts per subnet
  - Supports up to 100 subnets display (with total count)
  - Works with both full and compressed IPv6 notation
- **📑 Tabbed Interface** - IP Calculator page enhancement
  - Calculate tab - Original IPv4/IPv6 calculation
  - Split Subnet tab - New network splitting tool
  - Smooth tab switching with visual indicators

### Changed
- IP Calculator page restructured with tab-based navigation
- IPv6 calculation now displays compressed, expanded, and binary forms
- Enhanced user interface with CSS tab styling

### Fixed
- IPv6 calculator now displays complete information (previously showed simplified message)
- Duplicate calculateIP() function removed from frontend
- IPv6 network calculation accuracy improved

### Technical
- Added `expandIPv6()` function for :: shorthand expansion
- Added `ipv6ToBinary()` for hexadecimal to binary conversion
- Added `getIPv6Network()` for network address calculation
- Added `getIPv6Range()` for determining address range
- Added `/api/ip-split` endpoint for subnet splitting
- Implemented IPv4 subnet splitting with CIDR mathematics
- Implemented IPv6 subnet splitting with binary prefix manipulation
- Added `formatIPv6Result()` and `formatSplitResult()` display functions
- Added `switchTab()` function for tab management

## [1.3.0] - 2025-12-11

### Added
- **🛰️ BGP Tools** - New comprehensive BGP analysis tool
  - Search by IP address or ASN (e.g., AS15169)
  - Display AS upstream neighbors with power metrics
  - Show AS holder/organization information
  - IRR database validation via RADB whois queries
  - Reverse DNS sampling from prefix IP range
  - BGP connectivity visualization through neighbor data
  - Prefix overview with CIDR notation
- **🏷️ ASN Display** - ASN information now shown in multiple places
  - Home page IP details section displays ASN
  - WHOIS lookup results include ASN for IP addresses
  - ASN formatted with "AS" prefix (e.g., AS15169)

### Changed
- Navigation menu reorganized to include BGP Tools button
- Home page tools grid updated with BGP Tools card
- RIPE Stat API integration for BGP data retrieval

### Technical
- Added `fetchRipe()` helper function for RIPE Stat API calls
- Implemented `reverseDnsList()` for batch reverse DNS lookups
- Added CIDR IP sampling utilities (`ipToInt`, `intToIp`, `sampleIpsFromCidr`)
- BGP endpoint handles both IP and ASN query formats
- ASN neighbor classification (left/right/uncertain types)

## [1.2.0] - 2025-12-11

### Added
- **📧 Email Tools** - New email security validation tool
  - SPF (Sender Policy Framework) record detection
  - DMARC (Domain-based Message Authentication) validation
  - DKIM (DomainKeys Identified Mail) checker with 9 common selectors
  - MX (Mail Exchange) records display
  - TXT records enumeration
  - Formatted output with emoji status indicators (✅/❌)

### Fixed
- Email check endpoint placement - moved after middleware initialization
- Request body parsing issue resolved

## [1.1.0] - 2025-12-10

### Added
- **📍 Detailed IP Information** on home page
  - Country, region, city display
  - Latitude and longitude coordinates
  - ISP/Organization information
  - Mobile/Proxy/VPN detection
  - Google Maps integration with location marker
- **🔍 Enhanced WHOIS** - Support for both IP addresses and domain names
  - IP lookups via ipwho.is API
  - Domain lookups via system whois command
  - Automatic input type detection

### Changed
- Home page redesigned with detailed IP geolocation section
- WHOIS page accepts both IP and domain input
- IP detection now uses external API (api.ipify.org) for accurate public IP

## [1.0.0] - 2025-12-09

### Added
- **🏠 Home Page** with automatic IP detection
- **🔍 WHOIS Lookup** for IP address information
- **📡 Ping** tool with configurable packet count (1-10)
- **🛣️ Traceroute** using mtr with fallback mechanisms
- **🔤 DNS Lookup** for hostname resolution
- **📍 NSLookup** for reverse IP lookups
- **⛏️ DIG** tool with multiple record types:
  - A (IPv4)
  - AAAA (IPv6)
  - MX (Mail)
  - NS (Nameserver)
  - TXT
  - CNAME
  - SOA
- Multi-page navigation system with responsive design
- Docker Compose setup with Alpine Linux base
- Network capabilities (NET_RAW, NET_ADMIN) for ICMP support
- Modern gradient UI with purple theme
- Loading spinners and error handling
- Mobile-responsive layout

### Technical
- Express.js backend on Node.js 18 Alpine
- System tools: iputils, bind-tools, curl, wget, mtr, traceroute, nmap, whois
- CORS and body-parser middleware
- Input sanitization for shell commands
- IP validation helpers
- Timeout handling for network commands

### Security
- Input sanitization to prevent command injection
- IP address validation (IPv4/IPv6)
- Timeout limits on all external calls
- Safe shell command execution with promisified exec

## [0.1.0] - Initial Setup

### Added
- Basic project structure
- Docker and Docker Compose configuration
- Express.js server skeleton
- Public directory for static files
