import React from "react";
import "./homepage.css";
import { useState } from "react";

export default function Homepage() {
  const [activeTab, setActiveTab] = useState("chats"); // Default tab is chats

  return (
    <div className="homepage">
      <div className="homepage_user">
        <div>
          <p className="homepage_greeting">Hello,</p>
          <h3 className="homepage_user_greeting">Sunshine</h3>
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

      <div className="homepage_nav">
        <a
          href="#"
          className={`homepage_chats link ${
            activeTab === "chats" ? "active_link" : ""
          }`}
          onClick={() => setActiveTab("chats")}
        >
          All Chats
        </a>
        <a
          href="#"
          className={`homepage_groups link ${
            activeTab === "groups" ? "active_link" : ""
          }`}
          onClick={() => setActiveTab("groups")}
        >
          Groups
        </a>
        <a
          href="#"
          className={`homepage_contacts link ${
            activeTab === "contacts" ? "active_link" : ""
          }`}
          onClick={() => setActiveTab("contacts")}
        >
          Contacts
        </a>
      </div>

      <div className="homepage_chat_list">
        <div className="homepage_chat_list_item">
          <div className="picAndName">
            <img
              className="homepage_chat_profileImg"
              alt="profileImg"
              src="/Images/human.png"
            ></img>
            <div className="homepage_chat_profile">
              <h4 className="homepage_chat_profile_name">Andy</h4>
              <p className="homepage_chat_profile_lastMessage">ce faci coae</p>
            </div>
          </div>
          <p className="homepage_chat_profile_messageTime">09:44 AM</p>
        </div>

        <div className="homepage_chat_list_item">
          <div className="picAndName">
            <img
              className="homepage_chat_profileImg"
              alt="profileImg"
              src="/Images/human.png"
            ></img>
            <div className="homepage_chat_profile">
              <h4 className="homepage_chat_profile_name">
                Radu Maria Antoaneta
              </h4>
              <p className="homepage_chat_profile_lastMessage">
                te iubesc viata mea
              </p>
            </div>
          </div>
          <p className="homepage_chat_profile_messageTime">20:56 AM</p>
        </div>

        <div className="homepage_chat_list_item">
          <div className="picAndName">
            <img
              className="homepage_chat_profileImg"
              alt="profileImg"
              src="/Images/human.png"
            ></img>
            <div className="homepage_chat_profile">
              <h4 className="homepage_chat_profile_name">Ludovico Einaudi</h4>
              <p className="homepage_chat_profile_lastMessage">
                hello mr francisc
              </p>
            </div>
          </div>
          <p className="homepage_chat_profile_messageTime">17:42 AM</p>
        </div>
      </div>
    </div>
  );
}
