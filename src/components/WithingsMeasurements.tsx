import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, Activity, Droplet, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Measurement {
  id: string;
  measurement_type: string;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  measured_at: string;
  device_model: string;
}

interface WithingsMeasurementsProps {
  userId?: string;
  showHeader?: boolean;
  maxItems?: number;
}

const WithingsMeasurements: React.FC<WithingsMeasurementsProps> = ({
  userId,
  showHeader = true,
  maxItems = 10,
}) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadMeasurements();
  }, [userId, filter]);

  const loadMeasurements = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const targetUserId = userId || session.user.id;

      let query = supabase
        .from('withings_measurements')
        .select('*')
        .eq('user_id', targetUserId)
        .order('measured_at', { ascending: false })
        .limit(maxItems);

      if (filter !== 'all') {
        query = query.eq('measurement_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading measurements:', error);
        return;
      }

      setMeasurements(data || []);
    } catch (err) {
      console.error('Error loading measurements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMeasurementIcon = (type: string) => {
    switch (type) {
      case 'blood_pressure':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'temperature':
        return <Thermometer className="h-5 w-5 text-orange-600" />;
      case 'heart_rate':
        return <Activity className="h-5 w-5 text-pink-600" />;
      case 'spo2':
        return <Droplet className="h-5 w-5 text-blue-600" />;
      case 'weight':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatMeasurement = (measurement: Measurement) => {
    switch (measurement.measurement_type) {
      case 'blood_pressure':
        return `${measurement.systolic}/${measurement.diastolic} mmHg`;
      case 'temperature':
        return `${measurement.temperature?.toFixed(1)}°C`;
      case 'heart_rate':
        return `${measurement.heart_rate} bpm`;
      case 'spo2':
        return `${measurement.spo2}%`;
      case 'weight':
        return `${measurement.weight?.toFixed(1)} kg`;
      default:
        return 'N/A';
    }
  };

  const getMeasurementLabel = (type: string) => {
    switch (type) {
      case 'blood_pressure':
        return 'Blood Pressure';
      case 'temperature':
        return 'Body Temperature';
      case 'heart_rate':
        return 'Heart Rate';
      case 'spo2':
        return 'Blood Oxygen';
      case 'weight':
        return 'Weight';
      default:
        return type;
    }
  };

  const getStatusColor = (measurement: Measurement) => {
    switch (measurement.measurement_type) {
      case 'blood_pressure':
        if (!measurement.systolic || !measurement.diastolic) return 'bg-gray-50';
        if (measurement.systolic > 140 || measurement.diastolic > 90) return 'bg-red-50 border-red-200';
        if (measurement.systolic < 90 || measurement.diastolic < 60) return 'bg-yellow-50 border-yellow-200';
        return 'bg-green-50 border-green-200';
      case 'temperature':
        if (!measurement.temperature) return 'bg-gray-50';
        if (measurement.temperature > 37.5) return 'bg-red-50 border-red-200';
        if (measurement.temperature < 36.1) return 'bg-blue-50 border-blue-200';
        return 'bg-green-50 border-green-200';
      case 'heart_rate':
        if (!measurement.heart_rate) return 'bg-gray-50';
        if (measurement.heart_rate > 100 || measurement.heart_rate < 60) return 'bg-yellow-50 border-yellow-200';
        return 'bg-green-50 border-green-200';
      case 'spo2':
        if (!measurement.spo2) return 'bg-gray-50';
        if (measurement.spo2 < 95) return 'bg-red-50 border-red-200';
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 text-blue-600 animate-pulse" />
          <span className="ml-2 text-gray-600">Loading measurements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {showHeader && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Measurements</h3>
          <div className="flex space-x-2 overflow-x-auto">
            {['all', 'blood_pressure', 'temperature', 'heart_rate', 'spo2', 'weight'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All' : getMeasurementLabel(type)}
              </button>
            ))}
          </div>
        </div>
      )}

      {measurements.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No measurements yet</p>
          <p className="text-sm text-gray-400 mt-1">Sync your Withings devices to see measurements here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {measurements.map((measurement) => (
            <div
              key={measurement.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getStatusColor(measurement)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getMeasurementIcon(measurement.measurement_type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getMeasurementLabel(measurement.measurement_type)}
                    </h4>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMeasurement(measurement)}
                    </p>
                    {measurement.measurement_type === 'blood_pressure' && measurement.heart_rate && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Activity className="h-3 w-3 inline mr-1" />
                        Pulse: {measurement.heart_rate} bpm
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(measurement.measured_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Device: {measurement.device_model}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WithingsMeasurements;
