import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Globe, Database, Shield, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SettingsTabProps {
  adminInfo: any;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ adminInfo }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'system'>('profile');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    // In a real app, this would make an API call
    toast.success('Password updated successfully');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-5 h-5" /> },
    { id: 'system', label: 'System', icon: <Database className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {section.icon}
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
              
              {/* Admin Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="label">Username</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={adminInfo?.username || ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Account Created</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={adminInfo?.created_at ? new Date(adminInfo.created_at).toLocaleDateString() : ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value="System Administrator"
                    disabled
                  />
                </div>
              </div>

              {/* Account Actions */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Account Actions</h3>
                <button
                  onClick={handleLogout}
                  className="btn-secondary flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
              
              {/* Change Password */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Update Password
                </button>
              </form>

              {/* Two-Factor Authentication */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button className="btn-secondary">
                  Enable 2FA
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* System Configuration */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">System Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Network Name (SSID)</label>
                    <input
                      type="text"
                      className="input"
                      defaultValue="LinkNest-MDU"
                      placeholder="Enter network name"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Admin Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="admin@linknest.com"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Billing Cycle</label>
                    <select className="input">
                      <option>Monthly (1st of each month)</option>
                      <option>Monthly (15th of each month)</option>
                      <option>Bi-monthly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Default Tenant Plan</label>
                    <select className="input">
                      <option>Basic (25 Mbps)</option>
                      <option>Standard (50 Mbps)</option>
                      <option>Premium (100 Mbps)</option>
                    </select>
                  </div>
                  
                  <button className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </button>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked />
                    <span className="text-gray-700">Email notifications for new tenants</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked />
                    <span className="text-gray-700">Email notifications for overdue payments</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked />
                    <span className="text-gray-700">Network alerts and warnings</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary" />
                    <span className="text-gray-700">Daily usage reports</span>
                  </label>
                  
                  <button className="btn-primary flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Update Notifications
                  </button>
                </div>
              </div>

              {/* Database Backup */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Database Management</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Last Backup</p>
                      <p className="text-sm text-gray-600">
                        {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                    <button className="btn-secondary">
                      Backup Now
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Database Size</p>
                      <p className="text-sm text-gray-600">45.2 MB</p>
                    </div>
                    <button className="btn-secondary">
                      Optimize
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
