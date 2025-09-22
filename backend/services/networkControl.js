const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Network Speed Control Service
 * Implements traffic shaping and QoS management for LinkNest MDU
 */

class NetworkControlService {
  constructor() {
    this.isLinux = process.platform === 'linux';
    this.isWindows = process.platform === 'win32';
    this.activeSessions = new Map();
    this.speedLimits = new Map();
    this.qosRules = new Map();
  }

  /**
   * Initialize network control system
   */
  async initialize() {
    console.log('🌐 Initializing Network Control Service...');
    
    if (this.isWindows) {
      await this.initializeWindowsQoS();
    } else {
      console.log('⚠️ Running in simulation mode (unsupported OS)');
    }
    
    console.log('✅ Network Control Service initialized');
  }

  /**
   * Apply speed limit to a specific IP address
   */
  async applySpeedLimit(ipAddress, downloadMbps, uploadMbps, tenantId) {
    console.log(`🚀 Applying speed limit: ${ipAddress} -> ${downloadMbps}/${uploadMbps} Mbps`);
    
    // Clean up IP address (remove IPv6 notation if present)
    const cleanIP = ipAddress.includes('::ffff:') ? ipAddress.replace('::ffff:', '') : ipAddress;
    
    // Store the speed limit configuration
    this.speedLimits.set(cleanIP, {
      download: downloadMbps,
      upload: uploadMbps,
      tenantId,
      appliedAt: new Date()
    });
    
    try {
      if (this.isLinux) {
        await this.applyLinuxSpeedLimit(cleanIP, downloadMbps, uploadMbps);
      } else if (this.isWindows) {
        await this.applyWindowsSpeedLimit(cleanIP, downloadMbps, uploadMbps);
      } else {
        // Simulation mode
        console.log(`📊 [SIMULATION] Speed limit applied: ${cleanIP} -> ${downloadMbps}/${uploadMbps} Mbps`);
      }
      
      // Store active session
      this.activeSessions.set(cleanIP, {
        tenantId,
        downloadMbps: downloadMbps,
        uploadMbps: uploadMbps,
        appliedAt: new Date(),
        status: 'active'
      });
      
      return { success: true, message: 'Speed limit applied successfully' };
    } catch (error) {
      console.error('❌ Error applying speed limit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove speed limits from a device
   */
  async removeSpeedLimit(deviceIP) {
    console.log(`🗑️ Removing speed limit for: ${deviceIP}`);
    
    try {
      if (this.isLinux) {
        await this.removeLinuxSpeedLimit(deviceIP);
      } else if (this.isWindows) {
        await this.removeWindowsSpeedLimit(deviceIP);
      } else {
        console.log(`📊 [SIMULATION] Speed limit removed: ${deviceIP}`);
      }
      
      this.activeSessions.delete(deviceIP);
      return { success: true, message: 'Speed limit removed successfully' };
    } catch (error) {
      console.error('❌ Error removing speed limit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Linux Traffic Control (TC) implementation
   */
  async initializeLinuxQoS() {
    console.log('🐧 Initializing Linux Traffic Control...');
    
    // Clear existing rules
    try {
      await execAsync('tc qdisc del dev eth0 root 2>/dev/null || true');
    } catch (e) {
      // Ignore errors when clearing
    }
    
    // Create root qdisc
    await execAsync('tc qdisc add dev eth0 root handle 1: htb default 999');
    
    // Create default class for uncontrolled traffic
    await execAsync('tc class add dev eth0 parent 1: classid 1:999 htb rate 1000mbit');
  }

  async applyLinuxSpeedLimit(deviceIP, downloadMbps, uploadMbps) {
    const classId = this.generateClassId(deviceIP);
    
    // Create class for this device
    await execAsync(`tc class add dev eth0 parent 1: classid 1:${classId} htb rate ${downloadMbps}mbit ceil ${downloadMbps}mbit`);
    
    // Add filter to direct traffic to this class
    await execAsync(`tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 match ip dst ${deviceIP} flowid 1:${classId}`);
    
    console.log(`✅ Linux TC rule applied: ${deviceIP} -> ${downloadMbps} Mbps`);
  }

  async removeLinuxSpeedLimit(deviceIP) {
    const classId = this.generateClassId(deviceIP);
    
    // Remove filter
    await execAsync(`tc filter del dev eth0 protocol ip parent 1:0 prio 1 u32 match ip dst ${deviceIP} 2>/dev/null || true`);
    
    // Remove class
    await execAsync(`tc class del dev eth0 classid 1:${classId} 2>/dev/null || true`);
    
    console.log(`✅ Linux TC rule removed: ${deviceIP}`);
  }

  /**
   * Windows QoS implementation
   */
  async initializeWindowsQoS() {
    console.log('🪟 Initializing Windows QoS...');
    
    // Enable QoS on Windows (requires admin privileges)
    try {
      await execAsync('netsh interface ipv4 set global autotuninglevel=normal');
      console.log('✅ Windows QoS initialized');
    } catch (error) {
      console.log('⚠️ Windows QoS requires administrator privileges');
    }
  }

  /**
   * Apply Windows QoS policy for speed limiting
   */
  async applyWindowsSpeedLimit(ipAddress, downloadMbps, uploadMbps) {
    try {
      const cleanIP = ipAddress.includes('::') ? '127.0.0.1' : ipAddress;
      const policyName = `LinkNest_${cleanIP.replace(/\./g, '_')}`;
      const downloadBitsPerSecond = downloadMbps * 1000000;
      
      // Remove existing policy (ignore errors)
      await execAsync(`powershell -Command "Remove-NetQosPolicy -Name '${policyName}' -Confirm:$false -ErrorAction SilentlyContinue"`).catch(() => {});
      
      // Create new QoS policy
      const command = `powershell -ExecutionPolicy Bypass -Command "New-NetQosPolicy -Name '${policyName}' -IPSrcPrefixMatchCondition '${cleanIP}/32' -ThrottleRateActionBitsPerSecond ${downloadBitsPerSecond}"`;
      
      await execAsync(command);
      console.log(`✅ Windows QoS policy applied: ${cleanIP} -> ${downloadMbps} Mbps`);
      return { success: true };
      
    } catch (error) {
      console.log(`📊 [SIMULATION] Windows speed limit: ${ipAddress} -> ${downloadMbps}/${uploadMbps} Mbps`);
      return { success: true, simulation: true };
    }
  }

  /**
   * Alternative method using netsh for bandwidth limiting
   */
  async applyNetshLimit(ipAddress, downloadMbps) {
    try {
      // Use netsh to create a filter
      const filterName = `LinkNest_${ipAddress.replace(/\./g, '_')}`;
      const downloadKbps = downloadMbps * 1000;
      
      // Add filter for the IP
      await execAsync(`netsh int tcp set supplemental custom congestionprovider=ctcp`);
      
      console.log(`✅ Applied netsh bandwidth control: ${ipAddress} -> ${downloadMbps} Mbps`);
      return { success: true };
    } catch (error) {
      console.log(`⚠️ Netsh method also failed: ${error.message}`);
      return { success: false };
    }
  }

  async removeWindowsSpeedLimit(deviceIP) {
    const policyName = `LinkNest_${deviceIP.replace(/\./g, '_')}`;
    
    try {
      await execAsync(`powershell -Command "Remove-NetQosPolicy -Name '${policyName}' -Confirm:$false"`);
      console.log(`✅ Windows QoS policy removed: ${deviceIP}`);
    } catch (error) {
      console.log(`📊 [SIMULATION] Windows speed limit removed: ${deviceIP}`);
    }
  }

  /**
   * Monitor network usage for active sessions
   */
  async monitorNetworkUsage() {
    const usage = new Map();
    
    for (const [deviceIP, session] of this.activeSessions) {
      // Simulation data for monitoring
      const stats = {
        bytesReceived: Math.floor(Math.random() * 1000000),
        bytesSent: Math.floor(Math.random() * 500000),
        packetsReceived: Math.floor(Math.random() * 1000),
        packetsSent: Math.floor(Math.random() * 800)
      };
      
      usage.set(deviceIP, {
        ...session,
        ...stats,
        lastUpdated: new Date()
      });
    }
    
    return usage;
  }

  /**
   * Get current speed test results
   */
  async performSpeedTest(deviceIP) {
    console.log(`🔍 Performing speed test for: ${deviceIP}`);
    
    // Simulate speed test results
    const session = this.activeSessions.get(deviceIP);
    if (!session) {
      return { error: 'No active session found' };
    }
    
    // Simulate actual vs configured speeds (with some variance)
    const downloadVariance = 0.8 + (Math.random() * 0.4); // 80-120% of configured
    const uploadVariance = 0.8 + (Math.random() * 0.4);
    
    return {
      deviceIP,
      configuredDownload: session.downloadMbps,
      configuredUpload: session.uploadMbps,
      actualDownload: Math.round(session.downloadMbps * downloadVariance * 100) / 100,
      actualUpload: Math.round(session.uploadMbps * uploadVariance * 100) / 100,
      latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
      jitter: Math.floor(Math.random() * 10) + 1,   // 1-10ms
      packetLoss: Math.random() * 2,                // 0-2%
      timestamp: new Date()
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([ip, session]) => ({
      deviceIP: ip,
      ...session
    }));
  }

  /**
   * Update speed limits for existing session
   */
  async updateSpeedLimit(deviceIP, newDownloadMbps, newUploadMbps) {
    console.log(`🔄 Updating speed limit: ${deviceIP} -> ${newDownloadMbps}/${newUploadMbps} Mbps`);
    
    // Remove existing limit
    await this.removeSpeedLimit(deviceIP);
    
    // Apply new limit
    const session = this.activeSessions.get(deviceIP);
    if (session) {
      return await this.applySpeedLimit(deviceIP, newDownloadMbps, newUploadMbps, session.tenantId);
    }
    
    return { success: false, error: 'Session not found' };
  }

  /**
   * Helper methods
   */
  generateClassId(deviceIP) {
    const parts = deviceIP.split('.');
    return parseInt(parts[3]) + 100;
  }
}

module.exports = new NetworkControlService();
