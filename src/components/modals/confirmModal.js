//intent here is to make a simple yes/no modal for use when choosing to end a game

//will need an action to run on success, can be provided by parent
//for specific case of Quit Game, should provide 

import React, { useState } from 'react';
import './confirmModal.css'
import Modal from 'react-modal';


export default function ConfirmModal ({acceptAction, acceptLabel="Yes", declineAction, declineLabel="No", modalText, isOpen}) {

    return (
        <Modal isOpen={isOpen}>
            <p>{modalText}</p>
            <div className='confirm-cancel-button-wrapper'>
                <button onClick={declineAction}>
                    {declineLabel}
                </button>
                <button onClick={acceptAction}>
                    {acceptLabel}
                </button>
            </div>
        </Modal>
    )
};