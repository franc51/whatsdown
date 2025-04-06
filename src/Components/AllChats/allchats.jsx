import React from "react";
import { useState } from "react";

export default function AllChats() {
  return (
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
    </div>
  );
}
