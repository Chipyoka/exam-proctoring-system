import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddConfig = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const [endpoint, setEndpoint] = useState('https://sms-api.example.com/student');
  const [apiKey, setApiKey] = useState('');

  // Preset configuration
  const presetConfig = {
    contentType: 'application/json',
    timeout: 30000, // ms
    method: 'GET',
    sslVerify: true,
  };

  // Fetch existing config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const configRef = doc(firestore, 'configs', 'sms_config');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          const data = configSnap.data();
          setEndpoint(data.endpoint || '');
          setApiKey(data.apiKey || '');
          setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : null);
        }
      } catch (err) {
        console.error('Error fetching config:', err);
        setMessage({ type: 'error', text: 'Failed to load existing configuration.' });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

//   Test connection
const handleTestConnection = async () => {
  setMessage({});
  if (!endpoint || !apiKey) {
    setMessage({ type: 'error', text: 'Endpoint and API Key are required for testing.' });
    return;
  }

  setTestLoading(true);

  const presetConfig = {
    method: 'GET',
    contentType: 'application/json',
    timeout: 30000, // 30 seconds
  };

  try {
    const healthUrl = `${endpoint}/`; // Root path for health check

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), presetConfig.timeout);

    const response = await fetch(healthUrl, {
      method: presetConfig.method,
      headers: {
        'Content-Type': presetConfig.contentType,
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.status !== 'ok') {
      throw new Error('Health check failed');
    }

    setMessage({ type: 'success', text: 'Connection successful! API key and endpoint are valid.' });

  } catch (err) {
    console.error('Test connection failed:', err);
    setMessage({ type: 'error', text: `Test failed: ${err.message}` });
  } finally {
    setTestLoading(false);
  }
};


  // Save Configuration (Add/Edit)
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!endpoint || !apiKey) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setLoading(true);
    try {
      const configRef = doc(firestore, 'configs', 'sms_config');
      const timestamp = new Date().toISOString();
      await setDoc(configRef, {
        endpoint,
        apiKey,
        ...presetConfig,
        updatedAt: timestamp,
      });

      setLastUpdated(new Date(timestamp));
      setMessage({ type: 'success', text: 'Configuration saved successfully.' });
    } catch (err) {
      console.error('Save config failed:', err);
      setMessage({ type: 'error', text: 'Failed to save configuration.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-[500px]">
      {message.text && (
        <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
          <p
            className={
              message.type === 'warning'
                ? 'p-2 bg-yellow-50 text-yellow-500'
                : message.type === 'info'
                ? 'p-2 bg-blue-100 text-blue-500'
                : message.type === 'success'
                ? 'p-2 bg-green-100 text-green-500'
                : message.type === 'error'
                ? 'p-2 bg-red-100 text-red-500'
                : 'text-white'
            }
            title={message.type}
          >
            {message.text}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        Fill the form below <strong>with accurate information</strong> to configure SMS integration
      </p>

      <form onSubmit={handleSaveConfig}>
        {/* Endpoint URL */}
        <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="url">URL</label>

            <input 
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://sms-api.example.com/student" 
            name="url"
            className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
        </div>
        <p className="text-xs text-gray-400 mt-1">The secure API endpoint to query student data</p>

        <hr className="my-6 text-gray-200" />

        {/* API Key */}

        <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="api">Key</label>

            <input 
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="••••••••••••••••••••" 
            name="api"
            className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
        </div>
        <p className="text-xs text-gray-400 mt-1">Your secure API key for authentication</p>


        <div className="flex gap-4 mt-4">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-x-2 btn-primary-outlined-sm disabled:opacity-50"
            onClick={handleTestConnection}
            disabled={testLoading}
          >
            {testLoading && <div className="btn-loader"></div>}
            Test Connection
          </button>

          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-x-2 btn-primary-sm disabled:opacity-50"
            disabled={loading}
          >
            {loading && <div className="btn-loader"></div>}
            Save Configuration
          </button>
        </div>

        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-3 text-right">
            Last Updated: {lastUpdated.toLocaleString()}
          </p>
        )}
      </form>
    </div>
  );
};

export default AddConfig;
