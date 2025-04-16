import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-6 max-w-2xl">
        The page you are looking for does not exist. This is a custom Next.js 404 page.
      </p>
      <div className="bg-gray-100 p-4 rounded-lg mb-6 max-w-2xl text-left">
        <h2 className="text-lg font-semibold mb-2">Debugging Info:</h2>
        <p className="mb-2">
          If you&apos;re seeing this page, Next.js routing is working, but the specific path wasn&apos;t found.
        </p>
        <p className="mb-2">
          If you&apos;re not seeing this page and instead see a generic Netlify 404 page, 
          it means the Next.js server-side rendering setup may not be working correctly.
        </p>
      </div>
      <Link 
        href="/" 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
} 