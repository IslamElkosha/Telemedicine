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
  const loadingProfileRef = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] ========== Initializing Auth ==========');

        const storageData = localStorage.getItem('telemedicine-auth');
        console.log('[AuthContext] LocalStorage check:', {
          hasStorageData: !!storageData,
          storageLength: storageData?.length,
          storagePreview: storageData?.substring(0, 100) + '...'
        });

        console.log('[AuthContext] Calling supabase.auth.getSession()...');
        const sessionStart = Date.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        const sessionTime = Date.now() - sessionStart;

        console.log('[AuthContext] getSession completed in', sessionTime, 'ms');
        console.log('[AuthContext] getSession result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          hasAccessToken: !!session?.access_token,
          accessTokenPrefix: session?.access_token ? session.access_token.substring(0, 20) + '...' : null,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60) + ' minutes' : null,
          hasError: !!error,
          errorMessage: error?.message,
          errorCode: error?.code
        });

        if (!mounted) {
          console.log('[AuthContext] Component unmounted during initialization');
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] ✓ Valid session found, loading profile for:', session.user.id);
          await loadUserProfile(session.user.id);
        } else {
          console.log('[AuthContext] ✗ No session found, user needs to login');
          console.log('[AuthContext] This is expected for first-time visitors or logged-out users');
          setUser(null);
          setLoading(false);
        }

        console.log('[AuthContext] ========== Auth Initialization Complete ==========');
      } catch (error) {
        console.error('[AuthContext] ❌ Error initializing auth:', error);
        console.error('[AuthContext] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        hasAccessToken: !!session?.access_token,
        mounted,
        timestamp: new Date().toISOString()
      });

      if (!mounted) {
        console.log('[AuthContext] Component unmounted, skipping auth state change');
        return;
      }

      if (event === 'INITIAL_SESSION') {
        console.log('[AuthContext] Initial session detected');
        if (session?.user) {
          console.log('[AuthContext] Restoring session for user:', session.user.id);
          await loadUserProfile(session.user.id);
        } else {
          console.log('[AuthContext] No initial session found');
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AuthContext] User signed in event, loading profile');
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out, clearing state');
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[AuthContext] Token refreshed, ensuring profile is loaded');
        if (!user || user.id !== session.user.id) {
          await loadUserProfile(session.user.id);
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('[AuthContext] User updated, reloading profile');
        await loadUserProfile(session.user.id);
      } else if (!session) {
        console.log('[AuthContext] No session in auth state change, clearing user');
        setUser(null);
        setLoading(false);
      }
    });

    authSubscription = subscription;

    return () => {
      console.log('[AuthContext] Cleaning up subscriptions');
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const loadUserProfile = async (userId: string, retries = 3) => {
    if (loadingProfileRef.current) {
      console.log('[AuthContext] loadUserProfile already in progress, skipping duplicate call');
      return;
    }

    loadingProfileRef.current = true;
    console.log('[AuthContext] loadUserProfile started for userId:', userId);

    try {
      for (let i = 0; i < retries; i++) {
        console.log(`[AuthContext] loadUserProfile - Attempt ${i + 1}/${retries}`);
        const queryStart = Date.now();

        try {
          const queryPromise = supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
          );

          console.log('[AuthContext] loadUserProfile - Executing user query with timeout...');
          const { data: userData, error: userError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;

          const queryTime = Date.now() - queryStart;
          console.log(`[AuthContext] loadUserProfile - User query completed in ${queryTime}ms`);
          console.log('[AuthContext] loadUserProfile - Query result:', {
            hasData: !!userData,
            hasError: !!userError,
            errorCode: userError?.code,
            errorMessage: userError?.message,
            errorDetails: userError?.details,
            userData: userData ? {
              id: userData.id,
              email: userData.email,
              role: userData.role,
              status: userData.status
            } : null
          });

          if (userError) {
            console.error('[AuthContext] loadUserProfile - Database error:', {
              code: userError.code,
              message: userError.message,
              details: userError.details,
              hint: userError.hint
            });

            if (i < retries - 1) {
              console.log('[AuthContext] loadUserProfile - Retrying after 500ms delay...');
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            } else {
              console.error('[AuthContext] loadUserProfile - Failed after all retries due to error');
              setLoading(false);
              return;
            }
          }

          if (!userData) {
            console.error('[AuthContext] loadUserProfile - No user record found in database for userId:', userId);
            console.error('[AuthContext] This means the user exists in Auth but not in the users table');
            console.error('[AuthContext] Possible causes: trigger failed, RLS policy blocking, or record was deleted');

            const { data: { user: authUser } } = await supabase.auth.getUser();
            console.log('[AuthContext] Auth user data:', {
              id: authUser?.id,
              email: authUser?.email,
              metadata: authUser?.user_metadata
            });

            if (i < retries - 1) {
              console.log('[AuthContext] loadUserProfile - No data found, retrying after 1000ms delay...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            } else {
              console.error('[AuthContext] loadUserProfile - No user record after all retries');
              console.error('[AuthContext] Creating fallback user object from auth data');

              if (authUser) {
                const fallbackUser = {
                  id: authUser.id,
                  name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                  email: authUser.email || '',
                  role: 'patient' as const,
                  createdAt: new Date(),
                  isVerified: false
                };
                console.log('[AuthContext] Setting fallback user:', fallbackUser);
                setUser(fallbackUser);
                setLoading(false);
              }
              return;
            }
          }

          console.log('[AuthContext] loadUserProfile - User data found, proceeding to fetch profile...');
          const profileQueryStart = Date.now();

          const profileQueryPromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('userId', userId)
            .maybeSingle();

          const profileTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile query timeout')), 10000)
          );

          const { data: profileData, error: profileError } = await Promise.race([
            profileQueryPromise,
            profileTimeoutPromise
          ]) as any;

          const profileQueryTime = Date.now() - profileQueryStart;
          console.log(`[AuthContext] loadUserProfile - Profile query completed in ${profileQueryTime}ms`, {
            hasProfile: !!profileData,
            hasError: !!profileError,
            errorMessage: profileError?.message
          });

          let roleSpecificData: any = {};
          const userRole = reverseRoleMapping[userData.role] || 'patient';

          console.log('[AuthContext] loadUserProfile - Role mapping:', {
            databaseRole: userData.role,
            mappedRole: userRole
          });

          if (userRole === 'doctor') {
            console.log('[AuthContext] loadUserProfile - Fetching doctor-specific data...');
            const doctorQueryStart = Date.now();

            const doctorQueryPromise = supabase
              .from('doctors')
              .select('specialty, licenseNo')
              .eq('id', userId)
              .maybeSingle();

            const doctorTimeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Doctor query timeout')), 10000)
            );

            const { data: doctorData, error: doctorError } = await Promise.race([
              doctorQueryPromise,
              doctorTimeoutPromise
            ]) as any;

            const doctorQueryTime = Date.now() - doctorQueryStart;
            console.log(`[AuthContext] loadUserProfile - Doctor query completed in ${doctorQueryTime}ms`, {
              hasData: !!doctorData,
              hasError: !!doctorError,
              specialty: doctorData?.specialty,
              errorMessage: doctorError?.message
            });

            if (doctorData) {
              roleSpecificData = {
                specialty: doctorData.specialty,
                license: doctorData.licenseNo
              };
            } else {
              console.warn('[AuthContext] loadUserProfile - No doctor record found for doctor user');
            }
          } else if (userRole === 'patient') {
            console.log('[AuthContext] loadUserProfile - Fetching patient-specific data...');
            const patientQueryStart = Date.now();

            const patientQueryPromise = supabase
              .from('patients')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            const patientTimeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Patient query timeout')), 10000)
            );

            const { data: patientData, error: patientError } = await Promise.race([
              patientQueryPromise,
              patientTimeoutPromise
            ]) as any;

            const patientQueryTime = Date.now() - patientQueryStart;
            console.log(`[AuthContext] loadUserProfile - Patient query completed in ${patientQueryTime}ms`, {
              hasData: !!patientData,
              hasError: !!patientError,
              errorMessage: patientError?.message
            });

            if (patientData) {
              roleSpecificData = {
                bloodType: patientData.bloodType,
                allergies: patientData.allergies,
                heightCm: patientData.heightCm,
                weightKg: patientData.weightKg
              };
            } else {
              console.warn('[AuthContext] loadUserProfile - No patient record found for patient user');
            }
          }

          console.log('[AuthContext] loadUserProfile - Getting auth user metadata...');
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

          console.log('[AuthContext] loadUserProfile - Successfully created user object:', {
            id: userObject.id,
            email: userObject.email,
            role: userObject.role,
            name: userObject.name,
            specialty: userObject.specialty,
            hasAvatar: !!userObject.avatar,
            isVerified: userObject.isVerified
          });

          setUser(userObject);
          setLoading(false);
          console.log('[AuthContext] loadUserProfile - Complete! User state set successfully');
          return;

        } catch (error: any) {
          console.error('[AuthContext] loadUserProfile - Exception caught:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          });

          if (error?.message?.includes('timeout')) {
            console.error('[AuthContext] Query timed out - possible network or RLS issue');
          }

          if (i < retries - 1) {
            console.log(`[AuthContext] loadUserProfile - Retrying after error (attempt ${i + 1}/${retries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            console.error('[AuthContext] loadUserProfile - Failed after all retries due to exception');
            setLoading(false);
            return;
          }
        }
      }

      console.error('[AuthContext] loadUserProfile - Exhausted all retry attempts');
      setLoading(false);
    } finally {
      loadingProfileRef.current = false;
      console.log('[AuthContext] loadUserProfile - Released lock');
    }
  };

  const login = async (email: string, password: string, role: User['role']): Promise<{ success: boolean; error?: AuthError }> => {
    const startTime = Date.now();

    try {
      console.log('[AuthContext] 🔐 Login initiated for:', email);

      if (!validateEmail(email)) {
        return { success: false, error: { field: 'email', message: 'Please enter a valid email address' } };
      }

      if (!password) {
        return { success: false, error: { field: 'password', message: 'Password is required' } };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (authError) {
        console.error('[AuthContext] ❌ Authentication failed:', authError.message);
        return { success: false, error: { message: 'Invalid email or password' } };
      }

      if (!authData.user) {
        return { success: false, error: { message: 'Login failed - no user returned' } };
      }

      console.log('[AuthContext] ✓ Authentication successful for user:', authData.user.id);

      let sessionVerified = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        const storageData = localStorage.getItem('telemedicine-auth');

        if (session?.access_token && storageData) {
          sessionVerified = true;
          console.log('[AuthContext] ✓ Session persisted to localStorage');
          break;
        }

        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!sessionVerified) {
        console.error('[AuthContext] ❌ Session persistence failed');
        return {
          success: false,
          error: { message: 'Session could not be saved. Please check browser storage settings.' }
        };
      }

      console.log('[AuthContext] 📦 Loading user profile...');
      await loadUserProfile(authData.user.id);

      const totalTime = Date.now() - startTime;
      console.log(`[AuthContext] ✅ Login complete in ${totalTime}ms`);

      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] ❌ Login error:', error?.message || error);
      return { success: false, error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthContext] Logout initiated');
      loadingProfileRef.current = false;
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      console.log('[AuthContext] Logout completed successfully');
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
      setUser(null);
      setLoading(false);
    }
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
