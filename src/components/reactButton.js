import React, { useState } from 'react';
import './reactButton.css'
import  Button from '@mui/material/Button';

export default function ReactButton ({onClick, label, visible, variant='text'}) {

    return (
        <Button onClick={onClick}  variant={variant} style={{visibility: visible ? 'visible' : 'hidden'}}  className="button-wrapper">
            {label}
        </Button>
    )
};

