import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

const col = 'space-y-3 text-sm text-mute';
const link = 'transition hover:text-ink';

export default function Footer() {
  return (
    <footer className="no-print mt-24 border-t hairline">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            Book the seat, skip the queue, and carry your pass on your phone.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Explore</h3>
          <ul className={col}>
            <li><Link className={link} to="/movies">Now showing</Link></li>
            <li><Link className={link} to="/movies?when=upcoming">Coming soon</Link></li>
            <li><Link className={link} to="/my-bookings">My bookings</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Company</h3>
          <ul className={col}>
            <li><Link className={link} to="/contact">Contact</Link></li>
            <li><Link className={link} to="/terms">Terms and conditions</Link></li>
            <li><Link className={link} to="/returns">Return and refund policy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold">Support</h3>
          <ul className={col}>
            <li><a className={link} href="mailto:help@tickethub.com">help@tickethub.com</a></li>
            <li><a className={link} href="tel:18001234567">1800-123-4567 (toll free)</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t hairline py-6 text-center text-xs text-faint">
        © {new Date().getFullYear()} TicketHub. Movie data from TMDB; this product is not endorsed or certified by TMDB.
      </div>
    </footer>
  );
}
