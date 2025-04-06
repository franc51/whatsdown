import React from "react";
import "./chat.css";

export default function Homepage() {
  return (
    <div className="homepage">
      <div className="homepage_user">
        <div className="picAndName">
          <img
            className="homepage_chat_profileImg"
            alt="profileImg"
            src="/Images/human.png"
          ></img>
          <div className="homepage_chat_profile">
            <h4 className="homepage_chat_profile_name">Marcelino</h4>
            <p className="homepage_chat_profile_lastMessage">Online</p>
          </div>
        </div>
        <div>
          <button
            className="homepage_searchBtn searchMenuBtn_style"
            id="homepage_searchBtn"
            href="blank.html"
          />
          <button
            className="homepage_menuBtn searchMenuBtn_style"
            id="homepage_menuBtn"
            href="blank.html"
          />
        </div>
      </div>

      <div>
        <div className="chat_container">
          <p>Sug pula</p>
        </div>

        <div className="chat_sender">
          <input className="chat_sender_input" type="text" />
          <button className="chat_sender_submit" type="submit"></button>
        </div>
      </div>
    </div>
  );
}
