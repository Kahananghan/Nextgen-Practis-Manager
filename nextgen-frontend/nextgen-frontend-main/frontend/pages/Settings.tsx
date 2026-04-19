
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { settingsService } from '../services';
import XeroIntegration from '../components/integrations/XeroIntegration';

const Settings: React.FC = () => {
  const [userSettings, setUserSettings] = useState<any>({});
  const [tenantSettings, setTenantSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [userRes, tenantRes] = await Promise.all([
        settingsService.getUserSettings(),
        settingsService.getTenantSettings(),
      ]);
      setUserSettings(userRes.data.settings || {});
      setTenantSettings(tenantRes.data.settings || {});
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUserSettings = async () => {
    setSaving(true);
    try {
      await settingsService.updateUserSettings(userSettings);
      alert('User settings saved!');
    } catch (error) {
      console.error('Failed to save user settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTenantSettings = async () => {
    setSaving(true);
    try {
      await settingsService.updateTenantSettings(tenantSettings);
      alert('Tenant settings saved!');
    } catch (error) {
      console.error('Failed to save tenant settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 space-y-6">
      {/* User Settings */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 p-12 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">User Preferences</h2>
          <button 
            onClick={handleSaveUserSettings}
            disabled={saving}
            className="px-6 py-2.5 bg-[#6366f1] text-white text-xs font-black rounded-xl hover:bg-[#4f52d4] transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* <div className="space-y-2">
            <label className="text-sm font-black text-slate-600">Theme</label>
            <select 
              value={userSettings.theme || 'light'}
              onChange={(e) => setUserSettings({ ...userSettings, theme: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366f1] outline-none"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-600">Language</label>
            <select 
              value={userSettings.language || 'en'}
              onChange={(e) => setUserSettings({ ...userSettings, language: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366f1] outline-none"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div> */}

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-600">Timezone</label>
            <select 
              value={userSettings.timezone || 'Australia/Sydney'}
              onChange={(e) => setUserSettings({ ...userSettings, timezone: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366f1] outline-none"
            >
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-600">Date Format</label>
            <select 
              value={userSettings.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => setUserSettings({ ...userSettings, dateFormat: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366f1] outline-none"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 p-12 space-y-12 min-h-[400px]">
        <div className="space-y-10">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Integration</h2>
          
          <XeroIntegration onRefresh={() => {
            // Refresh any dependent data if needed
            console.log('Xero integration refreshed');
          }} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
