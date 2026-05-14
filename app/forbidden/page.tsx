import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center'
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, background: 'var(--surface)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 32, marginBottom: 32
      }}>
        🚫
      </div>
      
      <h1 className="font-display" style={{ 
        fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 16 
      }}>
        Access Denied
      </h1>
      
      <p style={{ 
        fontSize: 16, color: 'var(--text-3)', maxWidth: 400, lineHeight: 1.6, marginBottom: 40 
      }}>
        Your current identity does not have the necessary clearance to access the Command Center. 
        Please contact a system administrator if you believe this is an error.
      </p>

      <Link href="/" className="btn btn-primary" style={{ padding: '14px 28px' }}>
        Return to Safety
      </Link>
    </div>
  );
}
