import { useState } from 'react';
import api from '../lib/api';
import type { LoginResponse } from '../types/auth.types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  loginToken?: string;
  phone?: string;
  lid?: string;
  onSuccess: () => void;
}

export function LoginForm({ loginToken, phone, lid, onSuccess }: LoginFormProps) {
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const loginRes = await api.post<{ data: LoginResponse }>('/auth/login', {
        username,
        password,
        role,
      });

      const { token, user } = loginRes.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (loginToken) {
        try {
          const redeemRes = await api.get<{ data: { phone?: string } }>('/auth/redeem-token', {
            params: { token: loginToken },
          });
          const linkedPhone = redeemRes.data?.data?.phone;
          if (linkedPhone) {
            try {
              await api.post('/auth/link-whatsapp', { phone: linkedPhone });
            } catch {
              // Link may already exist
            }
          }
        } catch {
          // Token may already be redeemed
        }
      } else if (phone || lid) {
        try {
          await api.post('/auth/link-whatsapp', { phone, lid });
        } catch {
          // Link may already exist
        }
      }

      setSuccess(`Logged in successfully as ${user.fullName || user.username}! You can now use WhatsApp commands.`);
      onSuccess();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-green-700">{success}</p>
            <p className="text-xs text-gray-400">
              Go back to WhatsApp and type <strong>help</strong> to see available commands.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={role === 'student' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setRole('student')}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={role === 'parent' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setRole('parent')}
          >
            Parent
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Register Number</Label>
            <Input
              id="username"
              placeholder="e.g. 22CSE001"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
