
import React, { useState } from 'react';
import './chessModal.css'
import { Button } from '@mui/material';
import Modal from 'react-modal';


export default function ConfirmModal ({acceptAction, acceptLabel="Yes", declineAction, declineLabel="No", modalText, isOpen}) {

    return (
        <Modal open={isOpen}>
            <p>{modalText}</p>
            <div className='modal-button-wrapper'>
                <Button onClick={declineAction}>
                    {declineLabel}
                </Button>
                <Button variant='contained' onClick={acceptAction}>
                    {acceptLabel}
                </Button>
            </div>
        </Modal>
    )
};