import { Info } from 'lucide-react';
import { hasTmdb } from '../../api/tmdb';

export default function SourceNotice({ source }) {
  if (source === 'tmdb') return null;
  const text =
    source === 'demo'
      ? 'You are looking at sample films because neither TMDB nor the TicketHub server could be reached. Start the backend, or add a TMDB key in your .env file, to see real releases.'
      : hasTmdb
        ? 'TMDB could not be reached, so these films come from the TicketHub database.'
        : 'These films come from the TicketHub database. Add a free TMDB key in your .env file to load live releases and box office.';
  return (
    <div role="status" className="mx-auto mb-8 flex max-w-[1400px] items-start gap-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-4 py-3 text-sm text-gold-soft">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
