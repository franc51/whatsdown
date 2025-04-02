import React from 'react';
import './homepage.css';

export default function Homepage () {
    return (
        <div className='homepage'>
            <div className='homepage_user'>
                <div>
                    <p>Hello</p>
                    <h3>Francisc</h3>
                </div>
                <div>
                    <a href='blanl.html'>S</a>
                    <a href='blanl.html'>B</a>
                </div>
            </div>

            <div className='homepage_nav'>
                <a className='homepage_chats' href='blanl.html'>All Chats</a>
                <a className='homepage_groups' href='blanl.html'>Groups</a>
                <a className='homepage_contacts' href='blanl.html'>Contacts</a>
            </div>

            <div className='homepage_chat_list'>
                <div className='homepage_chat_list_item'>
                    <div className='picAndName'>
                        <img className='homepage_chat_profileImg' alt='profileImg' src='/logo192.png'></img>
                         <div className='homepage_chat_profile'>
                         <h4 className='homepage_chat_profile_name'>
                            Puppy Muffet
                            </h4>
                         <p className='homepage_chat_profile_lastMessage'> hey mf whatsdown</p>
                     </div>
                    </div>
                    <p className='homepage_chat_profile_messageTime'>09:44 AM</p>
                </div>
            </div>
        </div>
    );
}