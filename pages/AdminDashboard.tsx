import React, { useEffect, useState } from 'react';
import { User, UserRole, SubscriptionStatus } from '../types';
import { Button } from '../components/Button';
import { collection, onSnapshot, query, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AdminDashboardProps {
    // We don't need to pass users/actions from parent anymore, but for TS compatibility with App.tsx structure we can keep it optional or ignore
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });
      setUsers(usersList);
      setIsLoading(false);
      setError(null);
    }, (err) => {
        const msg = err?.message || "Unknown Firestore error";
        console.error("Admin Dashboard Listener Error:", msg);
        setError("Unable to load users. You might have insufficient permissions or a connection issue.");
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const userRef = doc(db, "users", userId);
      
      if (action === 'approve') {
        const code = `CODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await updateDoc(userRef, {
          subscriptionStatus: SubscriptionStatus.APPROVED_WAITING_CODE,
          confirmationCode: code
        });
      } else {
        await updateDoc(userRef, {
          subscriptionStatus: SubscriptionStatus.INACTIVE,
          transactionId: null // Clear transaction ID on reject? or keep history?
        });
      }
    } catch (error: any) {
      console.error("Error updating user:", error?.message || String(error));
      alert("Failed to update user status.");
    }
  };

  const pendingUsers = users.filter(u => u.subscriptionStatus === SubscriptionStatus.PENDING_VERIFICATION);
  const approvedUsers = users.filter(u => u.subscriptionStatus === SubscriptionStatus.APPROVED_WAITING_CODE || u.subscriptionStatus === SubscriptionStatus.ACTIVE);

  if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
        </div>
      );
  }

  if (error) {
    return (
        <div className="max-w-4xl mx-auto mt-10 px-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            {error}
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                            Try refreshing the page. If you are the administrator, ensure your account (as.ka1@hotmail.com) has the correct permissions in the database rules.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
            Admin Dashboard
          </h2>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-10">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-yellow-50">
          <h3 className="text-lg leading-6 font-medium text-slate-900">
            Pending Payment Verifications ({pendingUsers.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {pendingUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No pending requests.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Proof</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                        {user.transactionId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer">
                      View Receipt
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button 
                        variant="primary" 
                        onClick={() => handleAction(user.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleAction(user.id, 'reject')}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Active/Approved Users History */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
          <h3 className="text-lg leading-6 font-medium text-slate-900">
            Verified Students
          </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmation Code</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {approvedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {user.name} <span className="text-slate-400">({user.email})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.subscriptionStatus === SubscriptionStatus.ACTIVE ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Code Sent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                      {user.confirmationCode}
                    </td>
                  </tr>
                ))}
                 {approvedUsers.length === 0 && (
                    <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-500">No verified users yet.</td>
                    </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};