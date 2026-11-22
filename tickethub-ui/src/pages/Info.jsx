import { useForm } from 'react-hook-form';
import { Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';
import { errorMessage, sendContactMessage } from '../api/backend';
import Button from '../components/ui/Button';
import { Field } from '../components/auth/Field';

const Page = ({ title, intro, children, narrow = true }) => (
  <div className={`mx-auto px-4 py-12 sm:px-8 ${narrow ? 'max-w-3xl' : 'max-w-[1100px]'}`}>
    <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
    {intro && <p className="mt-3 text-lg text-mute">{intro}</p>}
    <div className="mt-10 space-y-10">{children}</div>
  </div>
);
const Block = ({ title, children }) => (
  <section>
    <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
    <div className="space-y-3 leading-relaxed text-zinc-300 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ol_li]:list-decimal">{children}</div>
  </section>
);

export function Contact() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (v) => {
    try {
      await sendContactMessage(v);
      toast.success('Message sent. We will reply by email.');
      reset();
    } catch (e) {
      toast.error(errorMessage(e, 'We could not send your message.'));
    }
  };
  return (
    <Page title="Contact us" intro="Questions about a booking or a show? Write to us and we will get back to you." narrow={false}>
      <div className="grid gap-10 md:grid-cols-[1.3fr_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} className="glass space-y-5 rounded-panel p-6 sm:p-8" noValidate>
          <Field label="Your name" error={errors.name?.message}><input className="field" aria-invalid={!!errors.name} {...register('name', { required: 'Enter your name' })} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}><input type="email" className="field" aria-invalid={!!errors.email} {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} /></Field>
            <Field label="Phone" error={errors.phone?.message}><input type="tel" className="field" aria-invalid={!!errors.phone} {...register('phone', { required: 'Enter your phone number' })} /></Field>
          </div>
          <Field label="Message" error={errors.message?.message}><textarea rows={5} className="field resize-y" aria-invalid={!!errors.message} {...register('message', { required: 'Write a message' })} /></Field>
          <Button type="submit" size="lg" loading={isSubmitting}>Send message</Button>
        </form>
        <div className="space-y-6">
          <a href="mailto:help@tickethub.com" className="flex items-center gap-4 rounded-2xl border hairline bg-white/[0.03] p-5 hover:bg-white/[0.06]"><Mail className="h-5 w-5 text-gold" aria-hidden /><span><span className="block text-xs text-mute">Email</span><span className="font-semibold">help@tickethub.com</span></span></a>
          <a href="tel:18001234567" className="flex items-center gap-4 rounded-2xl border hairline bg-white/[0.03] p-5 hover:bg-white/[0.06]"><Phone className="h-5 w-5 text-gold" aria-hidden /><span><span className="block text-xs text-mute">Toll free</span><span className="num font-semibold">1800-123-4567</span></span></a>
        </div>
      </div>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms and conditions">
      <Block title="Food and beverages">
        <p>Pre-booked food and beverages must be collected from the F&B counter by showing a valid booking ID.</p>
      </Block>
      <Block title="3D shows">
        <p>For 3D movies, 3D glasses are charged extra. On our large screens:</p>
        <ol>
          <li>The 3D glasses provided are unique, expensive and sanitized for your safety.</li>
          <li>They are made for 3D viewing on our big screen only and are not suitable for other screens.</li>
          <li>Please handle them with care. In case of loss or damage, Rs. 2000 will be charged.</li>
          <li>Please return the glasses to our staff before leaving the auditorium, and do not leave them at the seats.</li>
          <li>3D glasses are chargeable over and above the ticket price. One pair is given per ticket.</li>
          <li>Children above the age of 3 require tickets.</li>
        </ol>
      </Block>
      <Block title="Cancellation">
        <ul>
          <li>A transaction can be cancelled only after 10 minutes of booking the ticket or F&B.</li>
          <li>No cancellation is allowed within 20 minutes of the movie start time.</li>
          <li>Cancelled 2 hours or more before the show: 75% of the ticket value and 100% of the F&B value is refunded.</li>
          <li>Cancelled from 20 minutes to 2 hours before the show: 50% of the ticket value and 100% of the F&B value is refunded.</li>
          <li>F&B booked without a ticket cannot be cancelled.</li>
          <li>No refund is given for bookings made with M-coupons, gift cards, passes, vouchers, promos, corporate bookings, special screenings or block bookings.</li>
          <li>Cancellation cannot be combined with an offer given by us or a business partner.</li>
          <li>Partial cancellation is not allowed. The complete transaction must be cancelled, including when multiple payment modes were used.</li>
          <li>Convenience fees and applicable taxes are not refunded.</li>
          <li>Refunds are processed within a minimum of 7 working days.</li>
          <li>TicketHub may modify, add, alter, revise or withdraw these terms and the cancellation feature as needed.</li>
        </ul>
      </Block>
    </Page>
  );
}

export function Returns() {
  return (
    <Page title="Return and refund policy" intro="Please review these policies carefully before making a booking.">
      <Block title="1. Eligibility for cancellation">
        <ul>
          <li>Movie tickets can be cancelled up to 2 hours before the showtime. Cancellations after this period are not allowed and no refund is issued.</li>
          <li>Partial refunds are not allowed for group tickets; all tickets in the booking must be cancelled together.</li>
        </ul>
      </Block>
      <Block title="2. Refund process">
        <ul>
          <li>The base ticket price is refunded to the original payment method used during booking.</li>
          <li>Service fees, convenience charges and third-party charges, if applicable, are not refunded.</li>
        </ul>
      </Block>
      <Block title="3. Technical issues">
        <p>For technical issues such as payment errors or incorrect bookings, contact our support team within 24 hours. We will investigate and assist you.</p>
      </Block>
      <Block title="4. Special scenarios">
        <p>If the screening is cancelled or rescheduled by the theater, a full refund is provided, including any applicable fees.</p>
      </Block>
      <Block title="5. Contact us">
        <ul>
          <li>Email: support@TicketHub.com</li>
          <li>Phone: 1800-123-4567 (toll free)</li>
        </ul>
      </Block>
    </Page>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="num text-7xl font-extrabold text-crimson">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">This page is not showing</h1>
      <p className="mt-2 text-mute">The link may be out of date or mistyped.</p>
      <div className="mt-8 flex justify-center gap-3"><Button to="/">Go home</Button><Button to="/movies" variant="secondary">Browse movies</Button></div>
    </div>
  );
}
