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