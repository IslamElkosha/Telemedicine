import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Edit, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Loader,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface DiagnosticResult {
  status: 'loading' | 'pass' | 'fail';
  data?: any;
  error?: string;
}

const DiagnosticsPage: React.FC = () => {
  const [healthCheck, setHealthCheck] = useState<DiagnosticResult>({ status: 'loading' });
  const [readyCheck, setReadyCheck] = useState<DiagnosticResult>({ status: 'loading' });
  const [testWrite, setTestWrite] = useState<DiagnosticResult>({ status: 'loading' });
  const [dataSummary, setDataSummary] = useState<DiagnosticResult>({ status: 'loading' });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [testNote, setTestNote] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://comprehensive-teleme-pbkl.bolt.host/api'
    : 'http://localhost:3001/api';

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // Reset all states
    setHealthCheck({ status: 'loading' });
    setReadyCheck({ status: 'loading' });
    setTestWrite({ status: 'loading' });
    setDataSummary({ status: 'loading' });

    // Run health check
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      setHealthCheck({ status: 'pass', data });
    } catch (error) {
      setHealthCheck({ status: 'fail', error: error instanceof Error ? error.message : 'Network error' });
    }

    // Run ready check
    try {
      const response = await fetch(`${API_BASE}/ready`);
      const data = await response.json();
      setReadyCheck({ status: response.ok ? 'pass' : 'fail', data });
    } catch (error) {
      setReadyCheck({ status: 'fail', error: error instanceof Error ? error.message : 'Network error' });
    }

    // Initialize test write as ready (not executed yet)
    setTestWrite({ status: 'pass', data: { message: 'Ready to test' } });

    // Run data summary
    try {
      const response = await fetch(`${API_BASE}/v1/debug/summary`);
      const data = await response.json();
      setDataSummary({ status: 'pass', data });
    } catch (error) {
      setDataSummary({ status: 'fail', error: error instanceof Error ? error.message : 'Network error' });
    }
  };

  const handleTestWrite = async () => {
    setIsWriting(true);
    try {
      const response = await fetch(`${API_BASE}/v1/debug/test-write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: testNote || 'Test write from diagnostics' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestWrite({ status: 'pass', data: { ...data, message: 'Saved ✓' } });
        setTestNote('');
      } else {
        setTestWrite({ status: 'fail', error: data.error?.message || 'Write failed' });
      }
    } catch (error) {
      setTestWrite({ status: 'fail', error: error instanceof Error ? error.message : 'Network error' });
    } finally {
      setIsWriting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'loading':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">LOADING</span>;
      case 'pass':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">PASS</span>;
      case 'fail':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">FAIL</span>;
      default:
        return null;
    }
  };

  const DiagnosticCard = ({ 
    title, 
    icon: Icon, 
    result, 
    cardId, 
    children 
  }: { 
    title: string; 
    icon: React.ComponentType<any>; 
    result: DiagnosticResult; 
    cardId: string;
    children?: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Icon className="h-6 w-6 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(result.status)}
          {getStatusChip(result.status)}
        </div>
      </div>

      {children}

      {result.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{result.error}</p>
        </div>
      )}

      {(result.data || result.error) && (
        <div className="mt-4">
          <button
            onClick={() => setExpandedCard(expandedCard === cardId ? null : cardId)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {expandedCard === cardId ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Show raw JSON</span>
          </button>
          
          {expandedCard === cardId && (
            <details open className="mt-2">
              <summary className="sr-only">Raw JSON Response</summary>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                {JSON.stringify(result.data || { error: result.error }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">System Diagnostics</h1>
                <p className="text-sm text-gray-600">Health checks and system status</p>
              </div>
            </div>
            <button
              onClick={runDiagnostics}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh All</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Health */}
          <DiagnosticCard
            title="API Health"
            icon={Activity}
            result={healthCheck}
            cardId="health"
          >
            {healthCheck.data && (
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Uptime:</span> {healthCheck.data.uptimeSec}s</p>
                <p><span className="font-medium">Environment:</span> {healthCheck.data.env}</p>
              </div>
            )}
          </DiagnosticCard>

          {/* DB Ready */}
          <DiagnosticCard
            title="Database Ready"
            icon={Database}
            result={readyCheck}
            cardId="ready"
          >
            {readyCheck.data && (
              <div className="text-sm text-gray-600">
                <p><span className="font-medium">Status:</span> {readyCheck.data.ready ? 'Connected' : 'Disconnected'}</p>
              </div>
            )}
          </DiagnosticCard>

          {/* Test Write */}
          <DiagnosticCard
            title="Test Write"
            icon={Edit}
            result={testWrite}
            cardId="write"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Note (optional)
                </label>
                <input
                  type="text"
                  value={testNote}
                  onChange={(e) => setTestNote(e.target.value)}
                  placeholder="Enter a test note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                onClick={handleTestWrite}
                disabled={isWriting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isWriting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    <span>Test Write</span>
                  </>
                )}
              </button>
              {testWrite.data?.message && (
                <p className="text-sm text-green-600 font-medium">{testWrite.data.message}</p>
              )}
            </div>
          </DiagnosticCard>

          {/* Data Summary */}
          <DiagnosticCard
            title="Data Summary"
            icon={BarChart3}
            result={dataSummary}
            cardId="summary"
          >
            {dataSummary.data?.counts && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Users</p>
                  <p className="text-xl font-bold text-blue-600">{dataSummary.data.counts.users}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Appointments</p>
                  <p className="text-xl font-bold text-green-600">{dataSummary.data.counts.appointments}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Sessions</p>
                  <p className="text-xl font-bold text-purple-600">{dataSummary.data.counts.sessions}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Readings</p>
                  <p className="text-xl font-bold text-orange-600">{dataSummary.data.counts.readings}</p>
                </div>
              </div>
            )}
          </DiagnosticCard>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">API Health</h4>
              <p>Checks if the API server is running and responsive. No database access required.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Database Ready</h4>
              <p>Tests database connectivity by executing a simple query.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Test Write</h4>
              <p>Performs a test write operation to verify database write permissions.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Summary</h4>
              <p>Shows record counts for key tables to verify data integrity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPage;