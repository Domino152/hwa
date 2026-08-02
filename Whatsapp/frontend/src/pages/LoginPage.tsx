import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { AuthStatus } from '../components/AuthStatus';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLinked(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLinked(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">College WhatsApp Assistant</h1>
          <p className="text-gray-500 mt-1">Secure Login Portal</p>
        </div>

        {isLinked ? (
          <AuthStatus onLogout={handleLogout} />
        ) : (
          <LoginForm phone={phone} onSuccess={() => setIsLinked(true)} />
        )}

        <p className="text-center text-xs text-gray-400">
          Protected by JWT authentication. Your password is never shared with WhatsApp.
        </p>
      </div>
    </div>
  );
}
