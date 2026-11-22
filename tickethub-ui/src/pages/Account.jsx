import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { errorMessage, updateUser } from '../api/backend';
import { useAuth, initials } from '../context/AuthContext';
import { ENABLE_PROFILE_EDIT } from '../config/env';
import { formatDate } from '../lib/format';
import Button from '../components/ui/Button';
import { Field } from '../components/auth/Field';

const label = (v) => (v ? String(v).charAt(0) + String(v).slice(1).toLowerCase() : '—');

export default function Account() {
  const { user, update, logout } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: user });

  const onSubmit = async (values) => {
    try {
      await updateUser(user.id, { ...user, ...values });
      update(values);
      setEditing(false);
      toast.success('Details saved.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const rows = [
    ['Full name', user.name],
    ['Email', user.email],
    ['Phone', user.phone],
    ['Gender', label(user.gender)],
    ['Marital status', label(user.maritalStatus)],
    ['Date of birth', user.dob ? formatDate(user.dob) : '—'],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <div className="flex items-center gap-5">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-crimson to-gold text-2xl font-extrabold">{initials(user.name)}</span>
        <div>
          <h1 className="text-2xl font-extrabold">{user.name}</h1>
          <p className="text-mute">{user.email}</p>
        </div>
      </div>

      <section className="mt-10 rounded-panel border hairline bg-white/[0.03] p-6 sm:p-8" aria-labelledby="det">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="det" className="text-lg font-extrabold">Your details</h2>
          {ENABLE_PROFILE_EDIT && !editing && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2" noValidate>
            <Field label="Full name" error={errors.name?.message}><input className="field" aria-invalid={!!errors.name} {...register('name', { required: 'Enter your name' })} /></Field>
            <Field label="Email" error={errors.email?.message}><input type="email" className="field" aria-invalid={!!errors.email} {...register('email', { required: 'Enter your email' })} /></Field>
            <Field label="Phone" error={errors.phone?.message}><input className="field" aria-invalid={!!errors.phone} {...register('phone', { required: 'Enter your phone number' })} /></Field>
            <Field label="Date of birth"><input type="date" className="field" {...register('dob')} /></Field>
            <Field label="Gender"><select className="field" {...register('gender')}><option value="MALE">Male</option><option value="FEMALE">Female</option></select></Field>
            <Field label="Marital status"><select className="field" {...register('maritalStatus')}><option value="UNMARRIED">Unmarried</option><option value="MARRIED">Married</option></select></Field>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Save changes</Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}><dt className="text-xs text-mute">{k}</dt><dd className="mt-1 font-semibold">{v || '—'}</dd></div>
            ))}
          </dl>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/my-bookings" variant="secondary">My bookings</Button>
        <Button variant="danger" onClick={() => { logout(); toast.success('You are signed out.'); nav('/'); }}><LogOut className="h-4 w-4" aria-hidden />Sign out</Button>
      </div>
    </div>
  );
}
