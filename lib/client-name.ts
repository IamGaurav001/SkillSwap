/**
 * The visitor's last-used client name, remembered locally.
 *
 * This is a convenience for prefilling "My bookings", NOT authentication: there
 * are no accounts, and the standard API is deliberately open, so a booking is
 * keyed on the name the client typed. Anyone who knows a name can look up its
 * bookings -- a real product would put accounts here, and the README says so.
 *
 * Every access is wrapped: localStorage throws outright in a private window on
 * some browsers, and a crash in a nicety should never take the page down.
 */
const KEY = 'skillswap.clientName';

export function rememberClientName(name: string): void {
  try {
    if (name.trim()) window.localStorage.setItem(KEY, name.trim());
  } catch {
    /* storage unavailable -- prefilling is optional */
  }
}

export function recallClientName(): string {
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}
