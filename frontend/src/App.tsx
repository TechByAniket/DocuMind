import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import HomePage from "./pages/HomePage";
// App-specific Document type (custom backend schema, not browser DOM window.document)
import type { Document } from './types/document';

// Determines which screen to show in the main app
type View = 'home' | 'chat';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);

  // Check existing session and listen for auth state changes (login / logout)
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Could not retrieve session:", error.message);
      }

      setSession(data.session);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Switch to the chat screen for the selected document
  function openChat(document: Document) {
    setActiveDocument(document);
    setCurrentView('chat');
  }

  // Return back to the document library home screen
  function goHome() {
    setCurrentView('home');
    setActiveDocument(null);
  }

  // Sign out user from Supabase session
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out failed:', error.message);
    }
  }


  // 1. Initial loading state while verifying auth token
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <p className="text-sm text-[#737384]">Checking your session...</p>
      </div>
    );
  }

  // 2. Unauthenticated state: show login/signup screen
  if (!session) {
    return <LoginPage />;
  }

  // 3. Chat view: show active document conversation
  if (currentView === 'chat' && activeDocument) {
    return <ChatPage document={activeDocument} onBack={goHome} />;
  }

  return (
  <HomePage
    onOpenChat={openChat}
    userEmail={session.user.email}
    onSignOut={handleSignOut}
  />
);
}