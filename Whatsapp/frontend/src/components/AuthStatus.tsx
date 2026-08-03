import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import type { User } from '../types/auth.types';

interface AuthStatusProps {
  onLogout: () => void;
}

export function AuthStatus({ onLogout }: AuthStatusProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <span className="text-2xl">✅</span>
          WhatsApp Linked!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-emerald-700 font-medium">
            You can now return to WhatsApp and continue chatting.
          </p>
        </div>

        {user && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{user.fullName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Username</span>
              <span className="font-medium text-gray-900">{user.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Student ID</span>
              <span className="font-medium text-gray-900">{user.studentId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{user.whatsappNumber || 'Linked'}</span>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Sign in with a different account
        </button>
      </CardContent>
    </Card>
  );
}
