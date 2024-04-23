
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