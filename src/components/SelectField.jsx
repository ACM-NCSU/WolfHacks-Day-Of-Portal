import { useEffect, useRef, useState } from 'react';

export default function SelectField({ name, value, onChange, options, placeholder = 'Select an option', disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function select(event, option) {
    // These options render inside a <label>, so a plain click here also
    // triggers the browser's native label->control click forwarding onto
    // the sibling <input>, which re-toggles it open right after we close it.
    event.preventDefault();
    onChange(name, option);
    setOpen(false);
  }

  return (
    <div className="application-form__searchable application-form__searchable--select" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        readOnly
        onClick={() => !disabled && setOpen((current) => !current)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {open && (
        <div className="application-form__dropdown">
          {options.map((option) => (
            <div
              key={option}
              onClick={(event) => select(event, option)}
              className={`application-form__dropdown-item ${value === option ? 'application-form__dropdown-item--selected' : ''}`}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
