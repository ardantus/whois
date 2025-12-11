const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');

const execPromise = util.promisify(exec);
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 8. EMAIL TOOLS - Check SPF, DMARC, DKIM, MX records
app.post('/api/email-check', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const sanitizedDomain = sanitizeInput(domain);
    const records = {
      spf: { found: false, record: '', error: '' },
      dmarc: { found: false, record: '', error: '' },
      dkim: [],
      mx: { found: false, records: '', error: '' },
      txt: { found: false, records: '', error: '' }
    };

    // Check SPF (TXT record with v=spf1)
    try {
      const { stdout } = await execPromise(`dig +short TXT ${sanitizedDomain}`, { timeout: 5000 });
      const txtRecords = stdout.split('\n').filter(line => line.trim());
      const spfRecord = txtRecords.find(record => record.includes('v=spf1'));
      if (spfRecord) {
        records.spf.found = true;
        records.spf.record = spfRecord.replace(/"/g, '');
      } else {
        records.spf.error = 'No SPF record found in TXT records';
      }
    } catch (error) {
      records.spf.error = 'Failed to query SPF record';
    }

    // Check DMARC (TXT record at _dmarc.domain)
    try {
      const { stdout } = await execPromise(`dig +short TXT _dmarc.${sanitizedDomain}`, { timeout: 5000 });
      if (stdout && stdout.trim()) {
        records.dmarc.found = true;
        records.dmarc.record = stdout.replace(/"/g, '').trim();
      } else {
        records.dmarc.error = 'No DMARC record found at _dmarc subdomain';
      }
    } catch (error) {
      records.dmarc.error = 'Failed to query DMARC record';
    }

    // Check DKIM (common selectors)
    const dkimSelectors = ['default', 'google', 'selector1', 'selector2', 'dkim', 'k1', 's1', 's2', 'mail'];
    for (const selector of dkimSelectors) {
      try {
        const { stdout } = await execPromise(`dig +short TXT ${selector}._domainkey.${sanitizedDomain}`, { timeout: 3000 });
        if (stdout && stdout.trim()) {
          records.dkim.push({
            selector: selector,
            found: true,
            record: stdout.replace(/"/g, '').trim()
          });
        } else {
          records.dkim.push({
            selector: selector,
            found: false
          });
        }
      } catch (error) {
        records.dkim.push({
          selector: selector,
          found: false,
          error: 'Query failed'
        });
      }
    }

    // Check MX Records
    try {
      const { stdout } = await execPromise(`dig +short MX ${sanitizedDomain}`, { timeout: 5000 });
      if (stdout && stdout.trim()) {
        records.mx.found = true;
        records.mx.records = stdout.trim();
      } else {
        records.mx.error = 'No MX records found';
      }
    } catch (error) {
      records.mx.error = 'Failed to query MX records';
    }

    // Check all TXT Records
    try {
      const { stdout } = await execPromise(`dig +short TXT ${sanitizedDomain}`, { timeout: 5000 });
      if (stdout && stdout.trim()) {
        records.txt.found = true;
        records.txt.records = stdout.trim();
      } else {
        records.txt.error = 'No TXT records found';
      }
    } catch (error) {
      records.txt.error = 'Failed to query TXT records';
    }

    res.json({
      success: true,
      domain: sanitizedDomain,
      records: records,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function untuk validasi IP
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Helper function untuk sanitasi input
function sanitizeInput(input) {
  return input.replace(/[;&|`$()\\]/g, '');
}

// 1. GET MY IP - Deteksi IP client/public
app.get('/api/myip', async (req, res) => {
  try {
    // Coba dapatkan public IP dari external API
    try {
      const response = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
      const publicIP = response.data.ip;
      
      res.json({
        success: true,
        ip: publicIP,
        type: 'public',
        timestamp: new Date().toISOString()
      });
      return;
    } catch (apiError) {
      // Fallback ke local IP jika API fail
      console.log('Public IP API failed, using local IP:', apiError.message);
    }

    // Fallback: deteksi local IP
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
    
    const cleanIP = clientIP.includes(':') ? clientIP.split(':').pop() : clientIP;
    
    res.json({
      success: true,
      ip: cleanIP,
      type: 'local',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. WHOIS Lookup (supports both IP and Domain)
app.post('/api/whois', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address or domain is required'
      });
    }

    const sanitizedInput = sanitizeInput(ip);
    const isIP = isValidIP(sanitizedInput);

    if (isIP) {
      // Use IP geolocation API for IP addresses
      try {
        const response = await axios.get(`https://ipwho.is/${sanitizedInput}`, { timeout: 5000 });
        const whoisData = response.data;

        res.json({
          success: true,
          ip: sanitizedInput,
          type: 'ip',
          whois: {
            ip: whoisData.ip,
            country: whoisData.country,
            country_code: whoisData.country_code,
            region: whoisData.region,
            city: whoisData.city,
            latitude: whoisData.latitude,
            longitude: whoisData.longitude,
            asn: whoisData.connection?.asn || null,
            org: whoisData.connection?.org || whoisData.connection?.isp || 'Unknown',
            isp: whoisData.connection?.isp || 'Unknown',
            type: whoisData.type,
            is_mobile: whoisData.connection?.is_mobile || false,
            is_proxy: whoisData.is_proxy || false,
            is_vpn: whoisData.is_vpn || false
          },
          timestamp: new Date().toISOString()
        });
      } catch (apiError) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch IP WHOIS data: ' + apiError.message
        });
      }
    } else {
      // Use whois command for domains
      try {
        const { stdout } = await execPromise(`whois ${sanitizedInput}`, { timeout: 10000 });
        
        res.json({
          success: true,
          domain: sanitizedInput,
          type: 'domain',
          output: stdout,
          timestamp: new Date().toISOString()
        });
      } catch (whoisError) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch domain WHOIS data: ' + whoisError.message,
          output: whoisError.stdout || ''
        });
      }
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. BGP TOOLS
app.post('/api/bgp-tools', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query IP or ASN is required' });
    }

    const trimmed = String(query).trim();
    const isAsn = /^AS?\d+$/i.test(trimmed);
    const isIp = isValidIP(trimmed);

    // Helper to fetch RIPE Stat JSON
    async function fetchRipe(endpoint, resource) {
      const url = `https://stat.ripe.net/data/${endpoint}/data.json?resource=${encodeURIComponent(resource)}`;
      const resp = await axios.get(url, { timeout: 8000 });
      if (resp.data?.status !== 'ok') throw new Error(`RIPE Stat ${endpoint} failed`);
      return resp.data.data;
    }

    // Helper: reverse DNS for a small set of IPs
    async function reverseDnsList(ips) {
      const results = [];
      for (const ip of ips) {
        try {
          const { stdout } = await execPromise(`dig +short -x ${sanitizeInput(ip)}`, { timeout: 4000 });
          results.push({ ip, hostname: stdout.trim() || 'N/A' });
        } catch (err) {
          results.push({ ip, hostname: 'lookup failed' });
        }
      }
      return results;
    }

    function ipToInt(ip) {
      return ip.split('.').map(Number).reduce((acc, oct) => (acc << 8n) + BigInt(oct), 0n);
    }

    function intToIp(intVal) {
      return [24n, 16n, 8n, 0n].map(shift => Number((intVal >> shift) & 255n)).join('.');
    }

    function sampleIpsFromCidr(cidr, limit = 5) {
      if (!cidr || !cidr.includes('/')) return [];
      const [base, maskStr] = cidr.split('/');
      const mask = Number(maskStr);
      if (!Number.isInteger(mask) || mask < 0 || mask > 32) return [];
      try {
        const baseInt = ipToInt(base);
        const size = 1n << BigInt(32 - mask);
        const count = Number(size < BigInt(limit) ? size : BigInt(limit));
        const ips = [];
        for (let i = 0; i < count; i++) {
          ips.push(intToIp(baseInt + BigInt(i)));
        }
        return ips;
      } catch (e) {
        return [];
      }
    }

    let result = {
      query: trimmed,
      type: isAsn ? 'asn' : 'ip',
      prefix: null,
      asn: null,
      holder: null,
      upstreams: [],
      neighbours_sample: [],
      irr: null,
      reverse_dns: [],
      whois: null
    };

    if (isIp) {
      const prefixData = await fetchRipe('prefix-overview', trimmed);
      const prefix = prefixData.resource;
      const asnInfo = prefixData.asns?.[0] || {};
      result.prefix = prefix;
      result.asn = asnInfo.asn || null;
      result.holder = asnInfo.holder || 'Unknown';

      if (result.asn) {
        const asOverview = await fetchRipe('as-overview', `AS${result.asn}`);
        result.holder = asOverview.holder || result.holder;

        const neigh = await fetchRipe('asn-neighbours', `AS${result.asn}`);
        const lefts = (neigh.neighbours || []).filter(n => n.type === 'left').slice(0, 5);
        result.upstreams = lefts.map(n => ({ asn: n.asn, type: n.type, power: n.power }));
        result.neighbours_sample = (neigh.neighbours || []).slice(0, 8).map(n => ({ asn: n.asn, type: n.type, power: n.power }));
      }

      // IRR validation via RADB
      if (result.asn) {
        try {
          const { stdout } = await execPromise(`whois -h whois.radb.net AS${sanitizeInput(String(result.asn))} | head -n 60`, { timeout: 6000 });
          result.irr = stdout.trim();
        } catch (err) {
          result.irr = 'Failed to query IRR';
        }
      }

      // Reverse DNS sampling from prefix
      const samples = sampleIpsFromCidr(result.prefix, 5);
      result.reverse_dns = await reverseDnsList(samples);

      res.json({ success: true, ...result, timestamp: new Date().toISOString() });
      return;
    }

    if (isAsn) {
      const asnNum = trimmed.replace(/^AS/i, '');
      const asOverview = await fetchRipe('as-overview', `AS${asnNum}`);
      result.asn = Number(asnNum);
      result.holder = asOverview.holder || 'Unknown';

      const neigh = await fetchRipe('asn-neighbours', `AS${asnNum}`);
      const lefts = (neigh.neighbours || []).filter(n => n.type === 'left').slice(0, 5);
      result.upstreams = lefts.map(n => ({ asn: n.asn, type: n.type, power: n.power }));
      result.neighbours_sample = (neigh.neighbours || []).slice(0, 12).map(n => ({ asn: n.asn, type: n.type, power: n.power }));

      try {
        const { stdout } = await execPromise(`whois -h whois.radb.net AS${sanitizeInput(asnNum)} | head -n 60`, { timeout: 6000 });
        result.irr = stdout.trim();
      } catch (err) {
        result.irr = 'Failed to query IRR';
      }

      res.json({ success: true, ...result, timestamp: new Date().toISOString() });
      return;
    }

    return res.status(400).json({ success: false, error: 'Invalid query. Use IP or ASN (e.g., AS15169).' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. IP CALCULATOR (IPv4 and IPv6)
app.post('/api/ip-calculator', async (req, res) => {
  try {
    const { address, netmask } = req.body;
    
    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }

    const sanitizedAddress = sanitizeInput(address);
    const sanitizedNetmask = netmask ? sanitizeInput(netmask) : null;

    // Detect IPv4 or IPv6
    const isIPv6 = sanitizedAddress.includes(':');
    
    if (isIPv6) {
      // IPv6 calculation
      const parts = sanitizedAddress.split('/');
      const ipv6Addr = parts[0];
      const prefix = parseInt(parts[1] || sanitizedNetmask || '64');
      
      // Expand IPv6 address to full form
      function expandIPv6(ip) {
        // Handle :: shorthand
        if (ip.includes('::')) {
          const sides = ip.split('::');
          const left = sides[0] ? sides[0].split(':') : [];
          const right = sides[1] ? sides[1].split(':') : [];
          const missing = 8 - left.length - right.length;
          const middle = Array(missing).fill('0000');
          const full = [...left, ...middle, ...right];
          return full.map(h => h.padStart(4, '0')).join(':');
        }
        return ip.split(':').map(h => h.padStart(4, '0')).join(':');
      }

      // Convert to binary
      function ipv6ToBinary(ip) {
        const expanded = expandIPv6(ip);
        return expanded.split(':').map(hex => 
          parseInt(hex, 16).toString(2).padStart(16, '0')
        ).join(':');
      }

      // Calculate network address
      function getIPv6Network(ip, prefixLen) {
        const expanded = expandIPv6(ip);
        const parts = expanded.split(':');
        const binary = parts.map(hex => parseInt(hex, 16).toString(2).padStart(16, '0')).join('');
        const networkBinary = binary.substr(0, prefixLen).padEnd(128, '0');
        
        const networkParts = [];
        for (let i = 0; i < 8; i++) {
          const hextet = networkBinary.substr(i * 16, 16);
          networkParts.push(parseInt(hextet, 2).toString(16).padStart(4, '0'));
        }
        return networkParts.join(':');
      }

      // Calculate first and last address
      function getIPv6Range(networkAddr, prefixLen) {
        const expanded = expandIPv6(networkAddr);
        const parts = expanded.split(':');
        const binary = parts.map(hex => parseInt(hex, 16).toString(2).padStart(16, '0')).join('');
        
        const firstBinary = binary.substr(0, prefixLen).padEnd(128, '0');
        const lastBinary = binary.substr(0, prefixLen).padEnd(128, '1');
        
        function binaryToIPv6(bin) {
          const result = [];
          for (let i = 0; i < 8; i++) {
            const hextet = bin.substr(i * 16, 16);
            result.push(parseInt(hextet, 2).toString(16));
          }
          return result.join(':');
        }
        
        return {
          first: binaryToIPv6(firstBinary),
          last: binaryToIPv6(lastBinary)
        };
      }

      const expanded = expandIPv6(ipv6Addr);
      const networkAddr = getIPv6Network(ipv6Addr, prefix);
      const range = getIPv6Range(networkAddr, prefix);
      const totalAddresses = prefix < 64 ? `2^${128 - prefix}` : (128 - prefix <= 20 ? Math.pow(2, 128 - prefix).toLocaleString() : `2^${128 - prefix}`);
      
      res.json({
        success: true,
        type: 'ipv6',
        address: {
          compressed: ipv6Addr,
          expanded: expanded,
          binary: ipv6ToBinary(ipv6Addr)
        },
        prefix: prefix,
        network: {
          compressed: networkAddr,
          expanded: expandIPv6(networkAddr),
          binary: ipv6ToBinary(networkAddr),
          cidr: `${networkAddr}/${prefix}`
        },
        range: {
          first: range.first,
          last: range.last,
          firstExpanded: expandIPv6(range.first),
          lastExpanded: expandIPv6(range.last)
        },
        totalAddresses: totalAddresses,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // IPv4 calculation
    let ipAddr, cidr;
    if (sanitizedAddress.includes('/')) {
      [ipAddr, cidr] = sanitizedAddress.split('/');
      cidr = parseInt(cidr);
    } else {
      ipAddr = sanitizedAddress;
      if (sanitizedNetmask) {
        // Convert netmask to CIDR
        if (sanitizedNetmask.includes('.')) {
          const maskParts = sanitizedNetmask.split('.').map(Number);
          const binaryMask = maskParts.map(n => n.toString(2).padStart(8, '0')).join('');
          cidr = binaryMask.split('1').length - 1;
        } else {
          cidr = parseInt(sanitizedNetmask);
        }
      } else {
        cidr = 24; // default
      }
    }

    // Validate IPv4
    const ipParts = ipAddr.split('.').map(Number);
    if (ipParts.length !== 4 || ipParts.some(n => isNaN(n) || n < 0 || n > 255)) {
      return res.status(400).json({ success: false, error: 'Invalid IPv4 address' });
    }

    // Calculate netmask
    const maskBits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
    const maskParts = [
      maskBits.substr(0, 8),
      maskBits.substr(8, 8),
      maskBits.substr(16, 8),
      maskBits.substr(24, 8)
    ].map(b => parseInt(b, 2));

    // Calculate wildcard
    const wildcardParts = maskParts.map(n => 255 - n);

    // Calculate network address
    const networkParts = ipParts.map((octet, i) => octet & maskParts[i]);

    // Calculate broadcast address
    const broadcastParts = networkParts.map((octet, i) => octet | wildcardParts[i]);

    // Calculate host range
    const hostMinParts = [...networkParts];
    hostMinParts[3] += 1;
    const hostMaxParts = [...broadcastParts];
    hostMaxParts[3] -= 1;

    // Calculate total hosts
    const totalHosts = Math.pow(2, 32 - cidr) - 2;

    // Determine class
    let ipClass = 'Unknown';
    const firstOctet = ipParts[0];
    if (firstOctet >= 1 && firstOctet <= 126) ipClass = 'Class A';
    else if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'Class B';
    else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'Class C';
    else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'Class D (Multicast)';
    else if (firstOctet >= 240 && firstOctet <= 255) ipClass = 'Class E (Reserved)';

    // Determine if private
    let ipType = 'Public Internet';
    if ((firstOctet === 10) ||
        (firstOctet === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
        (firstOctet === 192 && ipParts[1] === 168)) {
      ipType = 'Private Internet';
    } else if (firstOctet === 127) {
      ipType = 'Loopback';
    } else if (firstOctet === 169 && ipParts[1] === 254) {
      ipType = 'Link Local';
    }

    // Helper to convert IP to binary
    function toBinary(parts) {
      return parts.map(n => n.toString(2).padStart(8, '0')).join('.');
    }

    res.json({
      success: true,
      type: 'ipv4',
      address: {
        decimal: ipAddr,
        binary: toBinary(ipParts)
      },
      netmask: {
        decimal: maskParts.join('.'),
        cidr: cidr,
        binary: toBinary(maskParts)
      },
      wildcard: {
        decimal: wildcardParts.join('.'),
        binary: toBinary(wildcardParts)
      },
      network: {
        decimal: networkParts.join('.') + '/' + cidr,
        binary: toBinary(networkParts),
        class: ipClass
      },
      broadcast: {
        decimal: broadcastParts.join('.'),
        binary: toBinary(broadcastParts)
      },
      hostMin: {
        decimal: hostMinParts.join('.'),
        binary: toBinary(hostMinParts)
      },
      hostMax: {
        decimal: hostMaxParts.join('.'),
        binary: toBinary(hostMaxParts)
      },
      hostsPerNet: totalHosts,
      ipType: ipType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4b. IP SUBNET SPLITTER
app.post('/api/ip-split', async (req, res) => {
  try {
    const { address, newPrefix } = req.body;
    
    if (!address || !newPrefix) {
      return res.status(400).json({ success: false, error: 'Address and new prefix are required' });
    }

    const sanitizedAddress = sanitizeInput(address);
    const targetPrefix = parseInt(newPrefix);

    // Detect IPv4 or IPv6
    const isIPv6 = sanitizedAddress.includes(':');

    if (isIPv6) {
      // IPv6 subnet split
      const parts = sanitizedAddress.split('/');
      const ipv6Addr = parts[0];
      const currentPrefix = parseInt(parts[1] || '64');

      if (targetPrefix <= currentPrefix) {
        return res.status(400).json({ success: false, error: 'Target prefix must be larger than current prefix' });
      }

      if (targetPrefix > 128) {
        return res.status(400).json({ success: false, error: 'IPv6 prefix cannot exceed 128' });
      }

      // Helper functions from IPv6 calculator
      function expandIPv6(ip) {
        if (ip.includes('::')) {
          const sides = ip.split('::');
          const left = sides[0] ? sides[0].split(':') : [];
          const right = sides[1] ? sides[1].split(':') : [];
          const missing = 8 - left.length - right.length;
          const middle = Array(missing).fill('0000');
          const full = [...left, ...middle, ...right];
          return full.map(h => h.padStart(4, '0')).join(':');
        }
        return ip.split(':').map(h => h.padStart(4, '0')).join(':');
      }

      function getIPv6Network(ip, prefixLen) {
        const expanded = expandIPv6(ip);
        const parts = expanded.split(':');
        const binary = parts.map(hex => parseInt(hex, 16).toString(2).padStart(16, '0')).join('');
        const networkBinary = binary.substr(0, prefixLen).padEnd(128, '0');
        
        const networkParts = [];
        for (let i = 0; i < 8; i++) {
          const hextet = networkBinary.substr(i * 16, 16);
          networkParts.push(parseInt(hextet, 2).toString(16));
        }
        return networkParts.join(':');
      }

      const baseNetwork = getIPv6Network(ipv6Addr, currentPrefix);
      const numSubnets = Math.pow(2, targetPrefix - currentPrefix);
      const maxDisplay = 100; // Limit display
      const subnets = [];

      for (let i = 0; i < Math.min(numSubnets, maxDisplay); i++) {
        const expanded = expandIPv6(baseNetwork);
        const parts = expanded.split(':');
        const binary = parts.map(hex => parseInt(hex, 16).toString(2).padStart(16, '0')).join('');
        
        // Add subnet index to binary
        const subnetBits = (i).toString(2).padStart(targetPrefix - currentPrefix, '0');
        const newBinary = binary.substr(0, currentPrefix) + subnetBits + binary.substr(targetPrefix);
        
        const newParts = [];
        for (let j = 0; j < 8; j++) {
          const hextet = newBinary.substr(j * 16, 16);
          newParts.push(parseInt(hextet, 2).toString(16));
        }
        const subnetAddr = newParts.join(':');
        subnets.push(`${subnetAddr}/${targetPrefix}`);
      }

      res.json({
        success: true,
        type: 'ipv6',
        originalNetwork: `${baseNetwork}/${currentPrefix}`,
        targetPrefix: targetPrefix,
        totalSubnets: numSubnets,
        displayedSubnets: subnets.length,
        subnets: subnets,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // IPv4 subnet split
    let ipAddr, currentPrefix;
    if (sanitizedAddress.includes('/')) {
      [ipAddr, currentPrefix] = sanitizedAddress.split('/');
      currentPrefix = parseInt(currentPrefix);
    } else {
      return res.status(400).json({ success: false, error: 'IPv4 address must include CIDR notation (e.g., 192.168.0.0/24)' });
    }

    if (targetPrefix <= currentPrefix) {
      return res.status(400).json({ success: false, error: 'Target prefix must be larger than current prefix' });
    }

    if (targetPrefix > 30) {
      return res.status(400).json({ success: false, error: 'IPv4 prefix cannot exceed 30 (use /31 or /32 for point-to-point)' });
    }

    // Validate IPv4
    const ipParts = ipAddr.split('.').map(Number);
    if (ipParts.length !== 4 || ipParts.some(n => isNaN(n) || n < 0 || n > 255)) {
      return res.status(400).json({ success: false, error: 'Invalid IPv4 address' });
    }

    // Calculate base network
    const maskBits = '1'.repeat(currentPrefix) + '0'.repeat(32 - currentPrefix);
    const maskParts = [
      maskBits.substr(0, 8),
      maskBits.substr(8, 8),
      maskBits.substr(16, 8),
      maskBits.substr(24, 8)
    ].map(b => parseInt(b, 2));

    const baseNetworkParts = ipParts.map((octet, i) => octet & maskParts[i]);
    
    // Calculate number of subnets
    const numSubnets = Math.pow(2, targetPrefix - currentPrefix);
    const hostsPerSubnet = Math.pow(2, 32 - targetPrefix) - 2;
    const increment = Math.pow(2, 32 - targetPrefix);

    const subnets = [];
    const maxDisplay = 100; // Limit to 100 subnets

    for (let i = 0; i < Math.min(numSubnets, maxDisplay); i++) {
      // Calculate subnet network address
      let carry = i * increment;
      const subnetParts = [...baseNetworkParts];
      
      for (let j = 3; j >= 0; j--) {
        subnetParts[j] += carry % 256;
        carry = Math.floor(carry / 256);
        if (subnetParts[j] >= 256) {
          carry += Math.floor(subnetParts[j] / 256);
          subnetParts[j] = subnetParts[j] % 256;
        }
      }

      const subnetAddr = subnetParts.join('.');
      
      // Calculate broadcast
      const targetMaskBits = '1'.repeat(targetPrefix) + '0'.repeat(32 - targetPrefix);
      const targetWildcardParts = [
        targetMaskBits.substr(0, 8),
        targetMaskBits.substr(8, 8),
        targetMaskBits.substr(16, 8),
        targetMaskBits.substr(24, 8)
      ].map(b => 255 - parseInt(b, 2));
      
      const broadcastParts = subnetParts.map((octet, idx) => octet | targetWildcardParts[idx]);
      const broadcastAddr = broadcastParts.join('.');

      subnets.push({
        network: `${subnetAddr}/${targetPrefix}`,
        broadcast: broadcastAddr,
        hostMin: `${subnetParts[0]}.${subnetParts[1]}.${subnetParts[2]}.${subnetParts[3] + 1}`,
        hostMax: `${broadcastParts[0]}.${broadcastParts[1]}.${broadcastParts[2]}.${broadcastParts[3] - 1}`,
        hostsPerNet: hostsPerSubnet
      });
    }

    res.json({
      success: true,
      type: 'ipv4',
      originalNetwork: `${baseNetworkParts.join('.')}/${currentPrefix}`,
      targetPrefix: targetPrefix,
      totalSubnets: numSubnets,
      displayedSubnets: subnets.length,
      hostsPerSubnet: hostsPerSubnet,
      subnets: subnets,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. PING
app.post('/api/ping', async (req, res) => {
  try {
    const { ip, count = 4 } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }

    if (!isValidIP(ip)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
    }

    const sanitizedIP = sanitizeInput(ip);
    const sanitizedCount = Math.min(parseInt(count) || 4, 10); // Max 10 packets

    const { stdout, stderr } = await execPromise(`ping -c ${sanitizedCount} ${sanitizedIP}`);

    res.json({
      success: true,
      ip: ip,
      output: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      success: false,
      ip: req.body.ip,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    });
  }
});

// 4. TRACEROUTE - HTTP/DNS based fallback since ICMP may be blocked
app.post('/api/traceroute', async (req, res) => {
  try {
    const { ip, maxHops = 8, port = 443 } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }

    if (!isValidIP(ip)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
    }

    const sanitizedIP = sanitizeInput(ip);
    const sanitizedHops = Math.min(parseInt(maxHops) || 8, 12);

    // Try mtr first (fast and reliable), then traceroute
    const attempts = [
      `mtr -r -c 1 -m ${sanitizedHops} ${sanitizedIP} 2>&1`,
      `traceroute -T -p 443 -q 1 -m ${sanitizedHops} -w 2 ${sanitizedIP} 2>&1`,
      `traceroute -m ${sanitizedHops} -w 2 ${sanitizedIP} 2>&1`
    ];

    let lastOutput = '';
    let lastError = '';
    
    for (const cmd of attempts) {
      try {
        const { stdout } = await execPromise(cmd, { timeout: 20000 });
        if (stdout && stdout.trim().length > 0) {
          lastOutput = stdout;
          res.json({
            success: true,
            ip: ip,
            output: stdout,
            timestamp: new Date().toISOString()
          });
          return;
        }
      } catch (err) {
        lastError = err.message;
        if (err.stdout && err.stdout.trim().length > 0) {
          lastOutput = err.stdout;
        }
      }
    }

    // Return whatever output we got, even if incomplete
    res.json({
      success: lastOutput.length > 0,
      ip: ip,
      output: lastOutput || `Traceroute failed: ${lastError}\n\nNote: Some networks block ICMP/UDP packets.\nTry using WHOIS or PING tools for network information.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      success: false,
      ip: req.body.ip,
      error: error.message,
      output: 'Error executing traceroute command',
      timestamp: new Date().toISOString()
    });
  }
});

// 5. DNS LOOKUP
app.post('/api/dns', async (req, res) => {
  try {
    const { hostname } = req.body;

    if (!hostname) {
      return res.status(400).json({
        success: false,
        error: 'Hostname is required'
      });
    }

    const sanitizedHostname = sanitizeInput(hostname);
    const { stdout, stderr } = await execPromise(`nslookup ${sanitizedHostname}`);

    res.json({
      success: true,
      hostname: hostname,
      output: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      success: false,
      hostname: req.body.hostname,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    });
  }
});

// 6. NSLOOKUP / REVERSE LOOKUP
app.post('/api/nslookup', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query (IP or hostname) is required'
      });
    }

    const sanitizedQuery = sanitizeInput(query);
    const { stdout, stderr } = await execPromise(`nslookup ${sanitizedQuery}`);

    res.json({
      success: true,
      query: query,
      output: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      success: false,
      query: req.body.query,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    });
  }
});

// 7. DIG (DNS Information Groper)
app.post('/api/dig', async (req, res) => {
  try {
    const { domain, recordType = 'A' } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const sanitizedDomain = sanitizeInput(domain);
    const sanitizedType = sanitizeInput(recordType);
    const { stdout, stderr } = await execPromise(`dig ${sanitizedDomain} ${sanitizedType}`);

    res.json({
      success: true,
      domain: domain,
      recordType: recordType,
      output: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      success: false,
      domain: req.body.domain,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - lihat info request
app.get('/api/debug', (req, res) => {
  res.json({
    headers: req.headers,
    ip: req.ip,
    ips: req.ips,
    connection_remoteAddress: req.connection?.remoteAddress,
    socket_remoteAddress: req.socket?.remoteAddress,
    forwarded_for: req.headers['x-forwarded-for'],
    real_ip: req.headers['x-real-ip']
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      'GET /api/myip': 'Deteksi IP address client',
      'POST /api/whois': 'Lookup informasi WHOIS dari IP (body: {ip})',
      'POST /api/ping': 'Ping IP address (body: {ip, count})',
      'POST /api/traceroute': 'Traceroute ke IP address (body: {ip, maxHops})',
      'POST /api/dns': 'DNS lookup hostname (body: {hostname})',
      'POST /api/nslookup': 'NSLookup untuk IP atau hostname (body: {query})',
      'POST /api/dig': 'DIG DNS Information (body: {domain, recordType})',
      'GET /health': 'Health check endpoint'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: '/api/docs'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`✨ WhoisIP Server berjalan di http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});
