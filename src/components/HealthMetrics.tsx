import React from 'react';
import { TrendingUp, TrendingDown, Minus, Heart, Activity, Thermometer, Droplets } from 'lucide-react';

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
  const metrics: HealthMetric[] = [
    {
      id: 'blood-pressure',
      name: 'Blood Pressure',
      value: '125/82',
      unit: 'mmHg',
      status: 'normal',
      trend: 'stable',
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: Heart,
      normalRange: '90-120/60-80'
    },
    {
      id: 'heart-rate',
      name: 'Heart Rate',
      value: '72',
      unit: 'BPM',
      status: 'normal',
      trend: 'down',
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      icon: Activity,
      normalRange: '60-100'
    },
    {
      id: 'temperature',
      name: 'Body Temperature',
      value: '98.6',
      unit: '°F',
      status: 'normal',
      trend: 'stable',
      lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      icon: Thermometer,
      normalRange: '97.8-99.1'
    },
    {
      id: 'oxygen-saturation',
      name: 'Oxygen Saturation',
      value: '98',
      unit: '%',
      status: 'normal',
      trend: 'up',
      lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      icon: Droplets,
      normalRange: '95-100'
    }
  ];

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Health Metrics</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View History
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
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Details
                </button>
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
                Your vital signs are within normal ranges. Continue maintaining your current health routine. 
                Your next check-up is scheduled for next week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMetrics;