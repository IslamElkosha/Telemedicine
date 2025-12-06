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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            await loadUserProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string, retries = 3) => {
    console.log('[AuthContext] loadUserProfile started for userId:', userId);

    for (let i = 0; i < retries; i++) {
      console.log(`[AuthContext] loadUserProfile - Attempt ${i + 1}/${retries}`);
      const queryStart = Date.now();

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const queryTime = Date.now() - queryStart;
      console.log(`[AuthContext] loadUserProfile - User query completed in ${queryTime}ms`, {
        hasData: !!userData,
        hasError: !!userError,
        errorMessage: userError?.message
      });

      if (userError || !userData) {
        if (i < retries - 1) {
          console.log('[AuthContext] loadUserProfile - User query failed, retrying after 500ms delay...');
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        } else {
          console.error('[AuthContext] loadUserProfile - Failed to fetch user data after all retries');
          return;
        }
      }

      const profileQueryStart = Date.now();
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();

      const profileQueryTime = Date.now() - profileQueryStart;
      console.log(`[AuthContext] loadUserProfile - Profile query completed in ${profileQueryTime}ms`, {
        hasProfile: !!profileData
      });

      let roleSpecificData: any = {};
      const userRole = reverseRoleMapping[userData.role] || 'patient';

      console.log('[AuthContext] loadUserProfile - Role mapping:', {
        databaseRole: userData.role,
        mappedRole: userRole
      });

      if (userRole === 'doctor') {
        const doctorQueryStart = Date.now();
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('specialty, licenseNo')
          .eq('id', userId)
          .maybeSingle();

        const doctorQueryTime = Date.now() - doctorQueryStart;
        console.log(`[AuthContext] loadUserProfile - Doctor query completed in ${doctorQueryTime}ms`, {
          hasData: !!doctorData,
          specialty: doctorData?.specialty
        });

        if (doctorData) {
          roleSpecificData = {
            specialty: doctorData.specialty,
            license: doctorData.licenseNo
          };
        }
      } else if (userRole === 'patient') {
        const patientQueryStart = Date.now();
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const patientQueryTime = Date.now() - patientQueryStart;
        console.log(`[AuthContext] loadUserProfile - Patient query completed in ${patientQueryTime}ms`, {
          hasData: !!patientData
        });

        if (patientData) {
          roleSpecificData = {
            bloodType: patientData.bloodType,
            allergies: patientData.allergies,
            heightCm: patientData.heightCm,
            weightKg: patientData.weightKg
          };
        }
      }

      console.log('[AuthContext] loadUserProfile - Getting auth user...');
      const authUserStart = Date.now();

      const { data: { user: authUser } } = await supabase.auth.getUser();

      const authUserTime = Date.now() - authUserStart;
      console.log(`[AuthContext] loadUserProfile - Auth user fetched in ${authUserTime}ms`);

      const userEmail = userData.email || authUser?.email || '';
      const userName = profileData?.fullName || authUser?.user_metadata?.full_name || userData.email?.split('@')[0] || 'User';

      const userObject = {
        id: userData.id,
        name: userName,
        email: userEmail,
        role: userRole,
        avatar: profileData?.avatarUrl,
        phone: userData.phone,
        createdAt: new Date(userData.createdAt),
        isVerified: userData.status === 'ACTIVE',
        ...roleSpecificData
      };

      console.log('[AuthContext] loadUserProfile - Setting user object:', {
        id: userObject.id,
        email: userObject.email,
        role: userObject.role,
        name: userObject.name,
        specialty: userObject.specialty
      });

      setUser(userObject);
      return;
    }

    console.error('[AuthContext] loadUserProfile - Failed after all retries');
  };

  const login = async (email: string, password: string, role: User['role']): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      console.log('[AuthContext] Login attempt started');
      console.log('[AuthContext] Received parameters:', {
        email: email,
        emailType: typeof email,
        emailLength: email?.length,
        password: password ? '***' + password.slice(-3) : 'undefined',
        passwordType: typeof password,
        passwordLength: password?.length,
        role: role
      });

      if (!validateEmail(email)) {
        console.error('[AuthContext] Email validation failed:', email);
        return { success: false, error: { field: 'email', message: 'Please enter a valid email address' } };
      }

      if (!password) {
        console.error('[AuthContext] Password is missing or empty');
        return { success: false, error: { field: 'password', message: 'Password is required' } };
      }

      const loginPayload = {
        email: email.toLowerCase(),
        password: password
      };

      console.log('[AuthContext] Prepared login payload:', {
        email: loginPayload.email,
        password: loginPayload.password ? '***' + loginPayload.password.slice(-3) : 'missing',
        passwordLength: loginPayload.password?.length
      });

      console.log('[AuthContext] Calling supabase.auth.signInWithPassword...');
      const startTime = Date.now();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword(loginPayload);

      const elapsedTime = Date.now() - startTime;
      console.log('[AuthContext] Supabase response received:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        hasError: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status,
        elapsedTimeMs: elapsedTime,
        elapsedTimeSec: (elapsedTime / 1000).toFixed(2) + 's'
      });

      if (authError) {
        console.error('[AuthContext] Authentication error:', authError);
        return { success: false, error: { message: 'Invalid email or password' } };
      }

      if (!authData.user) {
        return { success: false, error: { message: 'Login failed' } };
      }

      console.log('[AuthContext] Fetching user role from database...');
      const roleQueryStart = Date.now();

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      const roleQueryTime = Date.now() - roleQueryStart;
      console.log('[AuthContext] Role query completed:', {
        elapsedMs: roleQueryTime,
        hasUserData: !!userData,
        role: userData?.role
      });

      const userRole = userData ? reverseRoleMapping[userData.role] : null;

      if (userRole !== role) {
        console.log('[AuthContext] Role mismatch, signing out');
        await supabase.auth.signOut();
        return { success: false, error: { message: `This account is not registered as a ${role}` } };
      }

      console.log('[AuthContext] Loading user profile...');
      const profileLoadStart = Date.now();

      await loadUserProfile(authData.user.id);

      const profileLoadTime = Date.now() - profileLoadStart;
      console.log('[AuthContext] Profile loaded:', {
        elapsedMs: profileLoadTime
      });

      console.log('[AuthContext] Login completed successfully, total time:', {
        totalMs: Date.now() - startTime,
        totalSec: ((Date.now() - startTime) / 1000).toFixed(2) + 's'
      });

      return { success: true };
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return { success: false, error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const register = async (userData: RegistrationData): Promise<{ success: boolean; error?: AuthError }> => {
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
      console.error('[AuthContext] Registration error:', error);
      return { success: false, error: { message: 'An unexpected error occurred during registration. Please try again.' } };
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: AuthError }> => {
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
      console.error('[AuthContext] Update profile error:', error);
      return { success: false, error: { message: 'Failed to update profile. Please try again.' } };
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
