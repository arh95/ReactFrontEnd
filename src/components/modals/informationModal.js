//to use as a modal to present a user with relevant information
//thinking to use this to alert the user of the game id, if i don't choose to set a string of the board's id directly on the guy//intent here is to make a simple yes/no modal for use when choosing to end a game

//will need an action to run on success, can be provided by parent
//for specific case of Quit Game, should provide 

import React, { useState } from 'react';
import './informationModal.css'
import Modal from 'react-modal';


export default function InformationModal ({closeAction, closeLabel="Close",  modalText, isOpen}) {

    return (
        <Modal isOpen={isOpen} ariaHideApp={false}  >
            <p>{modalText}</p>
            <div className='close-button-wrapper'>
                <button onClick={closeAction}>
                    {closeLabel}
                </button>
            </div>
        </Modal>
    )
};