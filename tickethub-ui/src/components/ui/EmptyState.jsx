import { cn } from '../../lib/format';

export default function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-mute">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-mute">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
