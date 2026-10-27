export const lfFields = (meta, { edit = false } = {}) => [
  { name: 'type', label: 'This item was…', type: 'select', required: true, options: [{ value: 'lost', label: 'Lost (I lost it)' }, { value: 'found', label: 'Found (I found it)' }], col: 4 },
  { name: 'name', label: 'Item name', required: true, max: 100, col: 8, placeholder: 'e.g. Black Wallet' },
  { name: 'category', label: 'Category', type: 'select', required: true, options: meta.LF_CATEGORIES, col: 4 },
  { name: 'location', label: 'Location', required: true, max: 140, col: 5, placeholder: 'Where was it lost / found?' },
  { name: 'date', label: 'Date', type: 'date', required: true, col: 3, maxToday: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, max: 1500, help: 'Colour, brand, distinguishing marks. Do not include sensitive numbers.' },
  { name: 'image', label: edit ? 'Replace photo (optional)' : 'Photo (optional)', type: 'file', accept: '.jpg,.jpeg,.png,.webp', help: 'JPG, PNG or WebP, max 3 MB.', col: 6 },
  { name: 'contactInfo', label: 'Contact info (optional)', max: 120, col: 6, placeholder: 'Phone or email', help: 'Private by default.' },
  { name: 'showContact', label: 'Show my contact info to other students', type: 'checkbox', help: 'If off, only you and administrators can see it.' },
];
