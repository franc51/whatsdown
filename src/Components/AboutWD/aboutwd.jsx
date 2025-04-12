import React from "react";
import "./aboutwd.css"

export default function AboutWD() {
  return <div>
    <p>What is What's Down?</p>
    <p>It's simple.</p>
    <div className="aboutwd_description">
      <p>What's down is a what's up clone developed by Francisc, a frontend engineer located in Brasov, Romania</p>
      <ol>
      <li>
        Frontend Stack:
        <ul>
        <li>
          React v18
        </li>
        <li>
          HTML5
        </li>
        <li>
          CSS3
        </li>
        <li>
          JavaScript
        </li>
        </ul>
      </li>
      <li>
        Backend Stack:
        <ul>
        <li>
          Node v18
        </li>
        <li>
          JavaScript
        </li>
        <li>
          Websockets
        </li>
        </ul>
      </li>
      <li>
        DevOps Stack:
        <ul>
        <li>
          Render web service
        </li>
        This service deploys my frontend, and 2 backend servers
        <li>
          authService
        </li>
        <li>
          webSocketsService
        </li>
        </ul>
      </li>
      </ol>
    </div>
  </div>;
}
