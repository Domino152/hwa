import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import type { LoginResponse } from '../../types/auth.types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  phone: string;
  onSuccess: () => void;
}

export function LoginForm({ phone, onSuccess }: LoginFormProps) {
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const loginRes = await api.post<{ data: LoginResponse }>('/auth/login', {
        ...data,
        role,
      });

      const { token, user } = loginRes.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      try {
        await api.post('/auth/link-whatsapp', { phone });
      } catch {
        // Link may already exist — continue
      }

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="student" onValueChange={(v) => setRole(v as 'student' | 'parent')}>
          <TabsList>
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="parent">Parent</TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <FormContent
              register={register}
              errors={errors}
              onSubmit={handleSubmit(onSubmit)}
              isLoading={isLoading}
              error={error}
            />
          </TabsContent>

          <TabsContent value="parent">
            <FormContent
              register={register}
              errors={errors}
              onSubmit={handleSubmit(onSubmit)}
              isLoading={isLoading}
              error={error}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface FormContentProps {
  register: ReturnType<typeof useForm<LoginFormValues>>['register'];
  errors: ReturnType<typeof useForm<LoginFormValues>>['formState']['errors'];
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
}

function FormContent({ register, errors, onSubmit, isLoading, error }: FormContentProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="e.g. 22CSE001"
          {...register('username')}
        />
        {errors.username && (
          <p className="text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
