import React from 'react';

// Text formatting utilities for proposal builder

export interface FormatOptions {
  bold?: string;
  italic?: string;
  underline?: string;
  h1?: string;
  h2?: string;
  paragraph?: string;
  list?: string;
  tags?: string;
}

// Rich text formatting for contentEditable divs
export const applyFormatting = (
  format: string, 
  contentRef: React.RefObject<HTMLDivElement>,
  setLetterContent?: (content: string) => void,
  setTermsContent?: (content: string) => void,
  letterRef?: React.RefObject<HTMLDivElement>,
  termsRef?: React.RefObject<HTMLDivElement>
) => {
  // Focus the contentEditable div
  if (contentRef.current) {
    contentRef.current.focus();
  }

  let command = '';
  switch (format) {
    case 'bold':
      command = 'bold';
      break;
    case 'italic':
      command = 'italic';
      break;
    case 'underline':
      command = 'underline';
      break;
    case 'h1':
      command = 'formatBlock';
      document.execCommand(command, false, 'h1');
      break;
    case 'h2':
      command = 'formatBlock';
      document.execCommand(command, false, 'h2');
      break;
    case 'paragraph':
      command = 'formatBlock';
      document.execCommand(command, false, 'p');
      break;
    case 'list':
      command = 'insertUnorderedList';
      document.execCommand(command, false, null);
      break;
    case 'tags':
      // Insert template variables
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const templateVars = '{client_name} {firm_name} {total_value} {start_date} {service_summary}';
        const textNode = document.createTextNode(templateVars);
        range.deleteContents();
        range.insertNode(textNode);
      }
      break;
    default:
      return;
  }

  // Apply formatting for basic formats
  if (format === 'bold' || format === 'italic' || format === 'underline') {
    document.execCommand(command, false, null);
  }

  // Update content state
  setTimeout(() => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML;
      if (letterRef && contentRef.current === letterRef.current && setLetterContent) {
        setLetterContent(newContent);
      } else if (termsRef && contentRef.current === termsRef.current && setTermsContent) {
        setTermsContent(newContent);
      }
    }
  }, 10);
};


// Convert plain text to HTML for contentEditable
export const convertToHTML = (text: string) => {
  return text
    .split('\n')
    .map(line => {
      // Check if line looks like a header (all caps or ends with colon)
      if (/^[A-Z][A-Z\s]*:?$/.test(line.trim()) || /^(Scope of Services|Our Fees|Your Responsibilities|Dear|Yours sincerely)$/i.test(line.trim())) {
        return `<h3>${line}</h3>`;
      }
      // Regular paragraph
      return line.trim() ? `<p>${line}</p>` : '<br/>';
    })
    .join('');
};

export const templateVariables = {
  client_name: 'Client Name',
  firm_name: 'Your Firm Name',
  total_value: 'Total Value',
  start_date: 'Start Date',
  service_summary: 'Service Summary',
  contact_name: 'Contact Name',
  client_email: 'Client Email',
  expiry_date: 'Expiry Date',
  proposal_title: 'Proposal Title'
};

