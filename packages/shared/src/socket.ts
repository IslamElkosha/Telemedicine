import { io, Socket } from 'socket.io-client';
import { SocketEvents } from './types.js';

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(serverUrl: string = 'http://localhost:3001') {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }

    this.socket = io(serverUrl, {
      auth: {
        token: this.token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(room: string) {
    if (this.socket) {
      this.socket.emit('join-room', room);
    }
  }

  leaveRoom(room: string) {
    if (this.socket) {
      this.socket.emit('leave-room', room);
    }
  }

  // Appointment events
  onAppointmentStatusChanged(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('appointment:status-changed', callback);
    }
  }

  // Reading events
  onNewReading(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('reading:new', callback);
    }
  }

  submitReading(sessionId: string, reading: any) {
    if (this.socket) {
      this.socket.emit('reading:submit', { sessionId, reading });
    }
  }

  // Notification events
  onNewNotification(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notification:new', callback);
    }
  }

  // Technician location updates
  onTechnicianLocationUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('technician:location-updated', callback);
    }
  }

  updateTechnicianLocation(technicianId: string, location: { lat: number; lng: number }) {
    if (this.socket) {
      this.socket.emit('technician:location-updated', { technicianId, location });
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketClient = new SocketClient();

// React hooks for Socket.IO
export function useLiveAppointment(appointmentId: string) {
  const [appointment, setAppointment] = React.useState(null);

  React.useEffect(() => {
    if (!appointmentId) return;

    socketClient.joinRoom(`appointments:${appointmentId}`);
    
    const handleStatusChange = (data: any) => {
      if (data.appointmentId === appointmentId) {
        setAppointment((prev: any) => ({ ...prev, status: data.status }));
      }
    };

    socketClient.onAppointmentStatusChanged(handleStatusChange);

    return () => {
      socketClient.leaveRoom(`appointments:${appointmentId}`);
    };
  }, [appointmentId]);

  return appointment;
}

export function useSessionReadings(sessionId: string) {
  const [readings, setReadings] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!sessionId) return;

    socketClient.joinRoom(`sessions:${sessionId}`);
    
    const handleNewReading = (data: any) => {
      if (data.sessionId === sessionId) {
        setReadings((prev) => [...prev, data.reading]);
      }
    };

    socketClient.onNewReading(handleNewReading);

    return () => {
      socketClient.leaveRoom(`sessions:${sessionId}`);
    };
  }, [sessionId]);

  return readings;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!userId) return;

    socketClient.joinRoom(`user:${userId}`);
    
    const handleNewNotification = (data: any) => {
      setNotifications((prev) => [data.notification, ...prev]);
    };

    socketClient.onNewNotification(handleNewNotification);

    return () => {
      socketClient.leaveRoom(`user:${userId}`);
    };
  }, [userId]);

  return notifications;
}