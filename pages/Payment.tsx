import React, { useState } from 'react';
import { User, SubscriptionStatus } from '../types';
import { Button } from '../components/Button';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PaymentViewProps {
  user: User;
  // onSubmitPayment and onUnlock are handled internally now via Firebase, 
  // but we keep props consistent or update them. 
  // Ideally, we update App.tsx to not pass these if they aren't needed, 
  // but for now let's wrapping the firestore calls here.
  onSubmitPayment?: (txnId: string) => void; 
  onUnlock?: (code: string) => boolean; 
}

export const PaymentView: React.FC<PaymentViewProps> = ({ user }) => {
  const [transactionId, setTransactionId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionId.length < 5) {
        setError('Please enter a valid Transaction ID');
        return;
    }
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.id);
      // Use setDoc with merge: true to create the document if it doesn't exist
      // This handles cases where the initial registration failed to create the Firestore doc
      await setDoc(userRef, {
        transactionId: transactionId,
        subscriptionStatus: SubscriptionStatus.PENDING_VERIFICATION,
        // Ensure profile exists
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("Payment Error:", msg);
      // Friendly error message
      if (msg.includes("permission")) {
          setError("Permission denied. Please contact support.");
      } else {
          setError("Failed to submit payment. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check code against user profile in Firestore
    // (Since we have 'user' prop which is real-time updated from App.tsx, we can check that)
    if (user.confirmationCode === inputCode.trim()) {
      setIsLoading(true);
      try {
        const userRef = doc(db, "users", user.id);
        // Using setDoc with merge here as well for consistency
        await setDoc(userRef, {
            subscriptionStatus: SubscriptionStatus.ACTIVE
        }, { merge: true });
      } catch (err: any) {
        console.error("Unlock Error:", err?.message || String(err));
        setError("Failed to unlock. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Invalid Confirmation Code. Please check and try again.');
    }
  };

  // Render based on sub status
  if (user.subscriptionStatus === SubscriptionStatus.PENDING_VERIFICATION) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-yellow-100">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verification Pending</h2>
          <p className="mt-4 text-slate-600">
            We have received your payment details (ID: <span className="font-mono font-bold">{user.transactionId}</span>).
            <br />
            Our admin team is verifying it. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  if (user.subscriptionStatus === SubscriptionStatus.APPROVED_WAITING_CODE) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-green-100">
         <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Payment Approved!</h2>
            <p className="mt-2 text-slate-600">Enter the confirmation code sent to your email.</p>
            
            {/* For Demo purposes, showing the code here if available, though in real app it's emailed */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
               <span className="font-bold">Demo Email:</span> Your code is: <span className="font-mono font-bold select-all">{user.confirmationCode}</span>
            </div>
         </div>

         <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation Code</label>
                <input 
                    type="text" 
                    className="block w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    placeholder="e.g. CODE-XYZ123"
                    value={inputCode}
                    onChange={e => { setInputCode(e.target.value); setError(''); }}
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>Unlock Full Access</Button>
         </form>
      </div>
    );
  }

  // Default: INACTIVE
  return (
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 py-8 px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Unlock AshrafCodeAcademy AI</h2>
          <p className="mt-2 text-brand-200">Get unlimited help with Python, JS, and HTML/CSS.</p>
        </div>
        
        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Step 1: Make a Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {['Vodafone Cash', 'InstaPay', 'Fawry'].map(method => (
                   <div key={method} className="border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-colors">
                       <span className="font-semibold text-slate-700">{method}</span>
                       <span className="text-xs text-slate-500 mt-1">01008084689</span>
                   </div>
               ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Step 2: Confirm Payment</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload Screenshot (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-brand-400 transition-colors cursor-pointer bg-slate-50">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-slate-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction ID (Required)
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 shadow-sm sm:text-sm"
                  placeholder="e.g., 89234121"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-brand-500/20" isLoading={isLoading}>
                Verify Payment
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};