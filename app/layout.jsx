import './globals.css';
 
export const metadata = {
  title: 'CA Homes – Property Management',
  description: 'Dein persönliches Immobilien-Management',
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
