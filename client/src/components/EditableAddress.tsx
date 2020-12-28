import React, { useState } from 'react';


interface InputAddress {
  value: string,
  valid: boolean,
}

function isETHAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}


const EditableAddress: React.SFC<any> = function({defaultValue = '', onValueEdited}) {

  const [isEditing, setIsEditing] = useState(false);
  const [currentInput, setCurrentInput] = useState<InputAddress>({value: defaultValue, valid: false});

  function onInputChanged(e: any) {
    const inputValue: string = e.target.value;
    setCurrentInput({
      value: inputValue,
      valid: isETHAddress(inputValue)
    });
  }

  function onClickOk() {
    setIsEditing(false);
    onValueEdited(currentInput.value);
  }

  function onClickEdit() {
    setIsEditing(true);
  }

  if (isEditing) {
    return (
      <span>
        <input size={46} maxLength={42} value={currentInput.value} onChange={onInputChanged}></input> 
        <button onClick={() => onClickOk()} disabled={!currentInput.valid}>Ok</button>
      </span>
    )
  } else {
    return (
      <span>
        {currentInput.value} 
        <button onClick={() => onClickEdit()}>Edit</button>
      </span>
    )
  }

}

export default EditableAddress;