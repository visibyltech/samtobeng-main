import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { BOOTSTRAPPED_ADMIN_EMAILS, auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr } from '../lib/format';
import { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  loggedIn: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile | null>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  updateCustomerProfile: (data: { name: string; phone: string; address: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  async function syncProfile(firebaseUser: User): Promise<UserProfile | null> {
    if (!firebaseUser.emailVerified) {
      setProfile(null);
      setIsAdmin(false);
      return null;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    let adminFlag =
      Boolean(firebaseUser.email) &&
      BOOTSTRAPPED_ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase());

    if (!adminFlag) {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        adminFlag = adminSnap.exists();
      } catch {
        adminFlag = false;
      }
    }
    setIsAdmin(adminFlag);

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const effective = { ...data, role: adminFlag ? 'admin' : data.role };
        setProfile(effective);
        return effective;
      }

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: clampStr(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer', 120),
        email: clampStr(firebaseUser.email || '', 180),
        phone: '',
        address: '',
        role: 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      const effective = { ...newProfile, role: adminFlag ? 'admin' as const : 'customer' as const };
      setProfile(effective);
      return effective;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      return null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.emailVerified) {
        try {
          await syncProfile(firebaseUser);
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function loginWithEmail(email: string, password: string): Promise<UserProfile | null> {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await credential.user.reload();
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
      await signOut(auth);
      throw new Error('Please verify your email first. We have sent a new verification link to your inbox.');
    }
    return syncProfile(credential.user);
  }

  async function registerWithEmail(name: string, email: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(credential.user, { displayName: clampStr(name.trim(), 120) });
    }
    await sendEmailVerification(credential.user);
    await signOut(auth);
  }

  async function resendVerificationEmail() {
    if (!user) throw new Error('Please sign in again to resend the verification email.');
    await sendEmailVerification(user);
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
    setIsAdmin(false);
  }

  async function updateCustomerProfile(data: { name: string; phone: string; address: string }) {
    if (!user) throw new Error('You must be signed in to update your profile.');
    const path = `users/${user.uid}`;
    try {
      const payload = {
        name: clampStr(data.name, 120) || profile?.name || 'Customer',
        phone: clampStr(data.phone, 30),
        address: clampStr(data.address, 500),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'users', user.uid), payload);
      setProfile((prev) => prev ? { ...prev, name: payload.name, phone: payload.phone, address: payload.address } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, authReady, loggedIn: Boolean(user), isAdmin,
      loginWithEmail, registerWithEmail, resendVerificationEmail, logout, updateCustomerProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
