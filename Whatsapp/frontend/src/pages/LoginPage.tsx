import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import type { ApiResponse, RedeemTokenResponse } from '../types/auth.types';
import { LoginForm } from '../components/LoginForm';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [lid, setLid] = useState('');
  const loginToken = searchParams.get('token') || '';
  const [isLinked, setIsLinked] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      setIsLinked(true);
      return;
    }

    const tok = searchParams.get('token');
    if (!tok) return;

    setRedeeming(true);
    api
      .get<ApiResponse<RedeemTokenResponse>>(`/auth/redeem-token?token=${encodeURIComponent(tok)}`)
      .then((res) => {
        const data = res.data.data as RedeemTokenResponse;
        setPhone(data.phone);
        if (data.lid) setLid(data.lid);
        searchParams.delete('token');
        setSearchParams(searchParams, { replace: true });
      })
      .catch(() => {
        setTokenError('Invalid or expired login link. Please request a new one from WhatsApp.');
      })
      .finally(() => setRedeeming(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLinked(false);
  };

  if (redeeming) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-gray-500">Verifying login link...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">College WhatsApp Assistant</h1>
            <p className="text-gray-500 mt-1">Secure Login Portal</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-sm text-red-700">{tokenError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">College WhatsApp Assistant</h1>
          <p className="text-gray-500 mt-1">Secure Login Portal</p>
        </div>

        {isLinked ? (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm font-medium text-green-700">
                  You are already logged in!
                </p>
                <p className="text-xs text-gray-500">
                  Go back to WhatsApp and type <strong>help</strong> to see available commands.
                </p>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 underline mt-2"
                >
                  Sign in with a different account
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <LoginForm phone={phone} lid={lid} loginToken={loginToken} onSuccess={() => setIsLinked(true)} />
        )}

        <p className="text-center text-xs text-gray-400">
          Protected by JWT authentication. Your password is never shared with WhatsApp.
        </p>
      </div>
    </div>
  );
}
