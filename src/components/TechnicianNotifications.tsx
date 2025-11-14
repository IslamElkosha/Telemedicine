import React from 'react';
import { useTechnician } from '../contexts/TechnicianContext';
import { 
  Bell, 
  Calendar, 
  Package, 
  DollarSign, 
  Settings, 
  CheckCircle,
  Trash2,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TechnicianNotificationsProps {
  onClose: () => void;
}

const TechnicianNotifications: React.FC<TechnicianNotificationsProps> = ({ onClose }) => {
  const { 
    notifications, 
    unreadNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useTechnician();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new-assignment':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'appointment-update':
        return <Calendar className="h-4 w-4 text-green-600" />;
      case 'kit-maintenance':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      // In a real app, navigate to the action URL
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadNotifications > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {unreadNotifications > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            You have {unreadNotifications} unread notification{unreadNotifications !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                  !notification.isRead ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </span>
                          <span className="capitalize bg-gray-100 px-2 py-1 rounded-full">
                            {notification.type.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id);
                            }}
                            className="text-purple-600 hover:text-purple-700 p-1"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No notifications yet</p>
            <p className="text-sm text-gray-500 mt-1">
              We'll notify you about new assignments and updates
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianNotifications;