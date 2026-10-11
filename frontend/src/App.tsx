import { useState } from 'react';
import type { Document } from './types/document';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';

// App uses simple React state to switch between "home" and "chat" views.
// We don't need React Router because there are only two screens and no
// deep-linking requirement at this stage.

type View = 'home' | 'chat';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  // The document the user opened for chatting
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);

  function openChat(document: Document) {
    setActiveDocument(document);
    setCurrentView('chat');
  }

  function goHome() {
    setCurrentView('home');
    setActiveDocument(null);
  }

  if (currentView === 'chat' && activeDocument) {
    return <ChatPage document={activeDocument} onBack={goHome} />;
  }

  return <HomePage onOpenChat={openChat} />;
}
