import "./globals.css";
import AppShell from "@/components/app-shell";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { SaveSessionProvider } from "@/lib/save-session/save-session-context";

export const metadata = {
  title: "Duplicity V4",
  description: "Web-based Oxygen Not Included save editor",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>
          <SaveSessionProvider>
            <AppShell>{children}</AppShell>
          </SaveSessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
