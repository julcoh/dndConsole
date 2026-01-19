import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Modal } from '../../components/common';

interface NumpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
  title: string;
  max?: number;
  initialValue?: number;
}

const inputValue = signal('');

export function NumpadModal({ isOpen, onClose, onConfirm, title, max, initialValue = 0 }: NumpadModalProps) {
  useEffect(() => {
    if (isOpen) {
      inputValue.value = String(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleDigit = (digit: string) => {
    if (inputValue.value === '0') {
      inputValue.value = digit;
    } else {
      inputValue.value += digit;
    }
  };

  const handleClear = () => {
    inputValue.value = '0';
  };

  const handleBackspace = () => {
    if (inputValue.value.length <= 1) {
      inputValue.value = '0';
    } else {
      inputValue.value = inputValue.value.slice(0, -1);
    }
  };

  const handleConfirm = () => {
    let value = parseInt(inputValue.value, 10) || 0;
    if (max !== undefined) {
      value = Math.min(max, value);
    }
    onConfirm(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div class="numpad">
        <div class="numpad__display">
          <span class="numpad__value">{inputValue.value || '0'}</span>
          {max !== undefined && <span class="numpad__max">/ {max}</span>}
        </div>

        <div class="numpad__grid">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(digit => (
            <button
              key={digit}
              class="numpad__btn"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button class="numpad__btn numpad__btn--clear" onClick={handleClear}>C</button>
          <button class="numpad__btn" onClick={() => handleDigit('0')}>0</button>
          <button class="numpad__btn numpad__btn--back" onClick={handleBackspace}>←</button>
        </div>

        <div class="numpad__actions">
          <button class="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button class="btn" onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </Modal>
  );
}
