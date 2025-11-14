import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Heart, Activity, Thermometer, Droplets, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HealthMetric {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
  icon: React.ComponentType<any>;
  normalRange: string;
}

const HealthMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useEffect(() => {
    fetchVitals();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchVitals();
    });

    const channel = supabase
      .channel('user_vitals_live_changes_health_metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_vitals_live',
        },
        () => {
          console.log('Real-time vitals update received in HealthMetrics');
          fetchVitals();
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVitals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: vitals, error } = await supabase
        .from('user_vitals_live')
        .select('systolic_bp, diastolic_bp, heart_rate, temperature_c, timestamp')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching vitals:', error);
        setLoading(false);
        return;
      }

      const metricsData: HealthMetric[] = [];

      if (vitals) {
        console.log('Vitals fetched for HealthMetrics:', vitals);

        if (vitals.systolic_bp && vitals.diastolic_bp) {
          const bpValue = `${vitals.systolic_bp}/${vitals.diastolic_bp}`;
          let bpStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.systolic_bp >= 180 || vitals.diastolic_bp >= 120) {
            bpStatus = 'critical';
          } else if (vitals.systolic_bp >= 140 || vitals.diastolic_bp >= 90) {
            bpStatus = 'warning';
          } else if (vitals.systolic_bp < 90 || vitals.diastolic_bp < 60) {
            bpStatus = 'warning';
          }

          metricsData.push({
            id: 'blood-pressure',
            name: 'Blood Pressure',
            value: bpValue,
            unit: 'mmHg',
            status: bpStatus,
            trend: 'stable',
            lastUpdated: new Date(vitals.timestamp),
            icon: Heart,
            normalRange: '90-120/60-80'
          });
        }

        if (vitals.heart_rate) {
          let hrStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.heart_rate > 100 || vitals.heart_rate < 60) {
            hrStatus = 'warning';
          }
          if (vitals.heart_rate > 120 || vitals.heart_rate < 50) {
            hrStatus = 'critical';
          }

          metricsData.push({
            id: 'heart-rate',
            name: 'Heart Rate',
            value: vitals.heart_rate.toString(),
            unit: 'BPM',
            status: hrStatus,
            trend: 'stable',
            lastUpdated: new Date(vitals.timestamp),
            icon: Activity,
            normalRange: '60-100'
          });
        }

        if (vitals.temperature_c) {
          const tempF = (vitals.temperature_c * 9/5) + 32;
          let tempStatus: 'normal' | 'warning' | 'critical' = 'normal';

          if (vitals.temperature_c >= 39.5) {
            tempStatus = 'critical';
          } else if (vitals.temperature_c >= 38.0 || vitals.temperature_c < 35.0) {
            tempStatus = 'warning';
          }

          metricsData.push({
            id: 'temperature',
            name: 'Body Temperature',
            value: tempF.toFixed(1),
            unit: '°F',
            status: tempStatus,
            trend: 'stable',
            lastUpdated: new Date(vitals.timestamp),
            icon: Thermometer,
            normalRange: '97.8-99.1'
          });
        }
      }

      if (metricsData.length === 0) {
        metricsData.push({
          id: 'blood-pressure',
          name: 'Blood Pressure',
          value: '--/--',
          unit: 'mmHg',
          status: 'normal',
          trend: 'stable',
          lastUpdated: new Date(),
          icon: Heart,
          normalRange: '90-120/60-80'
        });
        metricsData.push({
          id: 'heart-rate',
          name: 'Heart Rate',
          value: '--',
          unit: 'BPM',
          status: 'normal',
          trend: 'stable',
          lastUpdated: new Date(),
          icon: Activity,
          normalRange: '60-100'
        });
      }

      setMetrics(metricsData);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchVitals:', error);
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading health metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Health Metrics</h3>
          <button
            onClick={fetchVitals}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((metric) => (
            <div key={metric.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <metric.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{metric.name}</h4>
                    <p className="text-xs text-gray-500">Normal: {metric.normalRange}</p>
                  </div>
                </div>
                {getTrendIcon(metric.trend)}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                  <span className="text-sm text-gray-600 ml-1">{metric.unit}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last updated: {formatTimeAgo(metric.lastUpdated)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Heart className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Health Summary</h4>
              <p className="text-sm text-blue-800">
                {metrics.some(m => m.status === 'critical')
                  ? 'Critical vital signs detected. Please seek immediate medical attention.'
                  : metrics.some(m => m.status === 'warning')
                  ? 'Some vital signs require attention. Please monitor closely and consult your healthcare provider if symptoms persist.'
                  : 'Your vital signs are within normal ranges. Continue maintaining your current health routine.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMetrics;
