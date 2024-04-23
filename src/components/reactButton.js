import React, { useState } from 'react';
import './reactButton.css'

export default function ReactButton ({onClick, label, visible}) {

    return (
        <div onClick={onClick} style={{visibility: visible ? 'visible' : 'hidden'}}  className="button-wrapper">
            {label}
        </div>
    )
};

