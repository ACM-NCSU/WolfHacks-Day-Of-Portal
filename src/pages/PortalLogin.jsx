import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PortalLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

        // Successful authentication.
        window.location.href = '/portal';
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

                    <p className="eyebrow">
                        WOLFHACKS PORTAL
                    </p>

                    <h1 className="section__heading">
                        Welcome back.
                    </h1>

                    <p className="section__lede">
                        Sign in to access the WolfHacks portal.
                    </p>

                    <form
                        className="portal-login__form"
                        onSubmit={handleLogin}
                    >
                        <label>
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />
                        </label>

                        <label>
                            Password
                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />
                        </label>

                        <div className="portal-login__divider">
                            <span>OR</span>
                        </div>

                        <button
                            className="btn portal-login__discord"
                            type="button"
                            onClick={handleDiscordLogin}
                            disabled={loading}
                        >
                            Continue with Discord
                        </button>
                        
                        {error && (
                            <p className="portal-login__error">
                                {error}
                            </p>
                        )}

                        <button
                            className="btn btn--primary"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? 'Signing in...'
                                : 'Sign in'}
                        </button>
                    </form>

                </div>
            </div>
        </main>
    );
}