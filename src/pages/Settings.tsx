import { useState, useEffect } from 'react';
import { Settings as SettingsType, TokenUsageAggregate, TokenUsage } from '../lib/types';
import { settingsAPI, tokenUsageAPI } from '../lib/ipc';

type SettingsTab = 'keys' | 'profile' | 'tokens';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('keys');
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form state
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

  // Token usage state
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
    if (activeTab === 'tokens') {
      loadTokenUsage();
    }
  }, [activeTab, viewType, startDate, endDate]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsAPI.get();
      setSettings(data);

      // Populate form
      setUsername(data.username || '');
      setProfilePic(data.profile_pic || '');
      setName(data.name || '');
      setSurname(data.surname || '');
      setJobTitle(data.job_title || '');
      setCompany(data.company || '');
      setCompanyUrl(data.company_url || '');
      setAboutMe(data.about_me || '');
      setAboutRole(data.about_role || '');

      // Check if API key exists and get it for masked display
      const keyExists = !!data.api_key_encrypted;
      setHasApiKey(keyExists);

      if (keyExists) {
        const decryptedKey = await settingsAPI.getDecryptedApiKey();
        console.log('🔑 Decrypted Key Info:', {
          exists: !!decryptedKey,
          length: decryptedKey?.length || 0,
          first7: decryptedKey ? decryptedKey.substring(0, 7) : 'null',
          last4: decryptedKey ? decryptedKey.substring(decryptedKey.length - 4) : 'null'
        });

        if (decryptedKey && decryptedKey.length > 5) {
          // Show as: sk-**********ab (first 2 chars + 10 asterisks + last 2 chars)
          const masked = `${decryptedKey.substring(0, 2)}${'*'.repeat(10)}${decryptedKey.substring(decryptedKey.length - 2)}`;
          console.log('🎭 Masked key:', masked);
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
      // Set default date range if not set (last 30 days)
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

      // Clear API key field after saving
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

  const handleDeleteApiKey = () => {
    console.log('🗑️ Delete API key button clicked - showing confirmation dialog');
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    console.log('❌ Delete cancelled by user');
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    console.log('✅ User confirmed API key delete. Proceeding...');
    setShowDeleteConfirm(false);

    try {
      console.log('📞 Calling settingsAPI.deleteApiKey...');
      await settingsAPI.deleteApiKey();
      console.log('✅ API key deleted successfully');

      // Update state immediately
      setHasApiKey(false);
      setApiKey('');
      setDisplayKey('');

      // Reload settings to confirm
      await loadSettings();
      console.log('✅ Settings reloaded after delete');

      alert('API key deleted successfully!');
    } catch (error) {
      console.error('❌ Failed to delete API key:', error);
      alert('Failed to delete API key. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  const getTotalStats = () => {
    const totalTokens = tokenUsageData.reduce((sum, item) => sum + item.total_tokens, 0);
    const totalCost = tokenUsageData.reduce((sum, item) => sum + item.cost, 0);
    return { totalTokens, totalCost };
  };

  const maxTokens = Math.max(...tokenUsageData.map(d => d.total_tokens), 1);

  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      {/* Top Bar */}
      <div className="h-12 border-b border-slate-700 bg-slate-800/30 flex items-center px-4">
        <h1 className="text-sm font-semibold text-white">⚙️ Settings</h1>
      </div>

      {/* Tabs */}
      <div className="h-10 border-b border-slate-700 bg-slate-800/20 flex items-center px-4 gap-1">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'keys'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          🔑 Keys
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'profile'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          👤 Profile
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'tokens'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          📊 Tokens
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'keys' && (
          <div className="max-w-3xl mx-auto w-full p-6">
            {/* API Key Section */}
            <div className="bg-slate-800 rounded-lg p-5 mb-5 border border-slate-700">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                🔑 OpenAI API Key
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Your API key is encrypted and stored securely. It never leaves your machine.
              </p>

              {/* Display existing API key if set */}
              {hasApiKey && displayKey && (
                <div className="mb-4 p-3 bg-slate-700/50 border border-slate-600 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">Current API Key</div>
                      <div className="font-mono text-sm text-green-400">{displayKey}</div>
                    </div>
                    <button
                      onClick={handleDeleteApiKey}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded text-xs font-medium transition-colors border border-red-600/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {hasApiKey ? 'Update API Key' : 'Add API Key'}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={hasApiKey ? 'Enter new API key to update' : 'sk-...'}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      platform.openai.com/api-keys
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !apiKey}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded text-sm font-semibold transition-colors shadow-md"
              >
                {saving ? 'Saving...' : 'Save API Key'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto w-full p-6">
            {/* Profile Section */}
            <div className="bg-slate-800 rounded-lg p-5 mb-5 border border-slate-700">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                👤 Profile Information
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                This information helps GPT personalize responses and understand your context.
              </p>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  A unique identifier for your profile
                </p>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Profile Picture URL (optional)
                </label>
                <input
                  type="url"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Link to your profile picture or avatar
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Product Manager"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Inc"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Company URL (optional)
                </label>
                <input
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  About Me
                </label>
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Tell GPT about yourself, your background, interests, and working style..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  This helps GPT understand your context and provide more personalized responses
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  About My Role
                </label>
                <textarea
                  value={aboutRole}
                  onChange={(e) => setAboutRole(e.target.value)}
                  placeholder="Describe your role, responsibilities, key projects, and what you're working on..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Help GPT understand your PM role and provide relevant guidance
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded text-sm font-semibold transition-colors shadow-md"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="max-w-5xl mx-auto w-full p-6">
            {/* Controls */}
            <div className="bg-slate-800 rounded-lg p-4 mb-5 border border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setViewType('daily')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      viewType === 'daily'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setViewType('monthly')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      viewType === 'monthly'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-[10px] font-medium text-slate-400 mb-1">Total Tokens</div>
                <div className="text-2xl font-bold text-white">
                  {getTotalStats().totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-[10px] font-medium text-slate-400 mb-1">Total Cost</div>
                <div className="text-2xl font-bold text-white">
                  ${getTotalStats().totalCost.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-[10px] font-medium text-slate-400 mb-1">Conversations</div>
                <div className="text-2xl font-bold text-white">
                  {allTokenUsage.length > 0
                    ? new Set(allTokenUsage.map(u => u.conversation_id)).size
                    : 0}
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-slate-800 rounded-lg p-5 mb-5 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-4">Token Usage Over Time</h3>
              {loadingTokens ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-slate-400 text-xs">Loading...</div>
                </div>
              ) : tokenUsageData.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-slate-500 text-xs">No token usage data available</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {tokenUsageData.map((item) => (
                    <div key={item.date} className="flex items-center gap-3">
                      <div className="w-24 text-[10px] text-slate-400 font-mono">
                        {item.date}
                      </div>
                      <div className="flex-1 bg-slate-900 rounded overflow-hidden h-8 relative">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                          style={{ width: `${(item.total_tokens / maxTokens) * 100}%` }}
                        >
                          {item.total_tokens > maxTokens * 0.1 && (
                            <span className="text-[10px] font-semibold text-white">
                              {item.total_tokens.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.total_tokens <= maxTokens * 0.1 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
                            {item.total_tokens.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="w-20 text-right text-[10px] text-slate-400">
                        ${item.cost.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Data Table */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-4">Detailed Usage</h3>
              {loadingTokens ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-400 text-xs">Loading...</div>
                </div>
              ) : allTokenUsage.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500 text-xs">No usage records found</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-2 text-slate-400 font-medium">Date</th>
                        <th className="text-left py-2 px-2 text-slate-400 font-medium">Model</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Input</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Output</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Total</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTokenUsage.slice(0, 50).map((usage) => (
                        <tr key={usage.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-2 px-2 text-slate-300 font-mono text-[10px]">
                            {new Date(usage.created_at * 1000).toLocaleDateString()} {new Date(usage.created_at * 1000).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-2 text-slate-400 text-[10px]">
                            {usage.model.includes('sonnet') ? '🎯 Sonnet' :
                             usage.model.includes('opus') ? '🌟 Opus' :
                             usage.model.includes('haiku') ? '⚡ Haiku' : usage.model}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {usage.input_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {usage.output_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right text-white font-medium">
                            {usage.total_tokens.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right text-indigo-400 font-medium">
                            ${usage.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allTokenUsage.length > 50 && (
                    <div className="text-center py-3 text-[10px] text-slate-500">
                      Showing 50 of {allTokenUsage.length} records
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete API Key Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleDeleteCancel}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Delete API Key?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to delete your OpenAI API key? You will need to add it again to use the chat.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
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
