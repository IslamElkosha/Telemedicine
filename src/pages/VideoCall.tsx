import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppointments } from '../contexts/AppointmentContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Monitor, 
  FileText, 
  MessageSquare,
  Settings,
  Users,
  Share,
  Heart,
  Activity,
  Thermometer,
  Zap,
  Camera,
  Volume2,
  Eye,
  Bluetooth,
  Usb,
  Wifi,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Square,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Download,
  Loader,
  Headphones,
  Image as ImageIcon
} from 'lucide-react';
import DeviceReadings from '../components/DeviceReadings';
import VitalsPanel from '../components/VitalsPanel';

const VideoCall: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appointments, updateAppointment } = useAppointments();

  const getRoleDashboardRoute = (role: string) => {
    const dashboardRoutes: { [key: string]: string } = {
      'patient': '/patient',
      'doctor': '/doctor',
      'technician': '/technician',
      'admin': '/admin',
      'hospital': '/hospital',
      'freelance-tech': '/freelance-tech'
    };
    return dashboardRoutes[role] || `/${role}`;
  };
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showDevices, setShowDevices] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  
  // Real-time video streams
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [connectedDevices, setConnectedDevices] = useState<{[key: string]: any}>({});
  const [deviceControls, setDeviceControls] = useState<{[key: string]: any}>({});
  const [showDevicePanel, setShowDevicePanel] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [savingData, setSavingData] = useState<{[key: string]: boolean}>({});
  
  // Medical device capture states
  const [capturingStethoscope, setCapturingStethoscope] = useState(false);
  const [capturingOtoscope, setCapturingOtoscope] = useState(false);
  const [capturingUltrasound, setCapturingUltrasound] = useState(false);

  const appointment = appointments.find(apt => apt.id === appointmentId);

  // Available medical devices for video call
  const medicalDevices = [
    {
      id: 'otoscope',
      name: 'Digital Otoscope',
      type: 'usb',
      category: 'visual',
      status: 'disconnected',
      capabilities: ['Ear Examination', 'Image Capture', 'Video Recording', 'LED Lighting'],
      controls: {
        zoom: 1,
        lighting: true,
        recording: false,
        focus: 'auto'
      }
    },
    {
      id: 'stethoscope',
      name: 'Wireless Stethoscope',
      type: 'bluetooth',
      category: 'audio',
      status: 'disconnected',
      capabilities: ['Heart Sounds', 'Lung Sounds', 'Noise Cancellation', 'Audio Recording'],
      controls: {
        volume: 75,
        noiseReduction: true,
        recording: false,
        filter: 'normal'
      }
    },
    {
      id: 'ultrasound',
      name: 'Portable Ultrasound',
      type: 'wifi',
      category: 'imaging',
      status: 'disconnected',
      capabilities: ['B-Mode Imaging', 'Doppler', 'M-Mode', 'Image Capture'],
      controls: {
        mode: 'B-Mode',
        depth: 10,
        gain: 50,
        frequency: 5.0
      }
    }
  ];

  const [devices, setDevices] = useState(medicalDevices);

  // Enhanced device management
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [deviceListOpen, setDeviceListOpen] = useState(false);

  useEffect(() => {
    if (!appointment) {
      navigate('/');
      return;
    }
    
    // Start the call timer when component mounts
    const startTime = new Date();
    setCallStartTime(startTime);
    setIsCallActive(true);
    
    // Initialize real-time video call
    initializeVideoCall();
    
    // Cleanup function
    return () => {
      if (localVideoStream) {
        localVideoStream.getTracks().forEach(track => track.stop());
      }
      if (remoteVideoStream) {
        remoteVideoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [appointment, navigate]);

  // Timer effect - updates every second when call is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCallActive, callStartTime]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const initializeVideoCall = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Get local user's video stream (high quality)
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setLocalVideoStream(localStream);
      
      // Simulate establishing connection with remote participant
      setTimeout(async () => {
        try {
          // In real implementation, this would be the remote participant's stream via WebRTC
          // For demo purposes, we'll simulate a remote stream
          const remoteStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: { echoCancellation: true, noiseSuppression: true }
          });
          setRemoteVideoStream(remoteStream);
          setIsConnecting(false);
        } catch (error) {
          console.error('Error connecting to remote participant:', error);
          setConnectionError('Failed to connect to remote participant');
          setIsConnecting(false);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionError('Unable to access camera/microphone. Please check permissions.');
      setIsConnecting(false);
    }
  };

  const toggleVideo = () => {
    if (localVideoStream) {
      const videoTrack = localVideoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localVideoStream) {
      const audioTrack = localVideoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Device connection functions
  const connectDevice = async (deviceId: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status: 'connecting' }
        : device
    ));

    // Simulate device connection
    setTimeout(() => {
      const success = Math.random() > 0.1;
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: success ? 'connected' : 'error' }
          : device
      ));

      if (success) {
        // Initialize device stream
        setConnectedDevices(prev => ({
          ...prev,
          [deviceId]: {
            stream: null, // In real implementation, this would be the device stream
            lastReading: new Date(),
            data: generateDeviceData(deviceId)
          }
        }));
      }
    }, 2000);
  };

  const disconnectDevice = (deviceId: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status: 'disconnected' }
        : device
    ));

    setConnectedDevices(prev => {
      const newDevices = { ...prev };
      delete newDevices[deviceId];
      return newDevices;
    });
  };

  // Save functions for medical devices
  const captureStethoscopeAudio = async () => {
    setCapturingStethoscope(true);
    
    try {
      // Simulate capturing stethoscope audio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stethoscope_audio_${timestamp}.wav`;
      
      // Create download link for audio file
      const link = document.createElement('a');
      link.href = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Stethoscope audio captured and saved as ${filename}`);
    } catch (error) {
      alert('Failed to capture stethoscope audio');
    } finally {
      setCapturingStethoscope(false);
    }
  };

  const captureOtoscopeImage = async () => {
    setCapturingOtoscope(true);
    
    try {
      // Simulate capturing otoscope image
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `otoscope_image_${timestamp}.jpg`;
      
      // Create download link for image
      const link = document.createElement('a');
      link.href = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Otoscope image captured and saved as ${filename}`);
    } catch (error) {
      alert('Failed to capture otoscope image');
    } finally {
      setCapturingOtoscope(false);
    }
  };

  const captureUltrasoundImage = async () => {
    setCapturingUltrasound(true);
    
    try {
      // Simulate capturing ultrasound image
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ultrasound_image_${timestamp}.jpg`;
      
      // Create download link for ultrasound image
      const link = document.createElement('a');
      link.href = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Ultrasound image captured and saved as ${filename}`);
    } catch (error) {
      alert('Failed to capture ultrasound image');
    } finally {
      setCapturingUltrasound(false);
    }
  };

  const updateDeviceControl = (deviceId: string, control: string, value: any) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { 
            ...device, 
            controls: { ...device.controls, [control]: value }
          }
        : device
    ));
  };

  const generateDeviceData = (deviceId: string) => {
    switch (deviceId) {
      case 'otoscope':
        return {
          imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FYXIgSW1hZ2U8L3RleHQ+PC9zdmc+',
          resolution: '1920x1080',
          magnification: '10x',
          lighting: 'LED White'
        };
      case 'stethoscope':
        return {
          heartRate: Math.floor(Math.random() * 40) + 60,
          audioLevel: Math.floor(Math.random() * 100),
          soundType: 'Heart Sounds',
          quality: 'High'
        };
      case 'ultrasound':
        return {
          imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSJ3aGl0ZSI+VWx0cmFzb3VuZDwvdGV4dD48L3N2Zz4=',
          mode: 'B-Mode',
          depth: '10cm',
          frequency: '5.0 MHz'
        };
      default:
        return {};
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4 text-blue-600" />;
      case 'usb':
        return <Usb className="h-4 w-4 text-green-600" />;
      case 'wifi':
        return <Wifi className="h-4 w-4 text-purple-600" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const VideoStream = ({ stream, name, isLocal = false }: { stream: MediaStream | null, name: string, isLocal?: boolean }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = isLocal; // Mute local video to prevent feedback
      }
    }, [stream, isLocal]);
    
    return (
      <div className="bg-gray-800 rounded-xl relative overflow-hidden h-full">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }} // Mirror local video
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="text-center text-white">
              {isConnecting ? (
                <>
                  <Loader className="h-12 w-12 mx-auto mb-2 animate-spin" />
                  <p>Connecting...</p>
                </>
              ) : connectionError ? (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                  <p>Connection Error</p>
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Camera not available</p>
                </>
              )}
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
          {name}
        </div>
        {isLocal && (
          <div className="absolute top-4 right-4 flex space-x-2">
            {!videoEnabled && (
              <div className="bg-red-600 p-2 rounded-full">
                <VideoOff className="h-4 w-4 text-white" />
              </div>
            )}
            {!audioEnabled && (
              <div className="bg-red-600 p-2 rounded-full">
                <MicOff className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        )}
        {!isLocal && stream && (
          <div className="absolute top-4 right-4 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
            Live
          </div>
        )}
      </div>
    );
  };

  const endCall = () => {
    setIsCallActive(false);
    
    // Stop all media tracks
    if (localVideoStream) {
      localVideoStream.getTracks().forEach(track => track.stop());
    }
    if (remoteVideoStream) {
      remoteVideoStream.getTracks().forEach(track => track.stop());
    }
    
    if (appointment) {
      updateAppointment(appointment.id, {
        status: 'completed',
        notes,
        prescription,
        callDuration: callDuration
      });
    }
    if (user?.role) {
      const dashboardRoute = getRoleDashboardRoute(user.role);
      console.log('[VideoCall] Call ended, redirecting to:', dashboardRoute);
      navigate(dashboardRoute);
    } else {
      navigate('/');
    }
  };

  if (!appointment) return null;

  const currentDeviceReadings = [
    {
      deviceType: 'Blood Pressure Monitor',
      reading: '125/82',
      unit: 'mmHg',
      timestamp: new Date(),
      status: 'normal',
      icon: Heart
    },
    {
      deviceType: 'Pulse Oximeter',
      reading: '97',
      unit: '%',
      timestamp: new Date(),
      status: 'normal',
      icon: Activity
    },
    {
      deviceType: 'Digital Thermometer',
      reading: '98.6',
      unit: '°F',
      timestamp: new Date(),
      status: 'normal',
      icon: Thermometer
    },
    {
      deviceType: 'Heart Rate Monitor',
      reading: '72',
      unit: 'BPM',
      timestamp: new Date(),
      status: 'normal',
      icon: Heart
    },
    {
      deviceType: 'Digital Otoscope',
      reading: 'Clear',
      unit: 'Visual',
      timestamp: new Date(),
      status: 'normal',
      icon: Eye
    },
    {
      deviceType: 'Digital Stethoscope',
      reading: 'Normal',
      unit: 'Audio',
      timestamp: new Date(),
      status: 'normal',
      icon: Volume2
    },
    {
      deviceType: 'Portable Ultrasound',
      reading: 'Active',
      unit: 'Imaging',
      timestamp: new Date(),
      status: 'normal',
      icon: Monitor
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BackButton 
              className="text-white hover:text-gray-300" 
              showText={false}
              fallbackPath={`/${user?.role}`}
            />
            <h1 className="text-white font-semibold">
              Consultation: {appointment.patientName} & {appointment.doctorName}
            </h1>
            <div className="flex items-center space-x-3">
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>Live</span>
              </span>
              <div className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-mono text-lg font-semibold">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-gray-300 text-sm bg-gray-700 px-3 py-1 rounded-lg">
              <span className="font-medium">Duration: {formatDuration(callDuration)}</span>
            </div>
            <button 
              onClick={endCall}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <Phone className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Area */}
        <div className="flex-1 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full">
            {/* Local User Video */}
            <div className="relative">
              <VideoStream 
                stream={localVideoStream} 
                name={`${user?.role === 'doctor' ? 'Dr. ' + user.name : user?.name || 'You'} (You)`} 
                isLocal={true}
              />
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                {user?.role === 'doctor' ? 'Doctor (You)' : 'Patient (You)'}
              </div>
            </div>

            {/* Remote Participant Video */}
            <div className="relative">
              <VideoStream 
                stream={remoteVideoStream} 
                name={user?.role === 'doctor' ? appointment.patientName : `Dr. ${appointment.doctorName}`} 
                isLocal={false}
              />
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                {user?.role === 'doctor' ? 'Patient' : 'Doctor'}
              </div>
              {isConnecting && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Connecting to {user?.role === 'doctor' ? 'patient' : 'doctor'}...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Video Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 rounded-full p-4 flex items-center space-x-3">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {videoEnabled ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <VideoOff className="h-5 w-5 text-white" />
                )}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? (
                  <Mic className="h-5 w-5 text-white" />
                ) : (
                  <MicOff className="h-5 w-5 text-white" />
                )}
              </button>

              {/* Medical Device Capture Buttons */}
              <div className="h-8 w-px bg-gray-600"></div>
              
              <button 
                onClick={captureStethoscopeAudio}
                disabled={capturingStethoscope}
                className="p-3 rounded-full bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                title="Capture Stethoscope Audio"
              >
                {capturingStethoscope ? (
                  <Loader className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Headphones className="h-5 w-5 text-white" />
                )}
              </button>

              <button 
                onClick={captureOtoscopeImage}
                disabled={capturingOtoscope}
                className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50"
                title="Capture Otoscope Image"
              >
                {capturingOtoscope ? (
                  <Loader className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Eye className="h-5 w-5 text-white" />
                )}
              </button>

              <button 
                onClick={captureUltrasoundImage}
                disabled={capturingUltrasound}
                className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                title="Capture Ultrasound Image"
              >
                {capturingUltrasound ? (
                  <Loader className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-white" />
                )}
              </button>

              <div className="h-8 w-px bg-gray-600"></div>

              <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" title="Share screen">
                <Share className="h-5 w-5 text-white" />
              </button>

              <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" title="Settings">
                <Settings className="h-5 w-5 text-white" />
              </button>

              <button 
                onClick={() => setDeviceListOpen(!deviceListOpen)}
                className={`p-3 rounded-full transition-colors ${
                  deviceListOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Device list"
              >
                <Activity className="h-5 w-5 text-white" />
              </button>

              <button 
                onClick={() => setDevicePanelOpen(!devicePanelOpen)}
                className={`p-3 rounded-full transition-colors ${
                  devicePanelOpen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Device controls"
              >
                <Monitor className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Device List Panel */}
        {deviceListOpen && (
          <div className="absolute top-4 left-4 w-96 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Available Medical Devices</h3>
                <button 
                  onClick={() => setDeviceListOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {devices.map(device => (
                <div key={device.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(device.type)}
                      <span className="font-medium text-sm">{device.name}</span>
                    </div>
                    {getStatusIcon(device.status)}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    <div className="flex flex-wrap gap-1">
                      {device.capabilities.slice(0, 2).map((capability, index) => (
                        <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      device.status === 'connected' ? 'bg-green-100 text-green-800' :
                      device.status === 'connecting' ? 'bg-blue-100 text-blue-800' :
                      device.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {device.status}
                    </span>
                    
                    <div className="flex space-x-2">
                      {device.status === 'disconnected' && (
                        <button
                          onClick={() => connectDevice(device.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Connect
                        </button>
                      )}
                      {device.status === 'connected' && (
                        <button
                          onClick={() => disconnectDevice(device.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      )}
                      {device.status === 'error' && (
                        <button
                          onClick={() => connectDevice(device.id)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Devices Panel */}
        {devicePanelOpen && (
          <div className="absolute top-4 right-4 w-96 bg-white rounded-xl shadow-lg border border-gray-200 max-h-[500px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Device Controls</h3>
                <button 
                  onClick={() => setDevicePanelOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {devices.filter(device => device.status === 'connected').map(device => (
                <div key={device.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(device.type)}
                      <span className="font-medium text-sm">{device.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Active</span>
                    </div>
                  </div>
                  
                  {/* Device-specific controls */}
                  <div className="space-y-3">
                    {device.id === 'otoscope' && (
                      <div className="space-y-3">
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <span className="text-sm font-medium text-purple-800">Digital Otoscope Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Zoom</span>
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'zoom', Math.max(1, device.controls.zoom - 1))}
                              className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                            >
                              <ZoomOut className="h-3 w-3" />
                            </button>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">{device.controls.zoom}x</span>
                            <button 
                              onClick={() => updateDeviceControl(device.id, 'zoom', Math.min(10, device.controls.zoom + 1))}
                              className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                            >
                              <ZoomIn className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Brightness</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={device.controls.brightness || 80}
                            onChange={(e) => updateDeviceControl(device.id, 'brightness', parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-xs">{device.controls.brightness || 80}%</span>
                        </div>
                        <div className="bg-gray-100 h-24 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-xs">Otoscope Live Feed</span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={captureOtoscopeImage}
                            disabled={capturingOtoscope}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-green-700 disabled:opacity-50"
                          >
                            {capturingOtoscope ? (
                              <Loader className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            <span>Save Image</span>
                          </button>
                          <button className="bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-purple-700">
                            <Play className="h-3 w-3" />
                            <span>Record</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {device.id === 'stethoscope' && (
                      <div className="space-y-3">
                        <div className="bg-green-50 p-2 rounded text-center">
                          <span className="text-sm font-medium text-green-800">Digital Stethoscope Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Volume</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={device.controls.volume}
                            onChange={(e) => updateDeviceControl(device.id, 'volume', parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-xs">{device.controls.volume}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Filter</span>
                          <select
                            value={device.controls.filter}
                            onChange={(e) => updateDeviceControl(device.id, 'filter', e.target.value)}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="normal">Normal</option>
                            <option value="heart">Heart Focus</option>
                            <option value="lung">Lung Focus</option>
                          </select>
                        </div>
                        <div className="bg-gray-100 h-16 rounded flex items-center justify-center">
                          <div className="flex space-x-1">
                            {[...Array(8)].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-1 bg-green-500 rounded animate-pulse"
                                style={{ 
                                  height: `${Math.random() * 20 + 10}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={captureStethoscopeAudio}
                            disabled={capturingStethoscope}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-red-700 disabled:opacity-50"
                          >
                            {capturingStethoscope ? (
                              <Loader className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            <span>Save Audio</span>
                          </button>
                          <button 
                            onClick={() => updateDeviceControl(device.id, 'recording', !device.controls.recording)}
                            className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${
                              device.controls.recording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            } text-white`}
                          >
                            {device.controls.recording ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            <span>{device.controls.recording ? 'Stop' : 'Record'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {device.id === 'ultrasound' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <span className="text-sm font-medium text-blue-800">Portable Ultrasound Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Depth</span>
                          <input
                            type="range"
                            min="5"
                            max="20"
                            value={device.controls.depth}
                            onChange={(e) => updateDeviceControl(device.id, 'depth', parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-xs">{device.controls.depth}cm</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Gain</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={device.controls.gain}
                            onChange={(e) => updateDeviceControl(device.id, 'gain', parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-xs">{device.controls.gain}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Mode</span>
                          <select
                            value={device.controls.mode}
                            onChange={(e) => updateDeviceControl(device.id, 'mode', e.target.value)}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="B-Mode">B-Mode</option>
                            <option value="M-Mode">M-Mode</option>
                            <option value="Doppler">Doppler</option>
                          </select>
                        </div>
                        <div className="bg-black h-24 rounded flex items-center justify-center">
                          <span className="text-white text-xs">Ultrasound Imaging</span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={captureUltrasoundImage}
                            disabled={capturingUltrasound}
                            className="bg-indigo-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {capturingUltrasound ? (
                              <Loader className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            <span>Save Image</span>
                          </button>
                          <button className="bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-yellow-700">
                            <Settings className="h-3 w-3" />
                            <span>Freeze</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {devices.filter(device => device.status === 'connected').length === 0 && (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">No devices connected</p>
                  <p className="text-gray-500 text-xs">Use the device list to connect medical devices</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Panel */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Panel Tabs */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex space-x-4">
              <button
                onClick={() => { setShowDevices(true); setShowNotes(false); }}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  showDevices ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Readings
              </button>
              <button
                onClick={() => { setShowDevices(false); setShowNotes(true); }}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  showNotes ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Notes
              </button>
            </div>
            
            {/* Connection Status */}
            <div className="mt-3 flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${
                isConnecting ? 'bg-yellow-500 animate-pulse' :
                connectionError ? 'bg-red-500' :
                remoteVideoStream ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-xs text-gray-600">
                {isConnecting ? 'Connecting...' :
                 connectionError ? 'Connection Error' :
                 remoteVideoStream ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {showDevices && (
              <div className="p-4 space-y-4">
                <VitalsPanel
                  patientId={appointment?.patientId}
                  autoRefresh={true}
                  compact={false}
                />

                <h3 className="font-semibold text-gray-900 mb-4 mt-6">Other Medical Device Feeds</h3>
                
                {/* Connected Device Feeds */}
                {Object.entries(connectedDevices).map(([deviceId, deviceData]) => {
                  const device = devices.find(d => d.id === deviceId);
                  if (!device) return null;
                  
                  return (
                    <div key={deviceId} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{device.name}</h4>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600">Live</span>
                        </div>
                      </div>
                      
                      {device.id === 'otoscope' && (
                        <div className="space-y-2">
                          <div className="bg-gray-200 h-32 rounded flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Otoscope Feed</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Resolution: {deviceData.data.resolution}</p>
                            <p>Magnification: {deviceData.data.magnification}</p>
                          </div>
                        </div>
                      )}
                      
                      {device.id === 'stethoscope' && (
                        <div className="space-y-2">
                          <div className="bg-gray-200 h-16 rounded flex items-center justify-center">
                            <div className="flex space-x-1">
                              {[...Array(10)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-1 bg-green-500 rounded animate-pulse"
                                  style={{ 
                                    height: `${Math.random() * 20 + 10}px`,
                                    animationDelay: `${i * 0.1}s`
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Heart Rate: {deviceData.data.heartRate} BPM</p>
                            <p>Audio Level: {deviceData.data.audioLevel}%</p>
                          </div>
                        </div>
                      )}
                      
                      {device.id === 'ultrasound' && (
                        <div className="space-y-2">
                          <div className="bg-black h-32 rounded flex items-center justify-center">
                            <span className="text-white text-sm">Ultrasound Imaging</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Mode: {deviceData.data.mode}</p>
                            <p>Depth: {deviceData.data.depth}</p>
                            <p>Frequency: {deviceData.data.frequency}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {currentDeviceReadings.map((reading, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <reading.icon className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{reading.deviceType}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600">Live</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900">
                        {reading.reading}
                      </span>
                      <span className="text-sm text-gray-600">{reading.unit}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reading.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {reading.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showNotes && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consultation Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter consultation notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Prescription
                  </label>
                  <textarea
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter prescription details..."
                  />
                </div>

                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Save Notes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;