import "./App.css";
import { useEffect, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";

function App() {

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/message")
    .then((response) => response.json())
    .then((data) => setMessage(data.message))
    .catch((error) => console.log("Error fetching data:", error));
  })
  return (
    <>
      <WelcomePage />
      <h2>{message}</h2>
    </>
  );
}

export default App;
