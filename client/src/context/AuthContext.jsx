import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const setData = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            setUser(session?.user || null);
            if (session) {
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("user", JSON.stringify(session.user));
            }
            setLoading(false);
        };

        const { data: { listener } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (session) {
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("user", JSON.stringify(session.user));
            } else {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
            setLoading(false);
        });

        setData();

        return () => {
            listener?.unsubscribe();
        };
    }, []);

    const signUp = (email, password) => supabase.auth.signUp({ email, password });
    const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
    const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google' });
    const signOut = () => supabase.auth.signOut();

    const value = {
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
