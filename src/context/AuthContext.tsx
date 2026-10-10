import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged,
  testConnection 
} from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  enableDemoMode: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback mock user for demo/guest mode
const DEMO_USER: User = {
  uid: 'demo_trader_owner',
  displayName: 'রফিকুল ইসলাম (ডেমো আড়তদার)',
  email: 'trader@dhanerbebsha.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'demo_token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: '01712345678',
  photoURL: null,
  providerId: 'demo',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    // Test connection on boot
    testConnection();

    // Check if demo user saved
    const savedDemo = localStorage.getItem('paddy_pos_demo_mode');
    if (savedDemo === 'true') {
      setCurrentUser(DEMO_USER);
      setIsDemoUser(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        setIsDemoUser(false);
        localStorage.removeItem('paddy_pos_demo_mode');
      } else {
        // If not signed in yet, default to demo user for instantaneous zero-friction preview,
        // but user can click "Google Sign In" anytime to connect real Firebase account!
        setCurrentUser(DEMO_USER);
        setIsDemoUser(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('paddy_pos_demo_mode');
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setIsDemoUser(false);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      alert('গুগল লগইন সম্পন্ন করা যায়নি। ডেমো মোডে চলছে।');
    } finally {
      setLoading(false);
    }
  };

  const enableDemoMode = () => {
    localStorage.setItem('paddy_pos_demo_mode', 'true');
    setCurrentUser(DEMO_USER);
    setIsDemoUser(true);
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('paddy_pos_demo_mode');
      if (!isDemoUser) {
        await fbSignOut(auth);
      }
      // Revert to demo mode
      setCurrentUser(DEMO_USER);
      setIsDemoUser(true);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isDemoUser,
        signInWithGoogle,
        enableDemoMode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
