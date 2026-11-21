import { useState, type HTMLAttributes } from 'react';
import { createRoot } from 'react-dom/client';
import { MetroPivot } from 'windows-phone-metro-ui/pivot';
import 'windows-phone-metro-ui/pivot-item';

type Change = CustomEvent<{ value: string }>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'metro-pivot': HTMLAttributes<MetroPivot> & {
        value: MetroPivot['value'];
        label: string;
        'onmetro-change': (event: Change) => void;
      };
      'metro-pivot-item': HTMLAttributes<HTMLElement> & { value: string; label: string };
    }
  }
}

function App() {
  const [value, setValue] = useState('one');
  const [choices, setChoices] = useState<string[]>([]);

  function handleChange(event: Change) {
    const next = event.detail.value;
    setValue(next);
    setChoices((current) => [...current, next]);
  }

  return (
    <>
      <h1>React 19 with TypeScript</h1>
      <button type="button" onClick={() => setValue('two')}>Select two programmatically</button>
      <output id="events">{`${choices.length}:${choices.join(',')}`}</output>
      <metro-pivot value={value} label="Folders" onmetro-change={handleChange}>
        <metro-pivot-item value="one" label="One">First folder</metro-pivot-item>
        <metro-pivot-item value="two" label="Two">Second folder</metro-pivot-item>
      </metro-pivot>
    </>
  );
}

if (customElements.get('metro-pivot') !== MetroPivot) throw new Error('Wrong Pivot registration');
if (customElements.get('metro-command-bar') || customElements.get('metro-tile')) {
  throw new Error('Pivot import registered unrelated components');
}
await Promise.all([
  import('windows-phone-metro-ui/command-bar'),
  import('windows-phone-metro-ui/tile'),
]);
createRoot(document.getElementById('app')!).render(<App />);
