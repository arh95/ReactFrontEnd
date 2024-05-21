import React, { useState } from 'react';
import './chessModal.css'
import { Button } from '@mui/material';
import Modal from 'react-modal';


export default function InformationModal ({closeAction, closeLabel="Close",  modalText, isOpen}) {

    return (
        <Modal isOpen={isOpen} ariaHideApp={false}>
            <p>{modalText}</p>
            <div className='modal-button-wrapper'>
                <Button onClick={closeAction} variant='outlined'>
                    {closeLabel}
                </Button>
            </div>
        </Modal>
    )
};