import "./App.css";
import { useEffect, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Loader from "./Components/Loader/loader.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx"; // Assuming you'll use this for the chat

function App() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if there's a token in localStorage to determine if the user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true); // If there's a token, assume the user is logged in
    }

    const handleLoad = () => setIsPageLoading(false);

    if (document.readyState === "complete") {
      setIsPageLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  // If the page is still loading, show a loader
  if (isPageLoading) {
    return <Loader />;
  }

  // If the user is logged in, show the homepage
  if (isLoggedIn) {
    return (
      <div>
        <Homepage /> {/* Optionally show the chat component */}
      </div>
    );
  }

  // If the user is not logged in, show the welcome page
  return (
    <div>
      <WelcomePage /> {/* This will be the login/signup page */}
    </div>
  );
}

export default App;
