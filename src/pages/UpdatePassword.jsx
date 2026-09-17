import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
    const [isResetFlow, setIsResetFlow] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Detect if active session or hash parameters exist
        const hash = window.location.hash;
        if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
            setIsResetFlow(true);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setIsResetFlow(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Validate email and jump directly to password entry
    async function handleVerifyAndContinue(e) {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        const trimmedEmail = email.trim().toLowerCase();

        try {
            const res = await fetch('/api/auth/verify-and-grant-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.detail || 'This email is not registered for WolfHacks.');
                setLoading(false);
                return;
            }

            // Redirect browser directly into the authenticated recovery session link
            if (data.action_link) {
                window.location.href = data.action_link;
            } else {
                setError('Failed to initiate password setup.');
                setLoading(false);
            }
        } catch {
            setError('Server connection failed. Please try again.');
            setLoading(false);
        }
    }

    // Save New Password
    async function handlePasswordUpdate(e) {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        setMessage('Password set successfully! Redirecting to portal...');
        setTimeout(() => {
            window.location.href = '/portal';
        }, 1500);
    }

    return (
        <main className="portal-login">
            <div className="container">
                <div className="portal-login__card">
                    <p className="eyebrow">WOLFHACKS PORTAL</p>
                    <h1 className="section__heading">
                        {isResetFlow ? 'Set Your Password' : 'Verify Email'}
                    </h1>
                    <p className="section__lede">
                        {isResetFlow
                            ? 'Enter a new password for your account.'
                            : 'Enter your application email to continue.'}
                    </p>

                    {isResetFlow ? (
                        /* PASSWORD UPDATE FORM */
                        <form className="portal-login__form" onSubmit={handlePasswordUpdate}>
                            {error && (
                                <div className="portal-login__error-box">
                                    <p>{error}</p>
                                </div>
                            )}

                            {message && (
                                <div className="portal-login__success-box" style={{ color: 'green', marginBottom: '1rem' }}>
                                    <p>{message}</p>
                                </div>
                            )}

                            <label>
                                New Password
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </label>

                            <label>
                                Confirm Password
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </label>

                            <button className="btn btn--primary" type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Password'}
                            </button>
                        </form>
                    ) : (
                        /* EMAIL VERIFICATION FORM */
                        <form className="portal-login__form" onSubmit={handleVerifyAndContinue}>
                            {error && (
                                <div className="portal-login__error-box">
                                    <p>{error}</p>
                                </div>
                            )}

                            <label>
                                Application Email
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="hacker@example.com"
                                />
                            </label>

                            <button className="btn btn--primary" type="submit" disabled={loading}>
                                {loading ? 'Verifying...' : 'Continue to Password Setup'}
                            </button>

                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <a href="/portal/login" style={{ fontSize: '0.85rem', color: 'inherit' }}>
                                    Back to Sign In
                                </a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}