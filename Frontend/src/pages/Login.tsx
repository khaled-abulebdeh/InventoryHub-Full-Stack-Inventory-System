import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Clear session immediately when landing on login page
  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('adminId');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('adminId');
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Attempting login with:', email);

    fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((r) => {
        console.log('Login response status:', r.status);
        return r.json().then((body) => ({ status: r.status, body }));
      })
      .then(({ status, body }) => {
        console.log('Login response body:', body);

        if (status >= 400) {
          toast({ title: 'Login failed', description: body.error || 'Invalid credentials', variant: 'destructive' });
          return;
        }

        // Clear any existing session to prevent pollution
        localStorage.removeItem('user');
        localStorage.removeItem('adminId');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('adminId');

        const storage = rememberMe ? localStorage : sessionStorage;

        // Robust storage setting
        try {
          storage.setItem('user', JSON.stringify(body));

          if (body.role === 'ADMIN' || body.adminId) {
            // Explicitly store adminId if present, or fallback to user id if role is ADMIN
            const aId = body.adminId || body.id;
            if (aId) {
              storage.setItem('adminId', String(aId));
              console.log('Admin ID stored:', aId);
            }
          }

          // Verify storage worked (rare edge case in some modes)
          const stored = storage.getItem('user');
          if (!stored) {
            throw new Error('Failed to save session');
          }

          console.log('User stored successfully. Role:', body.role);

          toast({
            title: "Login Successful",
            description: `Welcome back, ${body.fullName || 'User'}`,
          });

          // Short delay to ensure storage commit and toast visibility
          setTimeout(() => {
            // Use assign for a clean navigation that mimics a fresh load
            window.location.assign('/app');
          }, 100);

        } catch (storageErr) {
          console.error('Storage error:', storageErr);
          toast({ title: 'System Error', description: 'Could not save login session. Private browsing?', variant: 'destructive' });
        }
      })
      .catch((err) => {
        console.error('Login error:', err);
        // alert('Login failed: ' + err.message); // Removed alert as it's intrusive
        toast({ title: 'Login Error', description: err.message || 'Network error', variant: 'destructive' });
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Sign In</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>

          <div>
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Sign in</Button>
          </div>
        </form>
        <div className="flex items-center gap-2 mt-3">
          <input id="remember" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          <label htmlFor="remember" className="text-sm">Remember me</label>
        </div>
        <div className="mt-4 text-sm">
          Don't have an account? <a className="text-primary hover:underline" href="/signup">Create one</a>
        </div>
      </Card>
    </div>
  );
}
