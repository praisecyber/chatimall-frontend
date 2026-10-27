import { useState } from 'react';
import type { Country } from '@/lib/countries';

interface CountryFlagProps {
  country?: Country;
  iso?: string;
  flag?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CountryFlag({
  country,
  iso = country?.iso ?? '',
  flag = country?.flag ?? '',
  name = country?.name ?? '',
  className = '',
  size = 'md',
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const code = (iso || '').toLowerCase();

  const sizeCls =
    size === 'sm'
      ? 'w-4 h-2.5'
      : size === 'lg'
      ? 'w-6 h-4'
      : 'w-5 h-3.5';

  if (!code || hasError) {
    return (
      <span className="inline-block text-lg leading-none select-none" aria-hidden="true">
        {flag || '🌐'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center shrink-0 leading-none select-none">
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
        alt={name ? `${name} flag` : `${iso} flag`}
        title={name}
        className={`${sizeCls} object-cover rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ${className}`}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </span>
  );
}
