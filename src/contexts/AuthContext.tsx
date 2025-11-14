import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'technician' | 'admin' | 'hospital' | 'freelance-tech';
  avatar?: string;
  specialty?: string;
  license?: string;
  experience?: number;
  createdAt: Date;
  isVerified?: boolean;
  phone?: string;
  dateOfBirth?: string;
  governorate?: string;
  city?: string;
  address?: string;
  medicalHistory?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: User['role'];
  specialty?: string;
  license?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface AuthError {
  field?: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: User['role']) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => void;
  register: (userData: RegistrationData) => Promise<{ success: boolean; error?: AuthError }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: AuthError }>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const roleMapping: Record<User['role'], string> = {
  'patient': 'PATIENT',
  'doctor': 'DOCTOR',
  'technician': 'TECHNICIAN',
  'admin': 'ADMIN',
  'hospital': 'HOSPITAL_ADMIN',
  'freelance-tech': 'FREELANCE_TECHNICIAN'
};

const reverseRoleMapping: Record<string, User['role']> = {
  'PATIENT': 'patient',
  'DOCTOR': 'doctor',
  'TECHNICIAN': 'technician',
  'ADMIN': 'admin',
  'HOSPITAL_ADMIN': 'hospital',
  'FREELANCE_TECHNICIAN': 'freelance-tech'
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  return { isValid: true };
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name);
};

const validateLicense = (license: string): { isValid: boolean; message?: string } => {
  if (license.length < 5) {
    return { isValid: false, message: 'License number must be at least 5 characters long' };
  }
  if (!/^[A-Z0-9]+$/.test(license)) {
    return { isValid: false, message: 'License number must contain only uppercase letters and numbers' };
  }
  return { isValid: true };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  const loadUserProfile = async (userId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles(*),
          doctors(specialty, licenseNo),
          patients(*)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const profile = data.user_profiles as any;
        const userRole = reverseRoleMapping[data.role] || 'patient';

        setUser({
          id: data.id,
          name: profile?.fullName || '',
          email: data.email,
          role: userRole,
          avatar: profile?.avatarUrl,
          specialty: data.doctors?.specialty,
          license: data.doctors?.licenseNo,
          phone: data.phone,
          createdAt: new Date(data.createdAt),
          isVerified: data.status === 'ACTIVE'
        });
        return;
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const login = async (email: string, password: string, role: User['role']): Promise<{ success: boolean; error?: AuthError }> => {
    setLoading(true);

    try {
      if (!validateEmail(email)) {
        return { success: false, error: { field: 'email', message: 'Please enter a valid email address' } };
      }

      if (!password) {
        return { success: false, error: { field: 'password', message: 'Password is required' } };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      });

      if (authError) {
        return { success: false, error: { message: 'Invalid email or password' } };
      }

      if (!authData.user) {
        return { success: false, error: { message: 'Login failed' } };
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      const userRole = userData ? reverseRoleMapping[userData.role] : null;

      if (userRole !== role) {
        await supabase.auth.signOut();
        return { success: false, error: { message: `This account is not registered as a ${role}` } };
      }

      await loadUserProfile(authData.user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: 'An unexpected error occurred. Please try again.' } };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const register = async (userData: RegistrationData): Promise<{ success: boolean; error?: AuthError }> => {
    setLoading(true);

    try {
      if (!validateName(userData.name)) {
        return { success: false, error: { field: 'name', message: 'Please enter a valid name (letters and spaces only, minimum 2 characters)' } };
      }

      if (!validateEmail(userData.email)) {
        return { success: false, error: { field: 'email', message: 'Please enter a valid email address' } };
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: { field: 'email', message: 'This email is already registered. Please use a different email or try logging in.' } };
      }

      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        return { success: false, error: { field: 'password', message: passwordValidation.message } };
      }

      if (userData.password !== userData.confirmPassword) {
        return { success: false, error: { field: 'confirmPassword', message: 'Passwords do not match' } };
      }

      if (userData.role === 'doctor') {
        if (!userData.specialty) {
          return { success: false, error: { field: 'specialty', message: 'Specialty is required for doctors' } };
        }
        if (!userData.license) {
          return { success: false, error: { field: 'license', message: 'License number is required for doctors' } };
        }

        const licenseValidation = validateLicense(userData.license);
        if (!licenseValidation.isValid) {
          return { success: false, error: { field: 'license', message: licenseValidation.message } };
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase(),
        password: userData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: userData.name,
            role: roleMapping[userData.role],
            specialty: userData.specialty,
            license: userData.license,
            dateOfBirth: userData.dateOfBirth,
            phone: userData.phone
          }
        }
      });

      if (authError) {
        return { success: false, error: { message: authError.message } };
      }

      if (!authData.user) {
        return { success: false, error: { message: 'Registration failed' } };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      await loadUserProfile(authData.user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: 'An unexpected error occurred during registration. Please try again.' } };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: AuthError }> => {
    setLoading(true);

    try {
      if (!user) {
        return { success: false, error: { message: 'No user logged in' } };
      }

      if (updates.name) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ fullName: updates.name })
          .eq('userId', user.id);

        if (error) {
          return { success: false, error: { message: 'Failed to update profile' } };
        }
      }

      await loadUserProfile(user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: 'Failed to update profile. Please try again.' } };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    updateProfile,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
