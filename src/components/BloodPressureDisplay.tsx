import { useEffect, useState } from 'react';
import { Heart, Activity, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getValidSession } from '../utils/authHelper';

interface BPData {
  systolic: number;
  diastolic: number;
  heart_rate: number;
  timestamp: number;
  connectionStatus: 'Connected' | 'Disconnected';
  success: boolean;
}

interface ErrorResponse {
  error: string;
  connectionStatus: 'Disconnected';
  needsConnection?: boolean;
  needsReconnect?: boolean;
}

export default function BloodPressureDisplay() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BPData | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);

  useEffect(() => {
    const fetchLatestBP = async () => {
      try {
        setLoading(true);
        setError(null);
        setNeedsConnection(false);

        const session = await getValidSession(false);

        if (!session) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const functionUrl = `${supabaseUrl}/functions/v1/fetch-latest-bp-reading`;

        const response = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          const errorData = result as ErrorResponse;

          if (errorData.needsConnection || errorData.needsReconnect) {
            setNeedsConnection(true);
            setError('Device not connected. Please connect your Withings device.');
          } else {
            setError(errorData.error || 'Failed to fetch blood pressure data');
          }
          setLoading(false);
          return;
        }

        if (result.success && result.connectionStatus === 'Connected') {
          setData(result);
        } else {
          setError('No blood pressure readings found');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching BP data:', err);
        setError('Failed to fetch blood pressure data');
        setLoading(false);
      }
    };

    fetchLatestBP();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading blood pressure data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {needsConnection ? 'Device Not Connected' : 'Error'}
            </h3>
            <p className="text-gray-600">{error}</p>
            {needsConnection && (
              <a
                href="/devices"
                className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Device
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No Data</p>
          <p className="text-sm text-gray-500 mt-1">No blood pressure readings available</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(data.timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic >= 140 || diastolic >= 90) {
      return { label: 'High', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (systolic >= 130 || diastolic >= 80) {
      return { label: 'Elevated', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else if (systolic >= 120 || diastolic >= 80) {
      return { label: 'Normal', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    } else {
      return { label: 'Optimal', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  const status = getBPStatus(data.systolic, data.diastolic);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Latest Blood Pressure</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start space-x-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Heart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Blood Pressure</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.systolic}/{data.diastolic}
            </p>
            <p className="text-xs text-gray-500 mt-1">mmHg</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-3 bg-red-50 rounded-lg">
            <Activity className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Heart Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.heart_rate}
            </p>
            <p className="text-xs text-gray-500 mt-1">bpm</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Measured</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formattedDate}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Connection Status</span>
          <span className="flex items-center text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
            {data.connectionStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
