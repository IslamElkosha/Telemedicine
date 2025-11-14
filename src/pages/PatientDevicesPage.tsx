import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import WithingsConnector from '../components/WithingsConnector';
import WithingsMeasurements from '../components/WithingsMeasurements';
import { 
  Activity, 
  Bluetooth, 
  Usb, 
  Wifi, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  X,
  Heart,
  Eye,
  Volume2,
  Monitor,
  Play,
  Square,
  Save,
  Download,
  ZoomIn,
  ZoomOut,
  Settings,
  Battery,
  Signal,
  Shield,
  FileText,
  Camera,
  Mic,
  Image as ImageIcon
} from 'lucide-react';

interface MedicalDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'wifi';
  category: 'vital-signs' | 'imaging' | 'audio' | 'visual';
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  battery?: number;
  signalStrength?: number;
  isStreaming: boolean;
  lastReading?: Date;
  capabilities: string[];
  controls: any;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

const PatientDevicesPage: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<MedicalDevice[]>([
    {
      id: 'stethoscope-1',
      name: 'Digital Stethoscope Pro',
      type: 'bluetooth',
      category: 'audio',
      status: 'disconnected',
      battery: 85,
      signalStrength: 0,
      isStreaming: false,
      capabilities: ['Heart Sounds', 'Lung Sounds', 'Noise Cancellation', 'Audio Recording', 'Real-time Analysis'],
      controls: {
        volume: 75,
        noiseReduction: true,
        recording: false,
        filter: 'normal',
        amplification: 50
      },
      manufacturer: 'MedTech Solutions',
      model: 'StethoScope Pro X1',
      serialNumber: 'ST-2024-001'
    },
    {
      id: 'otoscope-1',
      name: 'Digital Otoscope HD',
      type: 'usb',
      category: 'visual',
      status: 'disconnected',
      signalStrength: 0,
      isStreaming: false,
      capabilities: ['Ear Examination', 'HD Image Capture', 'Video Recording', 'LED Lighting', 'Magnification'],
      controls: {
        zoom: 1,
        lighting: true,
        recording: false,
        focus: 'auto',
        brightness: 80
      },
      manufacturer: 'VisionMed',
      model: 'OtoScope HD-2000',
      serialNumber: 'OT-2024-002'
    },
    {
      id: 'ultrasound-1',
      name: 'Portable Ultrasound Scanner',
      type: 'wifi',
      category: 'imaging',
      status: 'disconnected',
      signalStrength: 0,
      isStreaming: false,
      capabilities: ['B-Mode Imaging', 'Doppler', 'M-Mode', 'Color Flow', 'Image Capture', 'DICOM Export'],
      controls: {
        mode: 'B-Mode',
        depth: 10,
        gain: 50,
        frequency: 5.0,
        tgc: 50
      },
      manufacturer: 'UltraSound Systems',
      model: 'PortaScan Pro',
      serialNumber: 'US-2024-003'
    }
  ]);

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [deviceData, setDeviceData] = useState<{[key: string]: any}>({});
  const [savingData, setSavingData] = useState<{[key: string]: boolean}>({});

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const connectDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    addToLog(`Attempting to connect ${device.name}...`);
    
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { ...d, status: 'connecting', isStreaming: false }
        : d
    ));

    // Simulate device connection process
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      
      setDevices(prev => prev.map(d => 
        d.id === deviceId 
          ? { 
              ...d, 
              status: success ? 'connected' : 'error',
              signalStrength: success ? Math.floor(Math.random() * 40) + 60 : 0,
              lastReading: success ? new Date() : undefined
            }
          : d
      ));
      
      if (success) {
        addToLog(`✓ ${device.name} connected successfully`);
        startDataStreaming(deviceId);
      } else {
        addToLog(`✗ Failed to connect ${device.name}`);
      }
    }, 2000);
  };

  const disconnectDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    addToLog(`Disconnecting ${device.name}...`);
    
    stopDataStreaming(deviceId);
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { ...d, status: 'disconnected', signalStrength: 0, isStreaming: false }
        : d
    ));
    
    addToLog(`✓ ${device.name} disconnected`);
  };

  const startDataStreaming = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    addToLog(`Starting data stream for ${device.name}...`);
    
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { ...d, isStreaming: true, lastReading: new Date() }
        : d
    ));
    
    // Simulate real-time data streaming
    const interval = setInterval(() => {
      const currentDevice = devices.find(d => d.id === deviceId);
      if (currentDevice && currentDevice.status === 'connected') {
        setDeviceData(prev => ({
          ...prev,
          [deviceId]: {
            timestamp: new Date(),
            data: generateMockData(deviceId),
            encrypted: true
          }
        }));
        
        setDevices(prev => prev.map(d => 
          d.id === deviceId 
            ? { ...d, lastReading: new Date() }
            : d
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
    if (device?.isStreaming) {
      addToLog(`Stopping data stream for ${device.name}...`);
    }
    
    const interval = (window as any)[`stream_${deviceId}`];
    if (interval) {
      clearInterval(interval);
      delete (window as any)[`stream_${deviceId}`];
    }
    
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { ...d, isStreaming: false }
        : d
    ));
    
    setDeviceData(prev => {
      const newData = { ...prev };
      delete newData[deviceId];
      return newData;
    });
  };

  const generateMockData = (deviceId: string) => {
    switch (deviceId) {
      case 'stethoscope-1':
        return {
          heartRate: Math.floor(Math.random() * 40) + 60,
          audioLevel: Math.floor(Math.random() * 100),
          soundType: Math.random() > 0.5 ? 'Heart Sounds' : 'Lung Sounds',
          quality: 'High',
          waveform: Array.from({length: 50}, () => Math.random() * 100),
          frequency: Math.floor(Math.random() * 200) + 20
        };
      case 'otoscope-1':
        return {
          imageData: 'base64_encoded_ear_image',
          resolution: '1920x1080',
          magnification: Math.floor(Math.random() * 10) + 5,
          lighting: 'LED White',
          focus: 'Auto',
          clarity: Math.floor(Math.random() * 30) + 70
        };
      case 'ultrasound-1':
        return {
          imageData: 'base64_encoded_ultrasound_frame',
          mode: 'B-Mode',
          depth: Math.floor(Math.random() * 15) + 5,
          frequency: (Math.random() * 5 + 2).toFixed(1) + ' MHz',
          gain: Math.floor(Math.random() * 100),
          frameRate: Math.floor(Math.random() * 10) + 15
        };
      default:
        return {};
    }
  };

  const saveDeviceData = async (deviceId: string, dataType: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const saveKey = `${deviceId}_${dataType}`;
    setSavingData(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let filename = '';
      
      switch (deviceId) {
        case 'stethoscope-1':
          filename = `stethoscope_audio_${timestamp}.wav`;
          break;
        case 'otoscope-1':
          filename = `otoscope_image_${timestamp}.jpg`;
          break;
        case 'ultrasound-1':
          filename = `ultrasound_image_${timestamp}.jpg`;
          break;
      }
      
      addToLog(`✓ Saved ${filename} successfully`);
      alert(`${device.name} data saved as ${filename}`);
    } catch (error) {
      addToLog(`✗ Failed to save ${device.name} data`);
      alert(`Failed to save ${device.name} data`);
    } finally {
      setSavingData(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  const updateDeviceControl = (deviceId: string, control: string, value: any) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { 
            ...d, 
            controls: { ...d.controls, [control]: value }
          }
        : d
    ));
  };

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'audio':
        return <Volume2 className="h-6 w-6 text-green-600" />;
      case 'visual':
        return <Eye className="h-6 w-6 text-purple-600" />;
      case 'imaging':
        return <Monitor className="h-6 w-6 text-blue-600" />;
      default:
        return <Activity className="h-6 w-6 text-gray-600" />;
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4 text-blue-600" />;
      case 'usb':
        return <Usb className="h-4 w-4 text-green-600" />;
      case 'wifi':
        return <Wifi className="h-4 w-4 text-purple-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const connectedDevices = devices.filter(d => d.status === 'connected');
  const streamingDevices = devices.filter(d => d.isStreaming);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <BackButton fallbackPath="/patient" showText={false} className="p-2" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Medical Devices</h1>
                <p className="text-sm text-gray-600">Manage and control your medical devices</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-green-800">
                  {connectedDevices.length} Connected
                </span>
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-blue-800">
                  {streamingDevices.length} Streaming
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Device List */}
          <div className="lg:col-span-2 space-y-6">
            <WithingsConnector />

            <WithingsMeasurements showHeader={true} maxItems={5} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Available Devices</h3>
              </div>
              <div className="p-6 space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          {getDeviceIcon(device.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{device.name}</h4>
                            {getStatusIcon(device.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              {getConnectionIcon(device.type)}
                              <span className="capitalize">{device.type}</span>
                            </div>
                            <span>•</span>
                            <span>{device.manufacturer}</span>
                            <span>•</span>
                            <span>{device.model}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                            {device.battery && (
                              <div className="flex items-center space-x-1">
                                <Battery className="h-3 w-3" />
                                <span>{device.battery}%</span>
                              </div>
                            )}
                            {device.signalStrength > 0 && (
                              <div className="flex items-center space-x-1">
                                <Signal className="h-3 w-3" />
                                <span>{device.signalStrength}%</span>
                              </div>
                            )}
                            {device.isStreaming && (
                              <div className="flex items-center space-x-1">
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-600">Streaming</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
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
                      <div className="flex flex-col space-y-2">
                        {device.status === 'disconnected' && (
                          <button
                            onClick={() => connectDevice(device.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Connect</span>
                          </button>
                        )}
                        {device.status === 'connected' && (
                          <>
                            <button
                              onClick={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                              <Settings className="h-4 w-4" />
                              <span>Control</span>
                            </button>
                            <button
                              onClick={() => disconnectDevice(device.id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                            >
                              <X className="h-4 w-4" />
                              <span>Disconnect</span>
                            </button>
                          </>
                        )}
                        {device.status === 'error' && (
                          <button
                            onClick={() => connectDevice(device.id)}
                            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                          >
                            <AlertCircle className="h-4 w-4" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Device Controls */}
                    {selectedDevice === device.id && device.status === 'connected' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-3">Device Controls</h5>
                        
                        {/* Stethoscope Controls */}
                        {device.id === 'stethoscope-1' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={device.controls.volume}
                                  onChange={(e) => updateDeviceControl(device.id, 'volume', parseInt(e.target.value))}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{device.controls.volume}%</span>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
                                <select
                                  value={device.controls.filter}
                                  onChange={(e) => updateDeviceControl(device.id, 'filter', e.target.value)}
                                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="heart">Heart Focus</option>
                                  <option value="lung">Lung Focus</option>
                                </select>
                              </div>
                            </div>
                            <div className="bg-gray-100 h-20 rounded flex items-center justify-center">
                              <div className="flex space-x-1">
                                {[...Array(10)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="w-1 bg-green-500 rounded animate-pulse"
                                    style={{ 
                                      height: `${Math.random() * 30 + 10}px`,
                                      animationDelay: `${i * 0.1}s`
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => saveDeviceData(device.id, 'audio')}
                                disabled={savingData[`${device.id}_audio`]}
                                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                              >
                                {savingData[`${device.id}_audio`] ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mic className="h-4 w-4" />
                                )}
                                <span>Save Audio</span>
                              </button>
                              <button className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                                <Play className="h-4 w-4" />
                                <span>Record</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Otoscope Controls */}
                        {device.id === 'otoscope-1' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => updateDeviceControl(device.id, 'zoom', Math.max(1, device.controls.zoom - 1))}
                                    className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                                  >
                                    <ZoomOut className="h-4 w-4" />
                                  </button>
                                  <span className="text-sm px-3 py-1 bg-gray-100 rounded">{device.controls.zoom}x</span>
                                  <button 
                                    onClick={() => updateDeviceControl(device.id, 'zoom', Math.min(10, device.controls.zoom + 1))}
                                    className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                                  >
                                    <ZoomIn className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brightness</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={device.controls.brightness}
                                  onChange={(e) => updateDeviceControl(device.id, 'brightness', parseInt(e.target.value))}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{device.controls.brightness}%</span>
                              </div>
                            </div>
                            <div className="bg-gray-200 h-32 rounded flex items-center justify-center">
                              <span className="text-gray-500">Otoscope Live Feed</span>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => saveDeviceData(device.id, 'image')}
                                disabled={savingData[`${device.id}_image`]}
                                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                              >
                                {savingData[`${device.id}_image`] ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Camera className="h-4 w-4" />
                                )}
                                <span>Capture Image</span>
                              </button>
                              <button className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                                <Play className="h-4 w-4" />
                                <span>Record Video</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Ultrasound Controls */}
                        {device.id === 'ultrasound-1' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
                                <input
                                  type="range"
                                  min="5"
                                  max="20"
                                  value={device.controls.depth}
                                  onChange={(e) => updateDeviceControl(device.id, 'depth', parseInt(e.target.value))}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{device.controls.depth}cm</span>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gain</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={device.controls.gain}
                                  onChange={(e) => updateDeviceControl(device.id, 'gain', parseInt(e.target.value))}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{device.controls.gain}%</span>
                              </div>
                            </div>
                            <div className="bg-black h-32 rounded flex items-center justify-center">
                              <span className="text-white">Ultrasound Imaging</span>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => saveDeviceData(device.id, 'image')}
                                disabled={savingData[`${device.id}_image`]}
                                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                              >
                                {savingData[`${device.id}_image`] ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImageIcon className="h-4 w-4" />
                                )}
                                <span>Save Image</span>
                              </button>
                              <button className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span>Mode</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Connection Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Connection Log</span>
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {connectionLog.length > 0 ? (
                    connectionLog.map((log, index) => (
                      <div key={index} className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                        {log}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No activity yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Live Data Stream */}
            {Object.keys(deviceData).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span>Live Data Stream</span>
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {Object.entries(deviceData).map(([deviceId, data]) => {
                    const device = devices.find(d => d.id === deviceId);
                    return (
                      <div key={deviceId} className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{device?.name}</span>
                          <div className="flex items-center space-x-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600">Live</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(data.data).slice(0, 4).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value).substring(0, 20)}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 mt-2">
                          <Shield className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600">Encrypted</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Device Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Device Statistics</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{connectedDevices.length}</div>
                    <div className="text-xs text-gray-600">Connected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{streamingDevices.length}</div>
                    <div className="text-xs text-gray-600">Streaming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {devices.filter(d => d.status === 'connecting').length}
                    </div>
                    <div className="text-xs text-gray-600">Connecting</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {devices.filter(d => d.status === 'error').length}
                    </div>
                    <div className="text-xs text-gray-600">Error</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDevicesPage;