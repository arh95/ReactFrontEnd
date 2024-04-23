import React, { useState } from 'react';
import './reactButton.css'

//todo: need onClick property to run whne button is clicked
//todo: need label property so label can be set by parent component
//todo: utilize material design for button style
export default function ReactButton ({onClick, label, visible}) {

    return (
        <div onClick={onClick} style={{visibility: visible ? 'visible' : 'hidden'}}  className="button-wrapper">
            {label}
        </div>
    )
};

