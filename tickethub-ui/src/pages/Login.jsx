import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { errorMessage, signIn, verifyOtp } from '../api/backend';
import { AUTH_API_BASE_URL } from '../config/env';
import { homeFor, useAuth } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import PasswordInput from '../components/auth/PasswordInput';
import { Field } from '../components/auth/Field';
import Button from '../components/ui/Button';

const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [creds, setCreds] = useState(null);
  const [otpNotice, setOtpNotice] = useState('');
  const [channel, setChannel] = useState('email');
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({ defaultValues: { email: state?.email || '' } });

  if (user) return <Navigate to={state?.from || homeFor(user)} replace />;

  const onSubmit = async (values) => {
    if (step === 1) {
      try {
        const res = await signIn({ email: values.email, password: values.password, channel });
        if (!res.profile) throw new Error('Sign in did not return an account.');
        setProfile(res.profile);
        setCreds({ email: values.email, password: values.password, channel });
        setOtpNotice(res.message?.includes('(mock:') ? 'Local demo mode: enter 123456. No email was sent.' : '');
        toast.success(res.message || 'We sent a one-time code to your email.');
        reset({ otp: '' });
        setStep(2);
      } catch (e) {
        toast.error(errorMessage(e, 'Invalid email or password.'));
      }
      return;
    }
    try {
      const res = await verifyOtp({ email: profile.email, otp: values.otp.trim(), channel });
      login(profile, res?.token, res?.refresh_token);
      toast.success('Welcome back.');
      nav(state?.from || homeFor(profile), { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, 'That code is wrong or has expired.'));
    }
  };

  const resend = async () => {
    try {
      const res = await signIn(creds);
      setOtpNotice(res.message?.includes('(mock:') ? 'Local demo mode: enter 123456. No email was sent.' : '');
      toast.success('A new code is on its way.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AuthShell
      title={step === 1 ? 'Welcome back' : channel === 'whatsapp' ? 'Check WhatsApp' : 'Check your email'}
      subtitle={step === 1 ? state?.reason || 'Sign in to book seats and see your tickets.' : `Enter the 6-digit code sent via ${channel === 'whatsapp' ? profile?.phone : profile?.email}.`}
      footer={step === 1 && <>New to TicketHub? <Link to="/register" state={{ from: state?.from }} className="font-semibold text-ink underline underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {step === 1 ? (
          <>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" autoComplete="email" className="field" placeholder="you@example.com" aria-invalid={!!errors.email} {...register('email', { required: 'Enter your email', pattern: { value: EMAIL, message: 'Enter a valid email address' } })} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <PasswordInput autoComplete="current-password" placeholder="Your password" aria-invalid={!!errors.password} {...register('password', { required: 'Enter your password' })} />
            </Field>
            <Field label="Send code via">
              <select className="field" value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="email">Email</option>
                <option value="whatsapp" disabled={!AUTH_API_BASE_URL}>WhatsApp</option>
              </select>
              {!AUTH_API_BASE_URL && <p className="mt-1 text-xs text-mute">WhatsApp is available when the Cinehold OTP API is configured.</p>}
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send one-time code</Button>
          </>
        ) : (
          <>
            <Field label="One-time code" error={errors.otp?.message}>
              <input inputMode="numeric" autoComplete="one-time-code" autoFocus className="field num text-center text-xl tracking-[0.4em]" placeholder="000000" aria-invalid={!!errors.otp} {...register('otp', { required: 'Enter the one-time code' })} />
            </Field>
            {otpNotice && <p role="status" className="text-sm text-gold-soft">{otpNotice}</p>}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Verify and sign in</Button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={resend} className="font-semibold text-mute hover:text-ink">Send a new code</button>
              <button type="button" onClick={() => { setStep(1); setOtpNotice(''); reset(); }} className="font-semibold text-mute hover:text-ink">Use a different account</button>
            </div>
          </>
        )}
      </form>
    </AuthShell>
  );
}
