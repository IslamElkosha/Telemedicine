import { AdminUser, MedicalKit } from '../types/admin';

// Validation utilities for admin operations
export const validateUser = (userData: Partial<AdminUser>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Basic validation
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Valid email address is required');
  }

  if (!userData.role) {
    errors.push('User role is required');
  }

  // Role-specific validation
  if (userData.role === 'doctor') {
    if (!userData.specialty) {
      errors.push('Specialty is required for doctors');
    }
    if (!userData.license || userData.license.length < 5) {
      errors.push('Valid license number is required for doctors');
    }
  }

  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateKit = (kitData: Partial<MedicalKit>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!kitData.kitNumber || kitData.kitNumber.trim().length < 5) {
    errors.push('Kit number must be at least 5 characters long');
  }

  if (!kitData.city || kitData.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!kitData.devices || kitData.devices.length === 0) {
    errors.push('At least one device must be assigned to the kit');
  }

  if (kitData.status === 'deployed' && !kitData.technician && !kitData.hospital) {
    errors.push('Deployed kits must be assigned to either a technician or hospital');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateKitNumber = (kitNumber: string, existingKits: MedicalKit[]): boolean => {
  return !existingKits.some(kit => kit.kitNumber === kitNumber);
};

export const validateUserEmail = (email: string, existingUsers: AdminUser[], excludeUserId?: string): boolean => {
  return !existingUsers.some(user => 
    user.email.toLowerCase() === email.toLowerCase() && user.id !== excludeUserId
  );
};

export const validateDoctorLicense = (license: string, existingUsers: AdminUser[], excludeUserId?: string): boolean => {
  return !existingUsers.some(user => 
    user.role === 'doctor' && user.license === license && user.id !== excludeUserId
  );
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Data sanitization
export const sanitizeUserData = (userData: Partial<AdminUser>): Partial<AdminUser> => {
  return {
    ...userData,
    name: userData.name?.trim(),
    email: userData.email?.toLowerCase().trim(),
    phone: userData.phone?.trim(),
    city: userData.city?.trim(),
    governorate: userData.governorate?.trim(),
    specialty: userData.specialty?.trim(),
    license: userData.license?.toUpperCase().trim(),
    bio: userData.bio?.trim()
  };
};

export const sanitizeKitData = (kitData: Partial<MedicalKit>): Partial<MedicalKit> => {
  return {
    ...kitData,
    kitNumber: kitData.kitNumber?.toUpperCase().trim(),
    city: kitData.city?.trim(),
    governorate: kitData.governorate?.trim(),
    address: kitData.address?.trim(),
    technician: kitData.technician?.trim() || null,
    hospital: kitData.hospital?.trim() || null
  };
};

// Permission checks
export const canEditUser = (currentUserRole: string, targetUserRole: string): boolean => {
  if (currentUserRole !== 'admin') return false;
  
  // Admins can edit all users except other admins (for security)
  return targetUserRole !== 'admin';
};

export const canDeleteUser = (currentUserRole: string, targetUserRole: string): boolean => {
  if (currentUserRole !== 'admin') return false;
  
  // Admins can delete all users except other admins (for security)
  return targetUserRole !== 'admin';
};

export const canManageKit = (currentUserRole: string): boolean => {
  return currentUserRole === 'admin';
};

// Data formatting utilities
export const formatCurrency = (amount: number, currency: string = 'LE'): string => {
  return `${amount.toLocaleString()} ${currency}`;
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Search and filter utilities
export const searchUsers = (users: AdminUser[], searchTerm: string): AdminUser[] => {
  if (!searchTerm.trim()) return users;
  
  const term = searchTerm.toLowerCase();
  return users.filter(user =>
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term) ||
    user.city.toLowerCase().includes(term) ||
    user.role.toLowerCase().includes(term) ||
    (user.specialty && user.specialty.toLowerCase().includes(term))
  );
};

export const filterUsersByRole = (users: AdminUser[], role: string): AdminUser[] => {
  if (role === 'all') return users;
  return users.filter(user => user.role === role);
};

export const searchKits = (kits: MedicalKit[], searchTerm: string): MedicalKit[] => {
  if (!searchTerm.trim()) return kits;
  
  const term = searchTerm.toLowerCase();
  return kits.filter(kit =>
    kit.id.toLowerCase().includes(term) ||
    kit.kitNumber.toLowerCase().includes(term) ||
    kit.city.toLowerCase().includes(term) ||
    (kit.technician && kit.technician.toLowerCase().includes(term)) ||
    (kit.hospital && kit.hospital.toLowerCase().includes(term)) ||
    kit.devices.some(device => device.toLowerCase().includes(term))
  );
};

export const filterKitsByStatus = (kits: MedicalKit[], status: string): MedicalKit[] => {
  if (status === 'all') return kits;
  return kits.filter(kit => kit.status === status);
};