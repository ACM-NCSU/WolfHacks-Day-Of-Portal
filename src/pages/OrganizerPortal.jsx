import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function OrganizerPortal() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            navigate('/portal/login', { replace: true });
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            await supabase.auth.signOut();
            navigate('/portal/login', { replace: true });
            return;
        }

        const data = await response.json();

        // Security Guard: Kick non-organizers out of the organizer portal
        if (data.role !== 'organizer' && data.role !== 'admin') {
            navigate('/portal', { replace: true });
            return;
        }

        setUser(data);
        setLoading(false);
    }

    async function logout() {
        await supabase.auth.signOut();
        navigate('/portal/login');
    }

    if (loading) {
        return (
            <main className="portal-page">
                <div className="container">
                    <p>Loading Organizer Portal...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="portal-page">
            <div className="container">
                <p className="eyebrow">ORGANIZER DASHBOARD</p>
                <h1 className="section__heading">Welcome, Organizer.</h1>
                <p className="section__lede">Signed in as {user.email}</p>

                <div className="portal-organizer__controls" style={{ margin: '2rem 0' }}>
                    {/* Add your organizer management features here (e.g., application reviews, check-in scanner) */}
                </div>

                <button className="btn btn--primary" onClick={logout}>
                    Sign out
                </button>
            </div>
        </main>
    );
}
