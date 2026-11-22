import { Clapperboard } from 'lucide-react';
import Modal from '../ui/Modal';

export default function TrailerModal({ open, onClose, trailerKey, title, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title || 'Movie'} trailer`}
      size="xl"
      bare
      centered
      closeOnBackdrop={false}
      floatingCloseButton
      className="!max-w-[min(100%,calc((100dvh_-_7rem)_*_16_/_9))]"
    >
      <div className="overflow-hidden rounded-panel bg-black shadow-lift">
        <div className="relative aspect-video w-full">
          {trailerKey ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center text-mute">
              <div>
                <Clapperboard className="mx-auto mb-3 h-8 w-8" />
                <p className="text-sm">{loading ? 'Loading trailer…' : 'No trailer is available for this film yet.'}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
      </div>
    </Modal>
  );
}
