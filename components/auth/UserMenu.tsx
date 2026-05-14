'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserMenuProps {
  user: User;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * UserMenu — client component.
 * Renders user avatar + dropdown with Dashboard and Sign out links.
 * Inject into the nav alongside existing elements.
 */
export default function UserMenu({ user, displayName, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        id="user-menu-trigger"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          color: 'var(--text-2)',
          fontSize: 13,
          fontWeight: 500,
          transition: 'border-color 140ms, color 140ms',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            width={22}
            height={22}
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-2)',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div
            role="menu"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: 200,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* User info */}
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                {displayName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-4)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </div>
            </div>

            {/* Actions */}
            <a
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '11px 14px',
                fontSize: 13,
                color: 'var(--text-2)',
                textDecoration: 'none',
                transition: 'background 120ms, color 120ms',
                borderBottom: '1px solid var(--border-subtle)',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)';
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-1)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-2)';
              }}
            >
              Dashboard
            </a>

            <button
              id="user-menu-signout"
              role="menuitem"
              onClick={handleSignOut}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '11px 14px',
                fontSize: 13,
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
