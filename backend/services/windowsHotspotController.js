const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Windows Hotspot Controller
 * Manages Windows Mobile Hotspot and applies speed limits using PowerShell
 */

class WindowsHotspotController {
  constructor() {
    this.hotspotName = 'LinkNest_WiFi';
    this.hotspotPassword = 'linknest123';
    this.connectedDevices = new Map();
    this.defaultLimitMbps = 5; // Default 5 Mbps for unauthenticated devices
  }

  /**
   * Start Windows Mobile Hotspot
   */
  async startHotspot() {
    try {
      console.log('🚀 Starting Windows Mobile Hotspot...');
      
      // Create hotspot using netsh
      await execPromise(`netsh wlan set hostednetwork mode=allow ssid="${this.hotspotName}" key="${this.hotspotPassword}"`);
      await execPromise('netsh wlan start hostednetwork');
      
      // Enable Internet Connection Sharing (ICS)
      const enableICS = `
        $m = New-Object -ComObject HNetCfg.HNetShare
        $c = $m.EnumEveryConnection |? { $m.NetConnectionProps.Invoke($_).Name -eq "Wi-Fi" }
        $config = $m.INetSharingConfigurationForINetConnection.Invoke($c)
        $config.EnableSharing(0)
      `;
      
      await execPromise(`powershell -Command "${enableICS}"`);
      
      console.log('✅ Hotspot started successfully!');
      console.log(`📶 SSID: ${this.hotspotName}`);
      console.log(`🔑 Password: ${this.hotspotPassword}`);
      
      // Start monitoring for new connections
      this.startConnectionMonitor();
      
      return { success: true, ssid: this.hotspotName };
      
    } catch (error) {
      console.error('❌ Failed to start hotspot:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop Windows Mobile Hotspot
   */
  async stopHotspot() {
    try {
      await execPromise('netsh wlan stop hostednetwork');
      console.log('🛑 Hotspot stopped');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to stop hotspot:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get connected devices
   */
  async getConnectedDevices() {
    try {
      const { stdout } = await execPromise('netsh wlan show hostednetwork');
      const devices = [];
      
      // Parse output to find connected devices
      const lines = stdout.split('\n');
      let inClientsSection = false;
      
      for (const line of lines) {
        if (line.includes('Number of clients')) {
          inClientsSection = true;
          continue;
        }
        
        if (inClientsSection && line.includes('MAC address')) {
          const macMatch = line.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
          if (macMatch) {
            devices.push({
              mac: macMatch[0],
              status: 'connected'
            });
          }
        }
      }
      
      // Get IP addresses using ARP
      const { stdout: arpOutput } = await execPromise('arp -a');
      const arpLines = arpOutput.split('\n');
      
      for (const device of devices) {
        for (const arpLine of arpLines) {
          if (arpLine.toLowerCase().includes(device.mac.toLowerCase().replace(/:/g, '-'))) {
            const ipMatch = arpLine.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
              device.ip = ipMatch[0];
            }
          }
        }
      }
      
      return devices;
      
    } catch (error) {
      console.error('❌ Failed to get connected devices:', error.message);
      return [];
    }
  }

  /**
   * Apply speed limit to a device using Windows QoS
   */
  async applySpeedLimit(deviceIP, downloadMbps, uploadMbps) {
    try {
      console.log(`🎯 Applying speed limit to ${deviceIP}: ${downloadMbps}/${uploadMbps} Mbps`);
      
      // Create QoS policy using PowerShell
      const policyName = `LinkNest_${deviceIP.replace(/\./g, '_')}`;
      
      // Remove existing policy if exists
      await execPromise(`powershell -Command "Remove-NetQosPolicy -Name '${policyName}' -Confirm:$false -ErrorAction SilentlyContinue"`);
      
      // Create new QoS policy
      const downloadKbps = downloadMbps * 1000;
      const createPolicy = `New-NetQosPolicy -Name "${policyName}" -IPDstPrefixMatchCondition "${deviceIP}/32" -ThrottleRateActionBitsPerSecond ${downloadKbps}kb -NetworkProfile All -Precedence 1`;
      
      await execPromise(`powershell -Command "${createPolicy}"`);
      
      // Store device info
      this.connectedDevices.set(deviceIP, {
        ip: deviceIP,
        downloadMbps,
        uploadMbps,
        policyName,
        appliedAt: new Date()
      });
      
      console.log(`✅ Speed limit applied to ${deviceIP}`);
      return { success: true, deviceIP, downloadMbps, uploadMbps };
      
    } catch (error) {
      console.error(`❌ Failed to apply speed limit to ${deviceIP}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove speed limit from a device
   */
  async removeSpeedLimit(deviceIP) {
    try {
      const device = this.connectedDevices.get(deviceIP);
      if (device && device.policyName) {
        await execPromise(`powershell -Command "Remove-NetQosPolicy -Name '${device.policyName}' -Confirm:$false"`);
        this.connectedDevices.delete(deviceIP);
        console.log(`✅ Speed limit removed from ${deviceIP}`);
      }
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to remove speed limit from ${deviceIP}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitor for new device connections
   */
  async startConnectionMonitor() {
    console.log('👀 Starting connection monitor...');
    
    setInterval(async () => {
      const devices = await this.getConnectedDevices();
      
      for (const device of devices) {
        if (device.ip && !this.connectedDevices.has(device.ip)) {
          console.log(`🆕 New device connected: ${device.ip} (MAC: ${device.mac})`);
          
          // Apply default speed limit to new devices
          await this.applySpeedLimit(device.ip, this.defaultLimitMbps, this.defaultLimitMbps);
          
          // Trigger captive portal redirect
          this.triggerCaptivePortal(device.ip);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Trigger captive portal for a device
   */
  triggerCaptivePortal(deviceIP) {
    console.log(`🔐 Triggering captive portal for ${deviceIP}`);
    
    // The device will automatically detect limited connectivity
    // and show captive portal notification
    
    // Store device as unauthenticated
    this.connectedDevices.set(deviceIP, {
      ...this.connectedDevices.get(deviceIP),
      authenticated: false,
      captivePortalTriggered: new Date()
    });
  }

  /**
   * Authenticate device and update speed limits
   */
  async authenticateDevice(deviceIP, tenantId, planSpeeds) {
    try {
      console.log(`🔓 Authenticating device ${deviceIP} for tenant ${tenantId}`);
      
      // Remove default limit and apply plan speeds
      await this.removeSpeedLimit(deviceIP);
      await this.applySpeedLimit(deviceIP, planSpeeds.download, planSpeeds.upload);
      
      // Update device info
      this.connectedDevices.set(deviceIP, {
        ...this.connectedDevices.get(deviceIP),
        authenticated: true,
        tenantId,
        planSpeeds,
        authenticatedAt: new Date()
      });
      
      console.log(`✅ Device ${deviceIP} authenticated with speeds: ${planSpeeds.download}/${planSpeeds.upload} Mbps`);
      return { success: true, deviceIP, speeds: planSpeeds };
      
    } catch (error) {
      console.error(`❌ Failed to authenticate device ${deviceIP}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get hotspot status
   */
  async getStatus() {
    try {
      const { stdout } = await execPromise('netsh wlan show hostednetwork');
      const isRunning = stdout.includes('Status                 : Started');
      const devices = await this.getConnectedDevices();
      
      return {
        running: isRunning,
        ssid: this.hotspotName,
        connectedDevices: devices.length,
        devices: Array.from(this.connectedDevices.values())
      };
      
    } catch (error) {
      console.error('❌ Failed to get hotspot status:', error.message);
      return { running: false, error: error.message };
    }
  }

  /**
   * Setup DNS redirection for captive portal
   */
  async setupDNSRedirection(serverIP = '192.168.137.1') {
    try {
      console.log('🌐 Setting up DNS redirection for captive portal...');
      
      // Add firewall rule to redirect DNS queries
      const addDNSRule = `netsh advfirewall firewall add rule name="LinkNest_DNS_Redirect" dir=in action=allow protocol=UDP localport=53`;
      
      await execPromise(addDNSRule);
      
      // Modify hosts file for common captive portal detection URLs
      const hostsEntries = [
        `${serverIP} connectivitycheck.gstatic.com`,
        `${serverIP} www.gstatic.com`,
        `${serverIP} clients3.google.com`,
        `${serverIP} captive.apple.com`,
        `${serverIP} www.msftconnecttest.com`,
        `${serverIP} www.msftncsi.com`
      ];
      
      const hostsFile = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
      const fs = require('fs');
      
      // Backup hosts file
      const hostsContent = fs.readFileSync(hostsFile, 'utf8');
      fs.writeFileSync(`${hostsFile}.backup`, hostsContent);
      
      // Add entries if not already present
      let newContent = hostsContent;
      for (const entry of hostsEntries) {
        if (!hostsContent.includes(entry)) {
          newContent += `\n${entry}`;
        }
      }
      
      fs.writeFileSync(hostsFile, newContent);
      
      console.log('✅ DNS redirection configured');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to setup DNS redirection:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup DNS redirection
   */
  async cleanupDNSRedirection() {
    try {
      // Remove firewall rule
      await execPromise('netsh advfirewall firewall delete rule name="LinkNest_DNS_Redirect"');
      
      // Restore hosts file
      const fs = require('fs');
      const hostsFile = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
      const backupFile = `${hostsFile}.backup`;
      
      if (fs.existsSync(backupFile)) {
        const backupContent = fs.readFileSync(backupFile, 'utf8');
        fs.writeFileSync(hostsFile, backupContent);
        fs.unlinkSync(backupFile);
      }
      
      console.log('✅ DNS redirection cleaned up');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to cleanup DNS redirection:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WindowsHotspotController();
