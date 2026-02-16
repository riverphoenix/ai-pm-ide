import { useState, useEffect } from 'react';
import { Settings as SettingsType, TokenUsageAggregate, TokenUsage } from '../lib/types';
import { settingsAPI, tokenUsageAPI } from '../lib/ipc';

type SettingsTab = 'general' | 'profile' | 'usage';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [aboutRole, setAboutRole] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [displayKey, setDisplayKey] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [tokenUsageData, setTokenUsageData] = useState<TokenUsageAggregate[]>([]);
  const [allTokenUsage, setAllTokenUsage] = useState<TokenUsage[]>([]);
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'usage') {
      loadTokenUsage();
    }
  }, [activeTab, viewType, startDate, endDate]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsAPI.get();
      setSettings(data);
      setUsername(data.username || '');
      setProfilePic(data.profile_pic || '');
      setName(data.name || '');
      setSurname(data.surname || '');
      setJobTitle(data.job_title || '');
      setCompany(data.company || '');
      setCompanyUrl(data.company_url || '');
      setAboutMe(data.about_me || '');
      setAboutRole(data.about_role || '');

      const keyExists = !!data.api_key_encrypted;
      setHasApiKey(keyExists);

      if (keyExists) {
        const decryptedKey = await settingsAPI.getDecryptedApiKey();
        if (decryptedKey && decryptedKey.length > 5) {
          const masked = `${decryptedKey.substring(0, 2)}${'*'.repeat(10)}${decryptedKey.substring(decryptedKey.length - 2)}`;
          setDisplayKey(masked);
        } else {
          setDisplayKey('');
        }
      } else {
        setDisplayKey('');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenUsage = async () => {
    setLoadingTokens(true);
    try {
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [aggregateData, allData] = await Promise.all([
        tokenUsageAPI.getByDateRange(start, end, viewType),
        tokenUsageAPI.getAll()
      ]);
      setTokenUsageData(aggregateData);
      setAllTokenUsage(allData);
    } catch (error) {
      console.error('Failed to load token usage:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({
        api_key: apiKey || undefined,
        username: username || undefined,
        profile_pic: profilePic || undefined,
        name: name || undefined,
        surname: surname || undefined,
        job_title: jobTitle || undefined,
        company: company || undefined,
        company_url: companyUrl || undefined,
        about_me: aboutMe || undefined,
        about_role: aboutRole || undefined,
      });
      setApiKey('');
      await loadSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApiKey = () => setShowDeleteConfirm(true);
  const handleDeleteCancel = () => setShowDeleteConfirm(false);

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    try {
      await settingsAPI.deleteApiKey();
      setHasApiKey(false);
      setApiKey('');
      setDisplayKey('');
      await loadSettings();
      alert('API key deleted successfully!');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-codex-bg">
        <div className="text-codex-text-secondary">Loading settings...</div>
      </div>
    );
  }

  const getTotalStats = () => {
    const totalTokens = tokenUsageData.reduce((sum, item) => sum + item.total_tokens, 0);
    const totalCost = tokenUsageData.reduce((sum, item) => sum + item.cost, 0);
    return { totalTokens, totalCost };
  };

  const maxTokens = Math.max(...tokenUsageData.map(d => d.total_tokens), 1);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'profile', label: 'Personalization' },
    { id: 'usage', label: 'Usage' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} className="bg-codex-bg">
      {/* Settings Sidebar */}
      <div style={{ width: '200px', flexShrink: 0 }} className="border-r border-codex-border bg-codex-sidebar p-4">
        <div className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-codex-surface text-codex-text-primary font-medium'
                  : 'text-codex-text-secondary hover:bg-codex-surface/50 hover:text-codex-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="p-8">
        {activeTab === 'general' && (
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-codex-text-primary mb-8">General</h1>

            {/* API Key Setting Row */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">OpenAI API Key</div>
                  <div className="text-xs text-codex-text-secondary mt-1">
                    Your API key is encrypted and stored securely locally.
                  </div>
                </div>
                <div className="w-72 flex-shrink-0">
                  {hasApiKey && displayKey && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-green-400">{displayKey}</span>
                      <button
                        onClick={handleDeleteApiKey}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={hasApiKey ? 'Enter new key...' : 'sk-...'}
                      className="flex-1 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="px-2 text-xs text-codex-text-secondary hover:text-codex-text-primary"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-codex-text-muted mt-2">
                    Get your key from{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-codex-accent hover:underline">
                      platform.openai.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Save */}
            {apiKey && (
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-codex-accent hover:bg-codex-accent-hover disabled:opacity-50 text-white rounded-md text-sm transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-codex-text-primary mb-8">Personalization</h1>

            <div className="space-y-0">
              {/* Username */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Username</div>
                  <div className="text-xs text-codex-text-secondary mt-1">Display name in conversations</div>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* First Name */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">First Name</div>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* Last Name */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Last Name</div>
                </div>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Doe"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* Job Title */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Job Title</div>
                  <div className="text-xs text-codex-text-secondary mt-1">Helps GPT personalize responses to your role</div>
                </div>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Product Manager"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* Company */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Company</div>
                </div>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* Company URL */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Company URL</div>
                </div>
                <input
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>

              {/* About Section Header */}
              <div className="pt-8 pb-4">
                <h2 className="text-lg font-medium text-codex-text-primary">About</h2>
              </div>

              {/* About Me */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">About Me</div>
                  <div className="text-xs text-codex-text-secondary mt-1">Background context for GPT</div>
                </div>
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Tell GPT about yourself..."
                  rows={3}
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent resize-none"
                />
              </div>

              {/* About Role */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">About My Role</div>
                  <div className="text-xs text-codex-text-secondary mt-1">Role details for better responses</div>
                </div>
                <textarea
                  value={aboutRole}
                  onChange={(e) => setAboutRole(e.target.value)}
                  placeholder="Describe your role..."
                  rows={3}
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent resize-none"
                />
              </div>

              {/* Profile Picture URL */}
              <div className="flex items-start justify-between gap-8 py-4 border-b border-codex-border/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-codex-text-primary">Profile Picture</div>
                  <div className="text-xs text-codex-text-secondary mt-1">URL to your avatar image</div>
                </div>
                <input
                  type="url"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-72 px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
                />
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-codex-accent hover:bg-codex-accent-hover disabled:opacity-50 text-white rounded-md text-sm transition-colors"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold text-codex-text-primary mb-8">Usage</h1>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-codex-text-muted mb-1">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-codex-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-codex-text-muted mb-1">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-codex-accent"
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewType('daily')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewType === 'daily'
                      ? 'bg-codex-surface text-codex-text-primary'
                      : 'text-codex-text-secondary hover:bg-codex-surface/50'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewType('monthly')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewType === 'monthly'
                      ? 'bg-codex-surface text-codex-text-primary'
                      : 'text-codex-text-secondary hover:bg-codex-surface/50'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-codex-surface/50 rounded-lg p-4 border border-codex-border">
                <div className="text-xs text-codex-text-muted mb-1">Total Tokens</div>
                <div className="text-xl font-semibold text-codex-text-primary">
                  {getTotalStats().totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-codex-surface/50 rounded-lg p-4 border border-codex-border">
                <div className="text-xs text-codex-text-muted mb-1">Total Cost</div>
                <div className="text-xl font-semibold text-codex-text-primary">
                  ${getTotalStats().totalCost.toFixed(4)}
                </div>
              </div>
              <div className="bg-codex-surface/50 rounded-lg p-4 border border-codex-border">
                <div className="text-xs text-codex-text-muted mb-1">Conversations</div>
                <div className="text-xl font-semibold text-codex-text-primary">
                  {allTokenUsage.length > 0 ? new Set(allTokenUsage.map(u => u.conversation_id)).size : 0}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-codex-surface/50 rounded-lg p-4 mb-6 border border-codex-border">
              <h3 className="text-sm font-medium text-codex-text-primary mb-4">Token Usage Over Time</h3>
              {loadingTokens ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-codex-text-secondary text-sm">Loading...</div>
                </div>
              ) : tokenUsageData.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-codex-text-muted text-sm">No token usage data</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {tokenUsageData.map((item) => (
                    <div key={item.date} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-codex-text-muted font-mono">{item.date}</div>
                      <div className="flex-1 bg-codex-bg rounded-md overflow-hidden h-7 relative">
                        <div
                          className="bg-codex-accent h-full transition-all duration-300 flex items-center justify-end pr-2"
                          style={{ width: `${(item.total_tokens / maxTokens) * 100}%` }}
                        >
                          {item.total_tokens > maxTokens * 0.1 && (
                            <span className="text-xs text-white">{item.total_tokens.toLocaleString()}</span>
                          )}
                        </div>
                        {item.total_tokens <= maxTokens * 0.1 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-codex-text-muted">
                            {item.total_tokens.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="w-20 text-right text-xs text-codex-text-muted">${item.cost.toFixed(4)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-codex-surface/50 rounded-lg p-4 border border-codex-border">
              <h3 className="text-sm font-medium text-codex-text-primary mb-4">Detailed Usage</h3>
              {loadingTokens ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-codex-text-secondary text-sm">Loading...</div>
                </div>
              ) : allTokenUsage.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-codex-text-muted text-sm">No usage records</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-codex-border">
                        <th className="text-left py-2 px-3 text-codex-text-muted text-xs font-medium">Date</th>
                        <th className="text-left py-2 px-3 text-codex-text-muted text-xs font-medium">Model</th>
                        <th className="text-right py-2 px-3 text-codex-text-muted text-xs font-medium">Input</th>
                        <th className="text-right py-2 px-3 text-codex-text-muted text-xs font-medium">Output</th>
                        <th className="text-right py-2 px-3 text-codex-text-muted text-xs font-medium">Total</th>
                        <th className="text-right py-2 px-3 text-codex-text-muted text-xs font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTokenUsage.slice(0, 50).map((usage) => (
                        <tr key={usage.id} className="border-b border-codex-border/30 hover:bg-codex-surface/30">
                          <td className="py-2 px-3 text-codex-text-secondary text-xs">
                            {new Date(usage.created_at * 1000).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-codex-text-secondary text-xs">{usage.model}</td>
                          <td className="py-2 px-3 text-right text-codex-text-secondary text-xs">
                            {usage.input_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-codex-text-secondary text-xs">
                            {usage.output_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-codex-text-primary text-xs">
                            {usage.total_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-codex-accent text-xs">
                            ${usage.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allTokenUsage.length > 50 && (
                    <div className="text-center py-3 text-xs text-codex-text-muted">
                      Showing 50 of {allTokenUsage.length} records
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleDeleteCancel}>
          <div className="bg-codex-surface rounded-lg p-6 max-w-sm mx-4 border border-codex-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-medium text-codex-text-primary mb-2">Delete API Key?</h3>
            <p className="text-sm text-codex-text-secondary mb-6">
              Are you sure? You'll need to add it again to use the chat.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm text-codex-text-secondary hover:text-codex-text-primary bg-codex-surface-hover rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
