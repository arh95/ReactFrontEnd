//intent here is to make a simple yes/no modal for use when choosing to end a game

//will need an action to run on success, can be provided by parent
//for specific case of Quit Game, should provide 

import React, { useState, setState } from 'react';
import './confirmModal.css'
import Modal from 'react-modal';


export default function NumberInputModal ({acceptAction, acceptLabel="Yes", declineAction, declineLabel="No", inputLabel, isOpen}) {

    const [inputValue, setInputValue] = useState(0);
    const [submitDisabled, setSubmitDisabled] = useState(true);

    function handleInputUpdate(event)
    {
        console.log(event);
        let inputValue = event.target.value;
        //have to perform type conversion, because even when input type is set to number, the value stored within is of type string,

        //which causes issues on the server side becuase ID value needs to be an int
        setInputValue(parseInt(inputValue));
        setSubmitDisabled(inputValue.length <= 0);
    }
    function handleSubmit()
    {
        acceptAction(inputValue);
    }

    return (
        <Modal isOpen={isOpen}>
            <label>
                {inputLabel}
                <input type="number" onChange={handleInputUpdate} value={inputValue}/>
     
            </label>
            <div className='confirm-cancel-button-wrapper'>
                <button onClick={declineAction}>
                    {declineLabel}
                </button>
                <button disabled={submitDisabled} onClick={handleSubmit}>
                    {acceptLabel}
                </button>
            </div>
        </Modal>
    )
};