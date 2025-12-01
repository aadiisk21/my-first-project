'use client';

import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  SwatchIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    pushNotifications: true,
    priceAlerts: true,
    signalAlerts: true,
    theme: 'dark',
    timezone: 'UTC',
    language: 'en',
    apiKey: '',
    twoFactorAuth: false,
    orderConfirmation: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Simulate loading settings
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleSelect = (key: keyof typeof settings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6 max-w-4xl'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground'>Settings</h1>
          <p className='text-muted-foreground mt-1'>
            Manage your preferences and account settings
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className='trading-card p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <BellIcon className='h-6 w-6 text-primary' />
          <h2 className='text-xl font-semibold text-foreground'>
            Notifications
          </h2>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between pb-4 border-b border-border'>
            <div>
              <div className='font-medium text-foreground'>
                Notifications Enabled
              </div>
              <div className='text-sm text-muted-foreground'>
                Receive all notifications
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className='flex items-center justify-between pb-4 border-b border-border'>
            <div>
              <div className='font-medium text-foreground'>Email Alerts</div>
              <div className='text-sm text-muted-foreground'>
                Get notified via email
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.emailAlerts}
                onChange={() => handleToggle('emailAlerts')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className='flex items-center justify-between pb-4 border-b border-border'>
            <div>
              <div className='font-medium text-foreground'>
                Push Notifications
              </div>
              <div className='text-sm text-muted-foreground'>
                Get push notifications on your device
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className='flex items-center justify-between pb-4 border-b border-border'>
            <div>
              <div className='font-medium text-foreground'>Price Alerts</div>
              <div className='text-sm text-muted-foreground'>
                Notify on price movements
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.priceAlerts}
                onChange={() => handleToggle('priceAlerts')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium text-foreground'>Signal Alerts</div>
              <div className='text-sm text-muted-foreground'>
                Notify when signals are generated
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.signalAlerts}
                onChange={() => handleToggle('signalAlerts')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className='trading-card p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <SwatchIcon className='h-6 w-6 text-primary' />
          <h2 className='text-xl font-semibold text-foreground'>Appearance</h2>
        </div>

        <div className='space-y-4'>
          <div className='pb-4 border-b border-border'>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleSelect('theme', e.target.value)}
              className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            >
              <option value='light'>Light</option>
              <option value='dark'>Dark</option>
              <option value='auto'>Auto (System)</option>
            </select>
          </div>

          <div className='pb-4 border-b border-border'>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSelect('language', e.target.value)}
              className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            >
              <option value='en'>English</option>
              <option value='es'>Español</option>
              <option value='fr'>Français</option>
              <option value='de'>Deutsch</option>
              <option value='ja'>日本語</option>
              <option value='zh'>中文</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleSelect('timezone', e.target.value)}
              className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            >
              <option value='UTC'>UTC</option>
              <option value='EST'>EST (UTC-5)</option>
              <option value='CST'>CST (UTC-6)</option>
              <option value='MST'>MST (UTC-7)</option>
              <option value='PST'>PST (UTC-8)</option>
              <option value='GMT'>GMT (UTC+0)</option>
              <option value='CET'>CET (UTC+1)</option>
              <option value='IST'>IST (UTC+5:30)</option>
              <option value='SGT'>SGT (UTC+8)</option>
              <option value='JST'>JST (UTC+9)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className='trading-card p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <ShieldCheckIcon className='h-6 w-6 text-primary' />
          <h2 className='text-xl font-semibold text-foreground'>Security</h2>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between pb-4 border-b border-border'>
            <div>
              <div className='font-medium text-foreground'>
                Two-Factor Authentication
              </div>
              <div className='text-sm text-muted-foreground'>
                Add an extra layer of security
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.twoFactorAuth}
                onChange={() => handleToggle('twoFactorAuth')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium text-foreground'>
                Order Confirmation
              </div>
              <div className='text-sm text-muted-foreground'>
                Require confirmation for orders
              </div>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.orderConfirmation}
                onChange={() => handleToggle('orderConfirmation')}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button and Status */}
      <div className='flex items-center justify-between'>
        <div>
          {saved && (
            <div className='text-sm text-green-600 flex items-center gap-2'>
              <span>✓</span>
              <span>Settings saved successfully</span>
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          className='px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors'
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
