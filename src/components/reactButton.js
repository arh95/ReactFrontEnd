import React, { useState } from 'react';
import './reactButton.css'
import  Button from '@mui/material/Button';

export default function ReactButton ({onClick, label, visible=true, disabled=false, variant='text'}) {

    return (
        <Button onClick={onClick} disabled={disabled} variant={variant} style={{visibility: visible ? 'visible' : 'hidden'}}  className="button-wrapper">
            {label}
        </Button>
    )
};

