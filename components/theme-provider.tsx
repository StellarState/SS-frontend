"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps `next-themes` so theming state (system preference, manual override and
 * the localStorage key) is available to every client component in the tree.
 *
 * `attribute="class"` is required: `app/globals.css` ships a `.dark` token set
 * and the Tailwind `dark:` variant is bound to that class.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
