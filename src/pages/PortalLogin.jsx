import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PortalLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOrganizerLogin, setShowOrganizerLogin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get('error');
        if (errorCode === 'not_registered') {
            setError('This account is not registered for WolfHacks. Please use the account or email you applied with.');
        } else if (errorCode === 'not_checked_in') {
            setError("You're registered, but not checked in yet. Head to the check-in desk, then sign in again.");
        }
    }, []);

    async function handleLogin(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setError('Invalid email or password.');
            setLoading(false);
            return;
        }

        navigate('/portal');
    }

    async function handleDiscordLogin() {
        setError('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${window.location.origin}/portal`,
            },
        });

        if (error) {
            setError('Unable to sign in with Discord.');
            setLoading(false);
        }
    }

    return (
        <main className="portal-login">
            <div className="container">
                <div className="portal-login__card">
                    <p className="eyebrow">WOLFHACKS PORTAL</p>
                    <h1 className="section__heading">Welcome back.</h1>
                    <p className="section__lede">Sign in to access the WolfHacks portal.</p>

                    {error && (
                        <div className="portal-login__error-box">
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        className="btn portal-login__discord"
                        type="button"
                        onClick={handleDiscordLogin}
                        disabled={loading}
                    >
                        Continue with Discord
                    </button>

                    {!showOrganizerLogin ? (
                        <button
                            type="button"
                            className="portal-login__organizer-toggle"
                            onClick={() => setShowOrganizerLogin(true)}
                        >
                            Organizer? Sign in with email
                        </button>
                    ) : (
                        <>
                            <div className="portal-login__divider">
                                <span>Organizers only</span>
                            </div>
                            <p className="portal-login__hint">
                                Hackers, use Discord above. This form is only for organizer accounts.
                            </p>

                            <form className="portal-login__form" onSubmit={handleLogin}>
                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </label>

                                <label>
                                    Password
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </label>

                                <button
                                    className="btn btn--primary"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Signing in...' : 'Sign in'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
