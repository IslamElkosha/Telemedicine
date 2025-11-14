import React, { useState } from 'react';
import { Bluetooth, Usb, Wifi, CheckCircle, AlertCircle, Loader, Shield, Zap, Battery } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'wifi';
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  battery?: number;
  signalStrength?: number;
  dataStreaming?: boolean;
  lastReading?: Date;
  category: 'vital-signs' | 'imaging' | 'audio' | 'visual';
  capabilities: string[];
}

const DeviceConnector: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Intraoral Dental Camera',
      type: 'usb',
      status: 'disconnected',
      signalStrength: 0,
      dataStreaming: false,
      category: 'visual',
      capabilities: ['Image Capture', 'Video Recording', 'LED Lighting']
    },
    {
      id: '2', 
      name: 'USB Ultrasound Probe',
      type: 'usb',
      status: 'connected',
      battery: 85,
      signalStrength: 95,
      dataStreaming: true,
      lastReading: new Date(),
      category: 'imaging',
      capabilities: ['B-Mode Imaging', 'Doppler', 'M-Mode', 'Color Flow']
    },
    {
      id: '3',
      name: 'Vital Signs Monitor',
      type: 'bluetooth',
      status: 'connected',
      battery: 92,
      signalStrength: 88,
      dataStreaming: true,
      lastReading: new Date(),
      category: 'vital-signs',
      capabilities: ['Blood Pressure', 'Heart Rate', 'Temperature', 'SpO2']
    },
    {
      id: '4',
      name: 'Digital Stethoscope',
      type: 'bluetooth',
      status: 'disconnected',
      battery: 67,
      signalStrength: 0,
      dataStreaming: false,
      category: 'audio',
      capabilities: ['Heart Sounds', 'Lung Sounds', 'Noise Cancellation', 'Recording']
    },
    {
      id: '5',
      name: 'ECG Device',
      type: 'wifi',
      status: 'error',
      signalStrength: 45,
      dataStreaming: false,
      category: 'vital-signs',
      capabilities: ['12-Lead ECG', 'Rhythm Analysis', 'Arrhythmia Detection']
    },
    {
      id: '6',
      name: 'Digital Otoscope',
      type: 'usb',
      status: 'disconnected',
      signalStrength: 0,
      dataStreaming: false,
      category: 'visual',
      capabilities: ['Ear Examination', 'Image Capture', 'Video Recording', 'Magnification']
    },
    {
      id: '7',
      name: 'Wireless Stethoscope',
      type: 'bluetooth',
      status: 'disconnected',
      battery: 78,
      signalStrength: 0,
      dataStreaming: false,
      category: 'audio',
      capabilities: ['Wireless Audio', 'Digital Filtering', 'Sound Analysis', 'Recording']
    },
    {
      id: '8',
      name: 'Portable Ultrasound',
      type: 'wifi',
      status: 'disconnected',
      signalStrength: 0,
      dataStreaming: false,
      category: 'imaging',
      capabilities: ['Portable Imaging', 'Multiple Probes', 'DICOM Export', 'Cloud Storage']
    }
  ]);
  const [streamingData, setStreamingData] = useState<{[key: string]: any}>({});
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const connectDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    addToLog(`Attempting to connect ${device.name}...`);
    
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status: 'connecting', dataStreaming: false }
        : device
    ));

    // Simulate device discovery and connection process
    setTimeout(() => {
      const success = Math.random() > 0.1;
      const device = devices.find(d => d.id === deviceId);
      
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { 
              ...device, 
              status: success ? 'connected' : 'error',
              signalStrength: success ? Math.floor(Math.random() * 40) + 60 : 0,
              lastReading: success ? new Date() : undefined
            }
          : device
      ));
      
      if (success) {
        addToLog(`✓ ${device?.name} connected successfully`);
        // Auto-start streaming for certain devices
        if (device?.category === 'vital-signs') {
          setTimeout(() => startDataStreaming(deviceId), 1000);
        }
      } else {
        addToLog(`✗ Failed to connect ${device?.name}`);
      }
      
      // Start data streaming if connection successful
      if (success) {
        startDataStreaming(deviceId);
      }
    }, 2000);
  };

  const disconnectDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    addToLog(`Disconnecting ${device?.name}...`);
    
    stopDataStreaming(deviceId);
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status: 'disconnected', signalStrength: 0, dataStreaming: false }
        : device
    ));
    
    addToLog(`✓ ${device?.name} disconnected`);
  };

  const startDataStreaming = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    addToLog(`Starting data stream for ${device?.name}...`);
    
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, dataStreaming: true, lastReading: new Date() }
        : device
    ));
    
    // Simulate real-time data streaming
    const interval = setInterval(() => {
      const device = devices.find(d => d.id === deviceId);
      if (device && device.status === 'connected') {
        setStreamingData(prev => ({
          ...prev,
          [deviceId]: {
            timestamp: new Date(),
            data: generateMockData(device.name),
            encrypted: encryptionEnabled
          }
        }));
        
        setDevices(prev => prev.map(device => 
          device.id === deviceId 
            ? { ...device, lastReading: new Date() }
            : device
        ));
      } else {
        clearInterval(interval);
      }
    }, 1000);
    
    // Store interval for cleanup
    (window as any)[`stream_${deviceId}`] = interval;
  };

  const stopDataStreaming = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device?.dataStreaming) {
      addToLog(`Stopping data stream for ${device.name}...`);
    }
    
    const interval = (window as any)[`stream_${deviceId}`];
    if (interval) {
      clearInterval(interval);
      delete (window as any)[`stream_${deviceId}`];
    }
    
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, dataStreaming: false }
        : device
    ));
    
    setStreamingData(prev => {
      const newData = { ...prev };
      delete newData[deviceId];
      return newData;
    });
  };

  const connectAllDevices = () => {
    const disconnectedDevices = devices.filter(d => d.status === 'disconnected');
    addToLog(`Connecting ${disconnectedDevices.length} devices...`);
    
    disconnectedDevices.forEach((device, index) => {
      setTimeout(() => connectDevice(device.id), index * 500);
    });
  };

  const disconnectAllDevices = () => {
    const connectedDevices = devices.filter(d => d.status === 'connected');
    addToLog(`Disconnecting ${connectedDevices.length} devices...`);
    
    connectedDevices.forEach(device => {
      disconnectDevice(device.id);
    });
  };

  const filteredDevices = devices.filter(device => {
    if (selectedCategory === 'all') return true;
    return device.category === selectedCategory;
  });

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'vital-signs':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'imaging':
        return <Activity className="h-5 w-5 text-blue-600" />;
      case 'audio':
        return <Zap className="h-5 w-5 text-green-600" />;
      case 'visual':
        return <Eye className="h-5 w-5 text-purple-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const generateMockData = (deviceName: string) => {
    switch (deviceName) {
      case 'Digital Stethoscope':
      case 'Wireless Stethoscope':
        return {
          audioLevel: Math.floor(Math.random() * 100),
          heartRate: Math.floor(Math.random() * 40) + 60,
          quality: 'High',
          audioWaveform: Array.from({length: 50}, () => Math.random() * 100)
        };
      case 'USB Ultrasound Probe':
      case 'Portable Ultrasound':
        return {
          imageData: 'base64_encoded_ultrasound_frame',
          depth: Math.floor(Math.random() * 10) + 5,
          frequency: '5.0 MHz',
          gain: Math.floor(Math.random() * 100),
          mode: 'B-Mode'
        };
      case 'Intraoral Dental Camera':
        return {
          imageData: 'base64_encoded_dental_image',
          resolution: '1920x1080',
          zoom: Math.floor(Math.random() * 5) + 1
        };
      case 'Digital Otoscope':
        return {
          imageData: 'base64_encoded_ear_image',
          resolution: '1280x720',
          magnification: Math.floor(Math.random() * 10) + 5,
          lighting: 'LED White',
          focus: 'Auto'
        };
      case 'ECG Device':
        return {
          waveform: Array.from({length: 10}, () => Math.random() * 100),
          heartRate: Math.floor(Math.random() * 40) + 60,
          rhythm: 'Normal Sinus'
        };
      default:
        return { value: Math.random() * 100 };
    }
  };

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getConnectionIcon = (type: Device['type']) => {
    switch (type) {
      case 'bluetooth':
        return <Bluetooth className="h-5 w-5 text-blue-600" />;
      case 'usb':
        return <Usb className="h-5 w-5 text-green-600" />;
      case 'wifi':
        return <Wifi className="h-5 w-5 text-purple-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Device Connections</h3>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={connectAllDevices}
                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Connect All</span>
              </button>
              <button
                onClick={disconnectAllDevices}
                className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Disconnect All</span>
              </button>
            </div>
            <Shield className={`h-4 w-4 ${encryptionEnabled ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {encryptionEnabled ? 'Encrypted' : 'Not Encrypted'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Connect medical devices to start collecting patient data
        </p>
        
        {/* Device Category Filter */}
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All Devices' },
              { key: 'vital-signs', label: 'Vital Signs' },
              { key: 'imaging', label: 'Imaging' },
              { key: 'audio', label: 'Audio' },
              { key: 'visual', label: 'Visual' }
            ].map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === category.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Connection Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => d.status === 'connected').length}
            </div>
            <div className="text-xs text-green-700">Connected</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {devices.filter(d => d.dataStreaming).length}
            </div>
            <div className="text-xs text-blue-700">Streaming</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {devices.filter(d => d.status === 'connecting').length}
            </div>
            <div className="text-xs text-yellow-700">Connecting</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {devices.filter(d => d.status === 'error').length}
            </div>
            <div className="text-xs text-red-700">Error</div>
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getConnectionIcon(device.type)}
                  {getDeviceIcon(device.category)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{device.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="text-sm text-gray-600 capitalize">{device.type}</span>
                    <span>•</span>
                    <span className="capitalize">{device.category.replace('-', ' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    {device.battery && (
                      <span className={`text-xs flex items-center space-x-1 ${
                        device.battery > 20 ? 'text-gray-500' : 'text-red-500'
                      }`}>
                        <Battery className="h-3 w-3" />
                        <span>{device.battery}%</span>
                      </span>
                    )}
                    {device.signalStrength !== undefined && device.signalStrength > 0 && (
                      <span className="text-xs text-gray-500 flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>{device.signalStrength}%</span>
                      </span>
                    )}
                    {device.dataStreaming && (
                      <span className="text-xs text-green-600 flex items-center space-x-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Streaming</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Device Capabilities */}
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {device.capabilities.slice(0, 3).map((capability, index) => (
                        <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {capability}
                        </span>
                      ))}
                      {device.capabilities.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{device.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(device.status)}
                <span className={`text-sm font-medium ${
                  device.status === 'connected' ? 'text-green-600' :
                  device.status === 'connecting' ? 'text-blue-600' :
                  device.status === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {device.status}
                </span>
                
                {device.status === 'disconnected' && (
                  <button
                    onClick={() => connectDevice(device.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                  >
                    <Bluetooth className="h-4 w-4" />
                    Connect
                  </button>
                )}
                
                {device.status === 'connected' && (
                  <div className="flex space-x-2">
                    {!device.dataStreaming ? (
                      <button
                        onClick={() => startDataStreaming(device.id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <Activity className="h-4 w-4" />
                        Start Stream
                      </button>
                    ) : (
                      <button
                        onClick={() => stopDataStreaming(device.id)}
                        className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors flex items-center space-x-1"
                      >
                        <WifiOff className="h-4 w-4" />
                        Stop Stream
                      </button>
                    )}
                    <button
                      onClick={() => disconnectDevice(device.id)}
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center space-x-1"
                    >
                      <X className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                )}
                
                {device.status === 'error' && (
                  <button
                    onClick={() => connectDevice(device.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center space-x-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Real-time Data Display */}
        {Object.keys(streamingData).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span>Live Data Stream</span>
            </h4>
            <div className="space-y-2">
              {Object.entries(streamingData).map(([deviceId, data]) => {
                const device = devices.find(d => d.id === deviceId);
                return (
                  <div key={deviceId} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{device?.name}</span>
                      <span className="text-xs text-gray-500">
                        {data.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(data.data, null, 2)}
                      </pre>
                    </div>
                    {data.encrypted && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Shield className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">End-to-end encrypted</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Connection Log */}
        {connectionLog.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span>Connection Log</span>
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {connectionLog.map((log, index) => (
                <div key={index} className="text-xs text-gray-600 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Device Integration Instructions</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Bluetooth devices: Ensure Bluetooth is enabled on your tablet</p>
            <p>• USB devices: Connect directly to tablet USB port</p>
            <p>• WiFi devices: Connect to same network as tablet</p>
            <p>• All data streams are encrypted for patient privacy</p>
            <p>• For troubleshooting, contact technical support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceConnector;