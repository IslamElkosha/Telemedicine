import React, { useState } from 'react';
import { useTechnician } from '../contexts/TechnicianContext';
import BackButton from './BackButton';
import { 
  Package, 
  Bluetooth, 
  Usb, 
  Wifi, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  X,
  Play,
  Square,
  Battery,
  Signal,
  Wrench,
  Shield,
  Activity,
  ToggleLeft,
  ToggleRight,
  Heart,
  Thermometer,
  Zap,
  Eye,
  Volume2,
  Monitor,
  Camera,
  Settings,
  Save,
  RotateCcw,
  Power,
  Gauge
} from 'lucide-react';

const TechnicianKitManager: React.FC = () => {
  const { 
    assignedKits, 
    updateKitStatus, 
    testDevice, 
    connectDevice, 
    disconnectDevice,
    loading 
  } = useTechnician();
  
  const [selectedKit, setSelectedKit] = useState<string | null>(null);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
  const [deviceControls, setDeviceControls] = useState<{[key: string]: any}>({});
  const [liveData, setLiveData] = useState<{[key: string]: any}>({});
  const [recordingDevice, setRecordingDevice] = useState<string | null>(null);

  // All 7 medical devices with full control capabilities
  const allDevices = [
    {
      id: 'blood-pressure',
      name: 'Blood Pressure Monitor',
      type: 'bluetooth',
      category: 'vital-signs',
      icon: Heart,
      controls: {
        mode: 'automatic',
        cuffSize: 'adult',
        pressure: 180,
        autoInflate: true
      },
      capabilities: ['Automatic measurement', 'Manual mode', 'Memory storage', 'Bluetooth sync']
    },
    {
      id: 'pulse-oximeter',
      name: 'Pulse Oximeter',
      type: 'bluetooth',
      category: 'vital-signs',
      icon: Activity,
      controls: {
        sensitivity: 'normal',
        alarmLimits: { spo2Low: 90, hrLow: 50, hrHigh: 120 },
        displayBrightness: 80
      },
      capabilities: ['SpO2 monitoring', 'Heart rate', 'Perfusion index', 'Alarm system']
    },
    {
      id: 'thermometer',
      name: 'Digital Thermometer',
      type: 'bluetooth',
      category: 'vital-signs',
      icon: Thermometer,
      controls: {
        unit: 'celsius',
        mode: 'body',
        beepEnabled: true,
        autoShutoff: 60
      },
      capabilities: ['Body temperature', 'Surface temperature', 'Memory recall', 'Fever alarm']
    },
    {
      id: 'stethoscope',
      name: 'Digital Stethoscope',
      type: 'bluetooth',
      category: 'audio',
      icon: Volume2,
      controls: {
        volume: 75,
        filter: 'heart',
        noiseReduction: true,
        recording: false,
        amplification: 50
      },
      capabilities: ['Heart sounds', 'Lung sounds', 'Recording', 'Noise cancellation', 'Frequency filtering']
    },
    {
      id: 'otoscope',
      name: 'Digital Otoscope',
      type: 'usb',
      category: 'visual',
      icon: Eye,
      controls: {
        zoom: 1,
        lighting: 80,
        focus: 'auto',
        imageCapture: false,
        videoRecording: false
      },
      capabilities: ['Ear examination', 'Image capture', 'Video recording', 'LED lighting', 'Digital zoom']
    },
    {
      id: 'ultrasound',
      name: 'Portable Ultrasound',
      type: 'wifi',
      category: 'imaging',
      icon: Monitor,
      controls: {
        mode: 'B-Mode',
        depth: 10,
        gain: 50,
        frequency: 5.0,
        freeze: false,
        measurement: false
      },
      capabilities: ['B-Mode imaging', 'Doppler', 'M-Mode', 'Measurements', 'Image storage', 'DICOM export']
    },
    {
      id: 'ecg',
      name: 'ECG Monitor',
      type: 'wifi',
      category: 'vital-signs',
      icon: Zap,
      controls: {
        leads: 12,
        speed: 25,
        gain: 10,
        filter: '0.5-40Hz',
        recording: false
      },
      capabilities: ['12-lead ECG', 'Rhythm analysis', 'Arrhythmia detection', 'Report generation', 'Cloud sync']
    }
  ];

  // Initialize device controls
  React.useEffect(() => {
    const initialControls: {[key: string]: any} = {};
    allDevices.forEach(device => {
      initialControls[device.id] = { ...device.controls, status: 'disconnected' };
    });
    setDeviceControls(initialControls);
  }, []);

  // Simulate live data streaming
  React.useEffect(() => {
    const interval = setInterval(() => {
      const connectedDevices = Object.keys(deviceControls).filter(
        deviceId => deviceControls[deviceId]?.status === 'connected'
      );
      
      const newLiveData: {[key: string]: any} = {};
      connectedDevices.forEach(deviceId => {
        newLiveData[deviceId] = generateLiveData(deviceId);
      });
      
      setLiveData(newLiveData);
    }, 2000);

    return () => clearInterval(interval);
  }, [deviceControls]);

  const generateLiveData = (deviceId: string) => {
    switch (deviceId) {
      case 'blood-pressure':
        return {
          systolic: Math.floor(Math.random() * 40) + 110,
          diastolic: Math.floor(Math.random() * 20) + 70,
          heartRate: Math.floor(Math.random() * 30) + 60,
          timestamp: new Date()
        };
      case 'pulse-oximeter':
        return {
          spo2: Math.floor(Math.random() * 5) + 95,
          heartRate: Math.floor(Math.random() * 30) + 60,
          perfusionIndex: (Math.random() * 10 + 5).toFixed(1),
          timestamp: new Date()
        };
      case 'thermometer':
        return {
          temperature: (Math.random() * 2 + 36.5).toFixed(1),
          unit: deviceControls[deviceId]?.unit || 'celsius',
          timestamp: new Date()
        };
      case 'stethoscope':
        return {
          audioLevel: Math.floor(Math.random() * 100),
          heartRate: Math.floor(Math.random() * 30) + 60,
          soundType: Math.random() > 0.5 ? 'Heart' : 'Lung',
          quality: 'High',
          timestamp: new Date()
        };
      case 'otoscope':
        return {
          imageQuality: 'HD',
          zoom: deviceControls[deviceId]?.zoom || 1,
          lighting: deviceControls[deviceId]?.lighting || 80,
          timestamp: new Date()
        };
      case 'ultrasound':
        return {
          mode: deviceControls[deviceId]?.mode || 'B-Mode',
          depth: deviceControls[deviceId]?.depth || 10,
          frameRate: Math.floor(Math.random() * 10) + 15,
          timestamp: new Date()
        };
      case 'ecg':
        return {
          heartRate: Math.floor(Math.random() * 30) + 60,
          rhythm: 'Normal Sinus',
          leads: deviceControls[deviceId]?.leads || 12,
          timestamp: new Date()
        };
      default:
        return {};
    }
  };

  const connectAllDevices = async () => {
    for (const device of allDevices) {
      await connectDeviceById(device.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Stagger connections
    }
  };

  const disconnectAllDevices = () => {
    const updatedControls = { ...deviceControls };
    Object.keys(updatedControls).forEach(deviceId => {
      updatedControls[deviceId] = { ...updatedControls[deviceId], status: 'disconnected' };
    });
    setDeviceControls(updatedControls);
    setLiveData({});
  };

  const connectDeviceById = async (deviceId: string) => {
    setDeviceControls(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], status: 'connecting' }
    }));

    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.1; // 90% success rate
    setDeviceControls(prev => ({
      ...prev,
      [deviceId]: { 
        ...prev[deviceId], 
        status: success ? 'connected' : 'error',
        signalStrength: success ? Math.floor(Math.random() * 40) + 60 : 0,
        battery: Math.floor(Math.random() * 30) + 70
      }
    }));
  };

  const disconnectDeviceById = (deviceId: string) => {
    setDeviceControls(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], status: 'disconnected', signalStrength: 0 }
    }));
  };

  const updateDeviceControl = (deviceId: string, control: string, value: any) => {
    setDeviceControls(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], [control]: value }
    }));
  };

  const testDeviceById = async (deviceId: string) => {
    setTestingDevice(deviceId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setTestingDevice(null);
    
    const success = Math.random() > 0.05; // 95% success rate
    if (success) {
      alert(`${allDevices.find(d => d.id === deviceId)?.name} test completed successfully!`);
    } else {
      alert(`${allDevices.find(d => d.id === deviceId)?.name} test failed. Please check connections.`);
    }
  };

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'vital-signs':
        return Heart;
      case 'audio':
        return Volume2;
      case 'visual':
        return Eye;
      case 'imaging':
        return Monitor;
      default:
        return Activity;
    }
  };

  const handleKitStatusToggle = async (kitId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'in-service' ? 'out-of-service' : 'in-service';
    
    const confirmMessage = newStatus === 'out-of-service' 
      ? 'Are you sure you want to mark this kit as out of service? New appointments in your area will be reassigned to other technicians.'
      : 'Are you sure you want to mark this kit as in service? You will start receiving new appointment assignments.';
    
    if (window.confirm(confirmMessage)) {
      const result = await updateKitStatus(kitId, newStatus);
      if (!result.success) {
        alert(result.error || 'Failed to update kit status');
      }
    }
  };

  const handleTestDevice = async (kitId: string, deviceId: string) => {
    setTestingDevice(deviceId);
    const result = await testDevice(kitId, deviceId);
    setTestingDevice(null);
    
    if (!result.success) {
      alert(result.error || 'Device test failed');
    }
  };

  const handleConnectDevice = async (kitId: string, deviceId: string) => {
    setConnectingDevice(deviceId);
    const result = await connectDevice(kitId, deviceId);
    setConnectingDevice(null);
    
    if (!result.success) {
      alert(result.error || 'Failed to connect device');
    }
  };

  const handleDisconnectDevice = async (kitId: string, deviceId: string) => {
    const result = await disconnectDevice(kitId, deviceId);
    if (!result.success) {
      alert(result.error || 'Failed to disconnect device');
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

  const getDeviceStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'disconnected':
        return <X className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Kit Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={connectAllDevices}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Connect All</span>
          </button>
          <button
            onClick={disconnectAllDevices}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Disconnect All</span>
          </button>
          <BackButton fallbackPath="/technician" />
        </div>
      </div>

      {/* Device Status Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(deviceControls).filter(d => d.status === 'connected').length}
            </div>
            <div className="text-sm text-green-700">Connected</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(liveData).length}
            </div>
            <div className="text-sm text-blue-700">Streaming</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Object.values(deviceControls).filter(d => d.status === 'connecting').length}
            </div>
            <div className="text-sm text-yellow-700">Connecting</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {Object.values(deviceControls).filter(d => d.status === 'error').length}
            </div>
            <div className="text-sm text-red-700">Error</div>
          </div>
        </div>
      </div>

      {/* All 7 Medical Devices */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Medical Device Control Center</h3>
          <p className="text-sm text-gray-600 mt-1">Full control of all 7 medical devices in your kit</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allDevices.map((device) => {
              const deviceControl = deviceControls[device.id] || { status: 'disconnected' };
              const deviceLiveData = liveData[device.id];
              const DeviceIcon = device.icon;
              
              return (
                <div key={device.id} className="border border-gray-200 rounded-lg p-6">
                  {/* Device Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <DeviceIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{device.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          {getConnectionIcon(device.type)}
                          <span className="capitalize">{device.type}</span>
                          <span>•</span>
                          <span className="capitalize">{device.category.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getDeviceStatusIcon(deviceControl.status)}
                      <span className={`text-sm font-medium ${
                        deviceControl.status === 'connected' ? 'text-green-600' :
                        deviceControl.status === 'connecting' ? 'text-blue-600' :
                        deviceControl.status === 'error' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {deviceControl.status}
                      </span>
                    </div>
                  </div>

                  {/* Device Status Info */}
                  {deviceControl.status === 'connected' && (
                    <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                      {deviceControl.battery && (
                        <div className="flex items-center space-x-1">
                          <Battery className="h-4 w-4" />
                          <span>{deviceControl.battery}%</span>
                        </div>
                      )}
                      {deviceControl.signalStrength && (
                        <div className="flex items-center space-x-1">
                          <Signal className="h-4 w-4" />
                          <span>{deviceControl.signalStrength}%</span>
                        </div>
                      )}
                      {deviceLiveData && (
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600">Live Data</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Data Display */}
                  {deviceLiveData && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Live Readings</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(deviceLiveData).map(([key, value]) => {
                          if (key === 'timestamp') return null;
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-medium text-gray-900">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Device Controls */}
                  {deviceControl.status === 'connected' && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">Device Controls</h5>
                      
                      {/* Blood Pressure Monitor Controls */}
                      {device.id === 'blood-pressure' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                              <select
                                value={deviceControl.mode}
                                onChange={(e) => updateDeviceControl(device.id, 'mode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="automatic">Automatic</option>
                                <option value="manual">Manual</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Cuff Size</label>
                              <select
                                value={deviceControl.cuffSize}
                                onChange={(e) => updateDeviceControl(device.id, 'cuffSize', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="child">Child</option>
                                <option value="adult">Adult</option>
                                <option value="large">Large Adult</option>
                              </select>
                            </div>
                          </div>
                          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Start Measurement
                          </button>
                        </div>
                      )}

                      {/* Pulse Oximeter Controls */}
                      {device.id === 'pulse-oximeter' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sensitivity</label>
                            <select
                              value={deviceControl.sensitivity}
                              onChange={(e) => updateDeviceControl(device.id, 'sensitivity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Display Brightness</label>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              value={deviceControl.displayBrightness}
                              onChange={(e) => updateDeviceControl(device.id, 'displayBrightness', parseInt(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{deviceControl.displayBrightness}%</span>
                          </div>
                        </div>
                      )}

                      {/* Digital Stethoscope Controls */}
                      {device.id === 'stethoscope' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Volume</label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={deviceControl.volume}
                                onChange={(e) => updateDeviceControl(device.id, 'volume', parseInt(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{deviceControl.volume}%</span>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Filter</label>
                              <select
                                value={deviceControl.filter}
                                onChange={(e) => updateDeviceControl(device.id, 'filter', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="heart">Heart</option>
                                <option value="lung">Lung</option>
                                <option value="normal">Normal</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'recording', !deviceControl.recording)}
                              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                                deviceControl.recording 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-gray-600 text-white hover:bg-gray-700'
                              }`}
                            >
                              {deviceControl.recording ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              <span>{deviceControl.recording ? 'Stop' : 'Record'}</span>
                            </button>
                            <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                              Save Audio
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Digital Otoscope Controls */}
                      {device.id === 'otoscope' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Zoom</label>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => updateDeviceControl(device.id, 'zoom', Math.max(1, deviceControl.zoom - 1))}
                                  className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="text-sm px-2 py-1 bg-gray-100 rounded">{deviceControl.zoom}x</span>
                                <button 
                                  onClick={() => updateDeviceControl(device.id, 'zoom', Math.min(10, deviceControl.zoom + 1))}
                                  className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Lighting</label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={deviceControl.lighting}
                                onChange={(e) => updateDeviceControl(device.id, 'lighting', parseInt(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{deviceControl.lighting}%</span>
                            </div>
                          </div>
                          <div className="bg-gray-200 h-24 rounded flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Otoscope Live View</span>
                          </div>
                          <div className="flex space-x-2">
                            <button className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                              <Camera className="h-4 w-4" />
                              <span>Capture</span>
                            </button>
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'videoRecording', !deviceControl.videoRecording)}
                              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                                deviceControl.videoRecording 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              {deviceControl.videoRecording ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              <span>{deviceControl.videoRecording ? 'Stop' : 'Record'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Ultrasound Controls */}
                      {device.id === 'ultrasound' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                              <select
                                value={deviceControl.mode}
                                onChange={(e) => updateDeviceControl(device.id, 'mode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="B-Mode">B-Mode</option>
                                <option value="M-Mode">M-Mode</option>
                                <option value="Doppler">Doppler</option>
                                <option value="Color">Color Flow</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Depth (cm)</label>
                              <input
                                type="range"
                                min="5"
                                max="20"
                                value={deviceControl.depth}
                                onChange={(e) => updateDeviceControl(device.id, 'depth', parseInt(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-xs text-gray-500">{deviceControl.depth}cm</span>
                            </div>
                          </div>
                          <div className="bg-black h-32 rounded flex items-center justify-center">
                            <span className="text-white text-sm">Ultrasound Imaging - {deviceControl.mode}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'freeze', !deviceControl.freeze)}
                              className={`flex-1 py-2 rounded-lg transition-colors ${
                                deviceControl.freeze 
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {deviceControl.freeze ? 'Unfreeze' : 'Freeze'}
                            </button>
                            <button className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                              Save Image
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ECG Monitor Controls */}
                      {device.id === 'ecg' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Speed (mm/s)</label>
                              <select
                                value={deviceControl.speed}
                                onChange={(e) => updateDeviceControl(device.id, 'speed', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="12.5">12.5</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Gain (mm/mV)</label>
                              <select
                                value={deviceControl.gain}
                                onChange={(e) => updateDeviceControl(device.id, 'gain', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                              </select>
                            </div>
                          </div>
                          <div className="bg-green-50 h-24 rounded flex items-center justify-center">
                            <span className="text-green-700 text-sm">ECG Waveform - {deviceControl.leads} Lead</span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'recording', !deviceControl.recording)}
                              className={`flex-1 py-2 rounded-lg transition-colors ${
                                deviceControl.recording 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {deviceControl.recording ? 'Stop Recording' : 'Start Recording'}
                            </button>
                            <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                              Generate Report
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Thermometer Controls */}
                      {device.id === 'thermometer' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                              <select
                                value={deviceControl.unit}
                                onChange={(e) => updateDeviceControl(device.id, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="celsius">Celsius</option>
                                <option value="fahrenheit">Fahrenheit</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                              <select
                                value={deviceControl.mode}
                                onChange={(e) => updateDeviceControl(device.id, 'mode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="body">Body</option>
                                <option value="surface">Surface</option>
                                <option value="ambient">Ambient</option>
                              </select>
                            </div>
                          </div>
                          <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
                            Take Reading
                          </button>
                        </div>
                      )}

                      {/* Generic controls for other devices */}
                      {!['blood-pressure', 'pulse-oximeter', 'stethoscope', 'thermometer', 'otoscope', 'ultrasound', 'ecg'].includes(device.id) && (
                        <div className="space-y-2">
                          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Start Measurement
                          </button>
                          <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                            Save Data
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connection Controls */}
                  <div className="flex space-x-2 mt-4">
                    {deviceControl.status === 'disconnected' && (
                      <button
                        onClick={() => connectDeviceById(device.id)}
                        disabled={connectingDevice === device.id}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        {connectingDevice === device.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Connect</span>
                      </button>
                    )}
                    
                    {deviceControl.status === 'connected' && (
                      <button
                        onClick={() => disconnectDeviceById(device.id)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Disconnect</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => testDeviceById(device.id)}
                      disabled={testingDevice === device.id}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      {testingDevice === device.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>Test</span>
                    </button>
                  </div>

                  {/* Device Capabilities */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-2 text-sm">Capabilities</h5>
                    <div className="flex flex-wrap gap-1">
                      {device.capabilities.map((capability, index) => (
                        <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedKits.map(kit => (
          <div key={kit.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{kit.kitNumber}</h3>
                  <p className="text-sm text-gray-600">{kit.serialNumber}</p>
                </div>
              </div>
              
              {/* Kit Status Toggle */}
              <button
                onClick={() => handleKitStatusToggle(kit.id, kit.status)}
                disabled={loading}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  kit.status === 'in-service' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
                title={`Click to mark as ${kit.status === 'in-service' ? 'out of service' : 'in service'}`}
              >
                {kit.status === 'in-service' ? (
                  <ToggleRight className="h-5 w-5" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {kit.status === 'in-service' ? 'In Service' : 'Out of Service'}
                </span>
              </button>
            </div>

            {/* Kit Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Battery Status</span>
                <div className="flex items-center space-x-2">
                  <Battery className={`h-4 w-4 ${kit.batteryStatus > 20 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-medium">{kit.batteryStatus}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Condition</span>
                <span className={`font-medium ${
                  kit.condition === 'excellent' ? 'text-green-600' :
                  kit.condition === 'good' ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {kit.condition}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Devices</span>
                <span className="font-medium">{kit.devices.length} devices</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedKit(selectedKit === kit.id ? null : kit.id)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Wrench className="h-4 w-4" />
              <span>Manage Devices</span>
            </button>

            {/* Kit Summary */}
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium">{kit.location.city}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Maintenance:</span>
                <span className="font-medium">{kit.lastMaintenance.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Next Maintenance:</span>
                <span className="font-medium">{kit.nextMaintenance.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kit Status Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kit Status Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">In Service</h4>
                <p className="text-sm text-gray-600">
                  Kit is active and available for appointments. You will receive new assignments.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Out of Service</h4>
                <p className="text-sm text-gray-600">
                  Kit is temporarily unavailable. New appointments will be reassigned to other technicians.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Important Notes</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Always test devices before starting appointments</li>
              <li>• Mark kit as out of service if any critical device fails</li>
              <li>• Contact support for maintenance scheduling</li>
              <li>• Keep devices charged and properly stored</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianKitManager;