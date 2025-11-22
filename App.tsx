import React, { useState, useEffect, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { User, UserRole, SubscriptionStatus } from './types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';

// Lazy load pages to optimize bundle size and fix chunk size warnings
const LoginView = React.lazy(() => import('./pages/Login').then(module => ({ default: module.LoginView })));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PaymentView = React.lazy(() => import('./pages/Payment').then(module => ({ default: module.PaymentView })));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, listen to their Firestore document for role/status changes
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as User;
            const email = userData.email?.toLowerCase().trim() || '';
            
            // Fix for name display: Fallback to Auth profile if DB name is missing or empty
            // Using a robust check to ensure we always display something
            if (!userData.name || (userData.name && userData.name.trim() === '')) {
                const currentAuthUser = auth.currentUser || firebaseUser;
                const displayName = currentAuthUser.displayName || firebaseUser.displayName || email.split('@')[0] || 'Student';
                userData.name = displayName;
            }
            
            // Force Admin role for specific email if not already set in DB
            if (email === 'as.ka1@hotmail.com' || email === 'admin@ashrafcodeacademy.com') {
              if (userData.role !== UserRole.ADMIN) {
                // Update local state immediately
                userData.role = UserRole.ADMIN;
                // Persist to DB to fix the account permanently
                try {
                  await updateDoc(userDocRef, { role: UserRole.ADMIN });
                  console.log("Automatically upgraded user to Admin based on email match.");
                } catch (e: any) {
                  console.error("Failed to sync admin role to DB", e?.message || "Unknown error");
                }
              }
            }

            setUser(userData);
          } else {
            // Doc might not exist yet (race condition) or was deleted.
            // Fallback to Auth data.
            const email = firebaseUser.email?.toLowerCase().trim() || '';
            
            // Try to get the most up-to-date name from auth
            const currentAuthUser = auth.currentUser || firebaseUser;
            const displayName = currentAuthUser.displayName || firebaseUser.displayName || email.split('@')[0] || 'Student';

            const isAdmin = email === 'as.ka1@hotmail.com' || email === 'admin@ashrafcodeacademy.com';
            
            setUser({
                id: firebaseUser.uid,
                email: email,
                name: displayName,
                role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT,
                subscriptionStatus: SubscriptionStatus.INACTIVE,
            });
          }
          setIsLoading(false);
        }, (error) => {
            // Log only the message to avoid circular structure errors
            console.error("Firestore user listener error:", error.message);
            
            // Fallback: Create a temporary user session from Auth data if DB is blocked
            const email = firebaseUser.email?.toLowerCase().trim() || '';
            const currentAuthUser = auth.currentUser || firebaseUser;
            const displayName = currentAuthUser.displayName || firebaseUser.displayName || email.split('@')[0] || 'Student';
            const isAdmin = email === 'as.ka1@hotmail.com' || email === 'admin@ashrafcodeacademy.com';
            
            setUser({
                id: firebaseUser.uid,
                email: email,
                name: displayName,
                role: isAdmin ? UserRole.ADMIN : UserRole.STUDENT,
                subscriptionStatus: SubscriptionStatus.INACTIVE,
            });
            
            setIsLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out", error?.message || "Unknown error");
    }
  };

  const handleSwitchRole = async () => {
    if (!user) return;
    
    const newRole = user.role === UserRole.ADMIN ? UserRole.STUDENT : UserRole.ADMIN;
    
    // Optimistically update local state so the UI switches immediately
    setUser({ ...user, role: newRole });

    // Attempt to persist the role change to the database
    if (auth.currentUser) {
      try {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, { role: newRole });
      } catch (error) {
        console.log("Switched role locally (remote update failed due to permissions)");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // View Router Logic
  let CurrentView;
  if (!user) {
    CurrentView = <LoginView />;
  } else if (user.role === UserRole.ADMIN) {
    CurrentView = <AdminDashboard />;
  } else {
    // Student Logic
    if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      CurrentView = <StudentDashboard user={user} />;
    } else {
      CurrentView = (
        <PaymentView user={user} />
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onSwitchRole={handleSwitchRole}
      />
      <main className="flex-grow">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full min-h-[300px]">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
          </div>
        }>
          {CurrentView}
        </Suspense>
      </main>
    </div>
  );
};

export default App;