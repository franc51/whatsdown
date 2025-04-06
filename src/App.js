import "./App.css";
import { useEffect, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Loader from "./Components/Loader/loader.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";

function App() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const handleLoad = () => setIsPageLoading(false);

    if (document.readyState === "complete") {
      setIsPageLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  if (isPageLoading) {
    return <Loader />;
  }

  return (
    <>
      <Chat />
    </>
  );
}

export default App;
