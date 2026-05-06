import { useState } from 'react';
import Icon from './Icon';

export default function Collapsible({ label, children, initOpen = false }) {
  const [open, setOpen] = useState(initOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 mb-1"
      >
        <Icon n={open ? 'chevron-down' : 'chevron-right'} size={12} />
        {label}
      </button>
      {open && children}
    </div>
  );
}
