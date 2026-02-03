import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, phone, password }),
    })
      .then((r) => r.json().then((body) => ({ status: r.status, body })))
      .then(({ status, body }) => {
        if (status >= 400) {
          toast({ title: 'Signup failed', description: body.error || 'Unable to create account' });
          return;
        }

        toast({ title: 'Account created', description: 'Please sign in' });
        navigate('/');
      })
      .catch(() => toast({ title: 'Network error', description: 'Unable to reach server' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Account</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>

          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create account</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
