import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { checkEmail, checkPhone, errorMessage, signUp } from '../api/backend';
import { homeFor, useAuth } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import PasswordInput from '../components/auth/PasswordInput';
import { Field } from '../components/auth/Field';
import Button from '../components/ui/Button';

const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function Register() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [available, setAvailable] = useState({ email: null, phone: null });
  const { register, handleSubmit, watch, setError, clearErrors, formState: { errors, isSubmitting } } = useForm();

  if (user) return <Navigate to={homeFor(user)} replace />;

  const verify = async (field, value, call, taken) => {
    if (!value || (field === 'email' && !EMAIL.test(value))) return;
    try {
      await call(value);
      clearErrors(field);
      setAvailable((a) => ({ ...a, [field]: value }));
    } catch {
      setAvailable((a) => ({ ...a, [field]: null }));
      setError(field, { type: 'manual', message: taken });
    }
  };

  const onSubmit = async ({ confirmPassword, ...values }) => {
    if (available.email !== values.email) return setError('email', { message: 'We could not confirm this email is free. Click out of the field and try again.' });
    if (available.phone !== values.phone) return setError('phone', { message: 'We could not confirm this number is free. Click out of the field and try again.' });
    try {
      await signUp(values);
      toast.success('Account created. Sign in to continue.');
      nav('/login', { replace: true, state: { email: values.email, from: state?.from } });
    } catch (e) {
      toast.error(errorMessage(e, 'We could not create your account.'));
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="One account for every booking." footer={<>Already have an account? <Link to="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name?.message}>
          <input autoComplete="name" className="field" aria-invalid={!!errors.name} {...register('name', { required: 'Enter your name' })} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className="field" aria-invalid={!!errors.email} {...register('email', { required: 'Enter your email', pattern: { value: EMAIL, message: 'Enter a valid email address' }, onBlur: (e) => verify('email', e.target.value, checkEmail, 'An account with this email already exists.') })} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" className="field" aria-invalid={!!errors.phone} {...register('phone', { required: 'Enter your phone number', onBlur: (e) => verify('phone', e.target.value, checkPhone, 'This phone number is already in use.') })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of birth" error={errors.dob?.message}>
            <input type="date" max={new Date().toISOString().slice(0, 10)} className="field" aria-invalid={!!errors.dob} {...register('dob', { required: 'Required' })} />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <select className="field" defaultValue="" aria-invalid={!!errors.gender} {...register('gender', { required: 'Required' })}>
              <option value="" disabled>Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option>
            </select>
          </Field>
        </div>
        <Field label="Marital status" error={errors.maritalStatus?.message}>
          <select className="field" defaultValue="" aria-invalid={!!errors.maritalStatus} {...register('maritalStatus', { required: 'Required' })}>
            <option value="" disabled>Select</option><option value="UNMARRIED">Unmarried</option><option value="MARRIED">Married</option>
          </select>
        </Field>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters.">
          <PasswordInput autoComplete="new-password" aria-invalid={!!errors.password} {...register('password', { required: 'Choose a password', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword', { required: 'Repeat your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthShell>
  );
}
