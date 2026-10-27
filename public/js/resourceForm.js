// Shared resource upload/edit form definitions (student + admin)
export const resourceFields = (meta, { withFile = true } = {}) => [
  { name: 'title', label: 'Title', required: true, max: 140, col: 8 },
  { name: 'category', label: 'Category', type: 'select', required: true, options: meta.RESOURCE_CATEGORIES, col: 4 },
  { name: 'subject', label: 'Subject', required: true, max: 100, col: 6 },
  { name: 'department', label: 'Department', type: 'select', required: true, options: meta.DEPARTMENTS, col: 4 },
  { name: 'semester', label: 'Semester', type: 'number', required: true, min: 1, max: 10, col: 2 },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3, max: 1500 },
  ...(withFile ? [{ name: 'file', label: 'File', type: 'file', required: true, accept: '.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.txt', help: 'PDF, Word, PowerPoint, Excel or text. Max 10 MB.' }] : []),
];
