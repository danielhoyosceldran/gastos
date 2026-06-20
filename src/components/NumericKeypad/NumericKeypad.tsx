import './NumericKeypad.scss';

function applyKey(value: string, key: string): string {
  if (key === '⌫') return value.slice(0, -1);

  if (key === ',' || key === '.') {
    if (value.includes('.')) return value;
    return (value || '0') + '.';
  }

  if (key === '-') {
    if (value.startsWith('-')) return value.slice(1);
    return '-' + (value || '0');
  }

  // digit or "00"
  const digits = key; // '0'–'9' or '00'
  const dotIdx = value.indexOf('.');
  if (dotIdx !== -1) {
    // already has decimal — enforce max 2 decimal places
    if (value.length - dotIdx > 2) return value;
  }

  if (key === '00') {
    if (!value || value === '0') return value || '';
    if (dotIdx !== -1 && value.length - dotIdx > 0) return value; // can't add 00 after dot
    return value + '00';
  }

  if (value === '0') return key;
  return value + digits;
}

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onNext?: () => void;
}

export function NumericKeypad({ value, onChange, onNext }: NumericKeypadProps) {
  function press(key: string) {
    onChange(applyKey(value, key));
  }

  return (
    <div className="numpad">
      <button type="button" className="numpad__key" onClick={() => press('1')}>1</button>
      <button type="button" className="numpad__key" onClick={() => press('2')}>2</button>
      <button type="button" className="numpad__key" onClick={() => press('3')}>3</button>
      <button type="button" className="numpad__key numpad__key--del" onClick={() => press('⌫')}>⌫</button>

      <button type="button" className="numpad__key" onClick={() => press('4')}>4</button>
      <button type="button" className="numpad__key" onClick={() => press('5')}>5</button>
      <button type="button" className="numpad__key" onClick={() => press('6')}>6</button>
      <button type="button" className="numpad__key numpad__key--sign" onClick={() => press('-')}>−</button>

      <button type="button" className="numpad__key" onClick={() => press('7')}>7</button>
      <button type="button" className="numpad__key" onClick={() => press('8')}>8</button>
      <button type="button" className="numpad__key" onClick={() => press('9')}>9</button>
      {onNext && (
        <button
          type="button"
          className="numpad__key numpad__key--next"
          onClick={onNext}
        >
          Next →
        </button>
      )}

      <button type="button" className="numpad__key numpad__key--double" onClick={() => press('00')}>00</button>
      <button type="button" className="numpad__key" onClick={() => press('0')}>0</button>
      <button type="button" className="numpad__key numpad__key--dot" onClick={() => press(',')}>,</button>
      {/* 4th cell of last row intentionally empty — Next spans rows 3-4 */}
    </div>
  );
}
