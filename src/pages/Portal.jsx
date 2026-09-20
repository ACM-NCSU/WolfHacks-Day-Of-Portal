import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Portal() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            window.location.href = '/portal/login';
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            await supabase.auth.signOut();

            if (response.status === 403) {
                window.location.href = '/portal/login?error=not_registered';
                return;
            }

            setError(errData.detail || 'Authentication failed. Please sign in again.');
            setLoading(false);
            return;
        }

        const data = await response.json();

        // Role-Based Redirect: Send Organizers & Admins to the Organizer Dashboard
        if (data.role === 'organizer' || data.role === 'admin') {
            window.location.href = '/portal/organizer';
            return;
        }

        setUser(data);
        setLoading(false);
    }

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = '/portal/login';
    }

    if (loading) {
        return (
            <main className="portal-page">
                <div className="container">
                    <p>Loading Portal...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="portal-page">
                <div className="container">
                    <p>{error}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="portal-page">
            <div className="container">
                <p className="eyebrow">HACKER PORTAL</p>

                <h1 className="section__heading">Welcome.</h1>

                <p className="section__lede">Signed in as {user.email}</p>

                <button className="btn btn--primary" onClick={logout}>
                    Sign out
                </button>
            </div>
        </main>
    );
}