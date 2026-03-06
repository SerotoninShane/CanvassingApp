import './globals.css';

export const metadata = {
  title: 'Canvassing App',
  description: 'Property canvassing tracker with interactive maps',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
