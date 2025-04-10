import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import "./App.css";
import { useEffect, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Loader from "./Components/Loader/loader.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";
import Account from "./Components/Account/account.jsx";

function App() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if there's a token in localStorage to determine if the user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);

        // Check if the token is expired
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.error("Invalid token");
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
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
        <Router>
          <Routes>
            <Route exact path="/" element={<Homepage></Homepage>}></Route>
            <Route exact path="/chat/:friendId" element={<Chat></Chat>}></Route>
            <Route exact path="/account" element={<Account></Account>}></Route>
          </Routes>
        </Router>
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
