'use client';
import { useState } from 'react';

export default function NewsletterForm() {
  const [status, setStatus] = useState<'idle'|'ok'|'error'>('idle');
  const [email, setEmail] = useState('');
  return (
    <form id="newsletter" className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const res = await fetch('/api/events', { method: 'POST', body: JSON.stringify({ t: 'newsletter_signup', email })});
      setStatus(res.ok ? 'ok' : 'error');
    }}>
      <label htmlFor="email" className="block text-sm">Email</label>
      <input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-700"/>
      <button className="px-4 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors">Subscribe</button>
      {status==='ok' && <p className="text-sm text-green-600">Thanks. Check your inbox.</p>}
      {status==='error' && <p className="text-sm text-red-600">Try again later.</p>}
    </form>
  );
}
