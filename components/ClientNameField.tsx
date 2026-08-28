'use client';

/**
 * The client-name input on "My bookings", prefilled from the last booking made in
 * this browser.
 *
 * The prefill runs in an effect rather than during render so the server-rendered
 * HTML and the first client render agree -- reading localStorage during render is
 * a hydration mismatch, and Next surfaces that as a console error, which is itself
 * a Lighthouse best-practices finding.
 *
 * A value already present in the URL always wins: it is the more explicit intent.
 */
import { useEffect, useState } from 'react';
import { recallClientName } from '@/lib/client-name';

export function ClientNameField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (defaultValue) return;
    const remembered = recallClientName();
    if (remembered) setValue(remembered);
  }, [defaultValue]);

  return (
    <div className="field">
      <label htmlFor="clientName">Your name</label>
      <input
        id="clientName"
        name="clientName"
        type="text"
        maxLength={80}
        required
        autoComplete="name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Asha"
      />
    </div>
  );
}
