import { useId, cloneElement } from 'react';

export function Field({ label, error, hint, children }) {
  const id = useId();
  const described = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {cloneElement(children, { id, 'aria-describedby': described })}
      {error ? <p id={`${id}-e`} className="mt-1.5 text-sm text-crimson-soft" role="alert">{error}</p> : hint ? <p id={`${id}-h`} className="mt-1.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
