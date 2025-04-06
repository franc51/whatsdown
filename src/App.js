import "./App.css";
import { useEffect, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Loader from "./Components/Loader/loader.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";

function App() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleLoad = () => setIsPageLoading(false);

    if (document.readyState === "complete") {
      setIsPageLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/message")
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.log("Error fetching data:", error));
  }, []);

  if (isPageLoading) {
    return <Loader />;
  }

  return (
    <>
      <Chat />
      <h2>{message}</h2>
    </>
  );
}

export default App;
