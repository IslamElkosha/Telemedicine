import React, { useState, useEffect } from 'react';
import { Heart, Activity, Thermometer, Zap, Bluetooth, WifiOff } from 'lucide-react';

interface DeviceReading {
  deviceType: string;
  reading: string;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
  connected: boolean;
}

const DeviceReadings: React.FC = () => {
  const [readings, setReadings] = useState<DeviceReading[]>([
    {
      deviceType: 'Blood Pressure Monitor',
      reading: '120/80',
      unit: 'mmHg',
      timestamp: new Date(),
      status: 'normal',
      icon: Heart,
      connected: true
    },
    {
      deviceType: 'Pulse Oximeter',
      reading: '98',
      unit: '%',
      timestamp: new Date(),
      status: 'normal',
      icon: Activity,
      connected: true
    },
    {
      deviceType: 'Digital Thermometer',
      reading: '98.6',
      unit: '°F',
      timestamp: new Date(),
      status: 'normal',
      icon: Thermometer,
      connected: false
    },
    {
      deviceType: 'Heart Rate Monitor',
      reading: '72',
      unit: 'BPM',
      timestamp: new Date(),
      status: 'normal',
      icon: Heart,
      connected: true
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setReadings(prev => prev.map(reading => {
        if (!reading.connected) return reading;
        
        let newReading = reading.reading;
        let newStatus = reading.status;
        
        // Simulate realistic variations
        switch (reading.deviceType) {
          case 'Blood Pressure Monitor':
            const [systolic, diastolic] = reading.reading.split('/').map(Number);
            const newSystolic = Math.max(100, Math.min(140, systolic + (Math.random() - 0.5) * 10));
            const newDiastolic = Math.max(60, Math.min(90, diastolic + (Math.random() - 0.5) * 5));
            newReading = `${Math.round(newSystolic)}/${Math.round(newDiastolic)}`;
            newStatus = newSystolic > 130 || newDiastolic > 85 ? 'warning' : 'normal';
            break;
          case 'Pulse Oximeter':
            const currentO2 = Number(reading.reading);
            newReading = Math.max(90, Math.min(100, currentO2 + (Math.random() - 0.5) * 2)).toFixed(0);
            newStatus = Number(newReading) < 95 ? 'warning' : 'normal';
            break;
          case 'Heart Rate Monitor':
            const currentHR = Number(reading.reading);
            newReading = Math.max(60, Math.min(100, currentHR + (Math.random() - 0.5) * 8)).toFixed(0);
            newStatus = Number(newReading) > 90 || Number(newReading) < 65 ? 'warning' : 'normal';
            break;
          default:
            break;
        }
        
        return {
          ...reading,
          reading: newReading,
          status: newStatus,
          timestamp: new Date()
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Device Readings</h3>
          <div className="flex items-center space-x-2">
            <Bluetooth className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">
              {readings.filter(r => r.connected).length}/{readings.length} Connected
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {readings.map((reading, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <reading.icon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {reading.deviceType}
                  </span>
                </div>
                {reading.connected ? (
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              <div className="mb-3">
                <span className="text-2xl font-bold text-gray-900">
                  {reading.connected ? reading.reading : '--'}
                </span>
                <span className="text-sm text-gray-600 ml-1">{reading.unit}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  !reading.connected ? 'bg-gray-100 text-gray-600' :
                  reading.status === 'normal' ? 'bg-green-100 text-green-800' :
                  reading.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {!reading.connected ? 'Disconnected' : reading.status}
                </span>
                <span className="text-xs text-gray-500">
                  {reading.connected ? reading.timestamp.toLocaleTimeString() : 'No data'}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {readings.some(r => !r.connected) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Some devices are disconnected. Please check connections and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceReadings;