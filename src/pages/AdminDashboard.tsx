import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import FinancialReportModal from '../components/FinancialReportModal';
import { 
  Users, 
  Package, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Bell, 
  Settings, 
  LogOut,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  Save,
  UserPlus,
  PackagePlus,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Shield,
  MapPin
} from 'lucide-react';
import { egyptianGovernorates, getCitiesByGovernorate } from '../data/egyptianLocations';
import { useFinancialData } from '../hooks/useFinancialData';
import { AdminUser } from '../types/admin';
import { validateUser, sanitizeUserData } from '../utils/adminValidation';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, fetchStats } = useAdminData();
  const [showFinancialModal, setShowFinancialModal] = useState(false);

  React.useEffect(() => {
    fetchStats();
  }, []);
  const [showFinancialReport, setShowFinancialReport] = useState(false);
  const {
    users,
    kits,
    financialData,
    activities,
    stats: adminStats,
    loading,
    error,
    fetchUsers,
    fetchKits,
    fetchFinancialData,
    fetchSystemActivities,
    createUser,
    updateUser,
    deleteUser,
    createKit,
    updateKit,
    deleteKit,
    exportUsers,
    exportFinancialReport,
    clearError
  } = useAdminData();
  
  const { revenueData, loading: financialLoading } = useFinancialData();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingKit, setEditingKit] = useState<any>(null);
  const [selectedKit, setSelectedKit] = useState<any>(null);
  const [showKitDetails, setShowKitDetails] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [showPassword, setShowPassword] = useState(false);

  // Form data for user creation/editing
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient' as AdminUser['role'],
    phone: '',
    city: '',
    governorate: '',
    specialty: '',
    license: '',
    experience: 0
  });

  // Form data for kit creation/editing
  const [kitFormData, setKitFormData] = useState({
    kitNumber: '',
    serialNumber: '',
    city: '',
    governorate: '',
    address: '',
    devices: [] as string[],
    technician: '',
    hospital: '',
    status: 'available' as 'available' | 'deployed' | 'maintenance'
  });

  const [kitSearchTerm, setKitSearchTerm] = useState('');
  const [kitStatusFilter, setKitStatusFilter] = useState('all');
  const [selectedKits, setSelectedKits] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchKits();
    fetchFinancialData();
    fetchSystemActivities();
  }, []);

  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Activity, key: 'dashboard' },
    { name: 'User Management', href: '/admin/users', icon: Users, key: 'users' },
    { name: 'Kit Management', href: '/admin/kits', icon: Package, key: 'kits' },
    { name: 'Financial', href: '/admin/financial', icon: DollarSign, key: 'financial' },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, key: 'analytics' },
    { name: 'System Logs', href: '/admin/logs', icon: Shield, key: 'logs' },
  ];

  // Handle user form submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateUser(userFormData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    const sanitizedData = sanitizeUserData(userFormData);
    
    if (editingUser) {
      const result = await updateUser(editingUser.id, sanitizedData);
      if (result.success) {
        setShowUserModal(false);
        setEditingUser(null);
        resetUserForm();
      }
    } else {
      const result = await createUser(sanitizedData);
      if (result.success) {
        setShowUserModal(false);
        resetUserForm();
      }
    }
  };

  // Reset user form
  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'patient',
      phone: '',
      city: '',
      governorate: '',
      specialty: '',
      license: '',
      experience: 0
    });
  };

  // Reset kit form
  const resetKitForm = () => {
    setKitFormData({
      kitNumber: '',
      serialNumber: '',
      city: '',
      governorate: '',
      address: '',
      devices: [],
      technician: '',
      hospital: '',
      status: 'available'
    });
  };

  // Handle kit form submission
  const handleKitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingKit) {
      const result = await updateKit(editingKit.id, kitFormData);
      if (result.success) {
        setShowKitModal(false);
        setEditingKit(null);
        resetKitForm();
      }
    } else {
      const result = await createKit(kitFormData);
      if (result.success) {
        setShowKitModal(false);
        resetKitForm();
      }
    }
  };

  // Handle kit editing
  const handleEditKit = (kit: any) => {
    setEditingKit(kit);
    setKitFormData({
      kitNumber: kit.kitNumber,
      serialNumber: kit.serialNumber || '',
      city: kit.city,
      governorate: kit.governorate,
      address: kit.address,
      devices: kit.devices || [],
      technician: kit.technician || '',
      hospital: kit.hospital || '',
      status: kit.status
    });
    setShowKitModal(true);
  };

  // Handle kit deletion
  const handleDeleteKit = async (kitId: string) => {
    if (window.confirm('Are you sure you want to delete this kit?')) {
      await deleteKit(kitId);
    }
  };

  // View kit details
  const handleViewKit = (kit: any) => {
    setSelectedKit(kit);
    setShowKitDetails(true);
  };

  // Handle user editing
  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      city: user.city,
      governorate: user.governorate,
      specialty: user.specialty || '',
      license: user.license || '',
      experience: user.experience || 0
    });
    setShowUserModal(true);
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    switch (bulkAction) {
      case 'delete':
        if (window.confirm(`Delete ${selectedUsers.length} selected users?`)) {
          for (const userId of selectedUsers) {
            await deleteUser(userId);
          }
          setSelectedUsers([]);
        }
        break;
      case 'activate':
        for (const userId of selectedUsers) {
          await updateUser(userId, { status: 'active' });
        }
        setSelectedUsers([]);
        break;
      case 'deactivate':
        for (const userId of selectedUsers) {
          await updateUser(userId, { status: 'inactive' });
        }
        setSelectedUsers([]);
        break;
    }
    setBulkAction('');
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter kits based on search and filters
  const filteredKits = kits.filter(kit => {
    const matchesSearch = kit.kitNumber.toLowerCase().includes(kitSearchTerm.toLowerCase()) ||
                         kit.serialNumber?.toLowerCase().includes(kitSearchTerm.toLowerCase()) ||
                         kit.city.toLowerCase().includes(kitSearchTerm.toLowerCase());
    const matchesStatus = kitStatusFilter === 'all' || kit.status === kitStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Available devices for kits
  const availableDevices = [
    'Blood Pressure Monitor',
    'Pulse Oximeter',
    'Digital Thermometer',
    'Digital Stethoscope',
    'ECG Device',
    'Ultrasound Probe',
    'Otoscope',
    'Ophthalmoscope',
    'Glucometer',
    'Peak Flow Meter'
  ];

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">System Administration</h2>
        <p className="text-red-100">Manage users, kits, and monitor system performance</p>
      </div>

      {/* Key Statistics */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Kits</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.deployedKits}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Doctors</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.activeDoctors}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.monthlyRevenue} LE</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent System Activities</h3>
        </div>
        <div className="p-6">
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.user}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );

  // User Management Component
  const UserManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => exportUsers(exportFormat)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="technician">Technicians</option>
            <option value="hospital">Hospitals</option>
            <option value="freelance-tech">Freelance Techs</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="csv">Export as CSV</option>
            <option value="pdf">Export as PDF</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
              >
                <option value="">Select Action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'doctor' ? 'bg-green-100 text-green-800' :
                      user.role === 'patient' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'technician' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.city}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.joinDate}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Kit Management Component
  const KitManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Kit Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => exportUsers(exportFormat)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowKitModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PackagePlus className="h-4 w-4" />
            <span>Add Kit</span>
          </button>
        </div>
      </div>

      {/* Kit Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search kits..."
              value={kitSearchTerm}
              onChange={(e) => setKitSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={kitStatusFilter}
            onChange={(e) => setKitStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="deployed">Deployed</option>
            <option value="maintenance">Maintenance</option>
          </select>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Total Kits:</span>
            <span className="font-semibold text-gray-900">{filteredKits.length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Available:</span>
            <span className="font-semibold text-green-600">
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalRevenue.toLocaleString() || '0'} LE</p>
            </span>
          </div>
          <button
            onClick={() => setShowFinancialModal(true)}
            className="mt-3 w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            View Financial Details
          </button>
        </div>
      </div>

      {/* Kits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKits.map(kit => (
          <div key={kit.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{kit.kitNumber}</h3>
                <p className="text-sm text-gray-600">Serial: {kit.serialNumber || 'N/A'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                kit.status === 'available' ? 'bg-green-100 text-green-800' :
                kit.status === 'deployed' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {kit.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{kit.city}</span>
              </div>
              {kit.technician && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Technician: {kit.technician}</span>
                </div>
              )}
              {kit.hospital && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Hospital: {kit.hospital}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Package className="h-4 w-4 mr-2" />
                <span>{kit.devices?.length || 0} devices</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleViewKit(kit)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              <button
                onClick={() => handleEditKit(kit)}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteKit(kit.id)}
                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredKits.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No kits found</h3>
          <p className="text-gray-600 mb-4">
            {kitSearchTerm || kitStatusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by adding your first medical kit'
            }
          </p>
          <button
            onClick={() => setShowKitModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Kit
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Admin</h1>
                <p className="text-sm text-gray-600">System Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href === '/admin' && location.pathname === '/admin');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 text-sm mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/kits" element={<KitManagement />} />
              <Route path="/financial" element={<DashboardOverview />} />
              <Route path="/analytics" element={<DashboardOverview />} />
              <Route path="/logs" element={<DashboardOverview />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Financial Report Modal */}
      <FinancialReportModal
        isOpen={showFinancialModal}
        onClose={() => setShowFinancialModal(false)}
      />
      
      <FinancialReportModal 
        isOpen={showFinancialReport}
        onClose={() => setShowFinancialReport(false)}
      />

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    resetUserForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value as AdminUser['role'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="technician">Technician</option>
                    <option value="hospital">Hospital</option>
                    <option value="freelance-tech">Freelance Technician</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Governorate
                  </label>
                  <select
                    value={userFormData.governorate}
                    onChange={(e) => {
                      setUserFormData(prev => ({ ...prev, governorate: e.target.value, city: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Governorate</option>
                    {egyptianGovernorates.map(gov => (
                      <option key={gov.id} value={gov.id}>{gov.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  value={userFormData.city}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, city: e.target.value }))}
                  disabled={!userFormData.governorate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select City</option>
                  {userFormData.governorate && getCitiesByGovernorate(userFormData.governorate).map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>

              {userFormData.role === 'doctor' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialty *
                    </label>
                    <select
                      value={userFormData.specialty}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Specialty</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Gynecology">Gynecology</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Number *
                    </label>
                    <input
                      type="text"
                      value={userFormData.license}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, license: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    resetUserForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading && <Loader className="h-4 w-4 animate-spin" />}
                  <span>{editingUser ? 'Update User' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kit Modal */}
      {showKitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingKit ? 'Edit Kit' : 'Add New Kit'}
                </h3>
                <button
                  onClick={() => {
                    setShowKitModal(false);
                    setEditingKit(null);
                    resetKitForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleKitSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kit Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={kitFormData.kitNumber}
                    onChange={(e) => setKitFormData(prev => ({ ...prev, kitNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., KIT-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={kitFormData.serialNumber}
                    onChange={(e) => setKitFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., TMC-2025-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={kitFormData.status}
                    onChange={(e) => setKitFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="available">Available</option>
                    <option value="deployed">Deployed</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Governorate *
                  </label>
                  <select
                    value={kitFormData.governorate}
                    onChange={(e) => {
                      setKitFormData(prev => ({ ...prev, governorate: e.target.value, city: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Governorate</option>
                    {egyptianGovernorates.map(gov => (
                      <option key={gov.id} value={gov.id}>{gov.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <select
                    value={kitFormData.city}
                    onChange={(e) => setKitFormData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={!kitFormData.governorate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select City</option>
                    {kitFormData.governorate && getCitiesByGovernorate(kitFormData.governorate).map(city => (
                      <option key={city.id} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technician
                  </label>
                  <input
                    type="text"
                    value={kitFormData.technician}
                    onChange={(e) => setKitFormData(prev => ({ ...prev, technician: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Assigned technician"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={kitFormData.address}
                  onChange={(e) => setKitFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed address or location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Devices
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {availableDevices.map(device => (
                    <label key={device} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={kitFormData.devices.includes(device)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKitFormData(prev => ({
                              ...prev,
                              devices: [...prev.devices, device]
                            }));
                          } else {
                            setKitFormData(prev => ({
                              ...prev,
                              devices: prev.devices.filter(d => d !== device)
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{device}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {kitFormData.devices.length} device{kitFormData.devices.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowKitModal(false);
                    setEditingKit(null);
                    resetKitForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading && <Loader className="h-4 w-4 animate-spin" />}
                  <span>{editingKit ? 'Update Kit' : 'Create Kit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kit Details Modal */}
      {showKitDetails && selectedKit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedKit.kitNumber}</h3>
                  <p className="text-gray-600">Serial: {selectedKit.serialNumber}</p>
                </div>
                <button
                  onClick={() => {
                    setShowKitDetails(false);
                    setSelectedKit(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kit Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Kit Information</h4>
                  
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedKit.status === 'available' ? 'bg-green-100 text-green-800' :
                        selectedKit.status === 'deployed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedKit.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{selectedKit.city}</span>
                    </div>
                    
                    {selectedKit.technician && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Technician:</span>
                        <span className="font-medium">{selectedKit.technician}</span>
                      </div>
                    )}
                    
                    {selectedKit.hospital && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hospital:</span>
                        <span className="font-medium">{selectedKit.hospital}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Maintenance:</span>
                      <span className="font-medium">{selectedKit.lastMaintenance || 'N/A'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Maintenance:</span>
                      <span className="font-medium">{selectedKit.nextMaintenance || 'N/A'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery Status:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className={`h-full rounded-full ${
                              (selectedKit.batteryStatus || 0) > 50 ? 'bg-green-500' :
                              (selectedKit.batteryStatus || 0) > 20 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${selectedKit.batteryStatus || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{selectedKit.batteryStatus || 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedKit.address && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Address</h5>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedKit.address}</p>
                    </div>
                  )}
                </div>
                
                {/* Devices List */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Medical Devices</h4>
                  
                  <div className="space-y-2">
                    {selectedKit.devices && selectedKit.devices.length > 0 ? (
                      selectedKit.devices.map((device: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="font-medium text-gray-900">{device}</span>
                          </div>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Active
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No devices assigned</p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Kit Statistics</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Total Devices:</span>
                        <span className="font-medium ml-2">{selectedKit.devices?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Condition:</span>
                        <span className="font-medium ml-2">{selectedKit.condition || 'Good'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Total Visits:</span>
                        <span className="font-medium ml-2">{selectedKit.totalVisits || 0}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Uptime:</span>
                        <span className="font-medium ml-2">{selectedKit.uptime || '99.5%'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEditKit(selectedKit)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Kit</span>
                </button>
                <button
                  onClick={() => {
                    setShowKitDetails(false);
                    setSelectedKit(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showFinancialModal && (
        <FinancialReportModal
          isOpen={showFinancialModal}
          onClose={() => setShowFinancialModal(false)}
          revenueData={revenueData}
          loading={financialLoading}
        />
      )}
    </div>
  );
};

export default AdminDashboard;