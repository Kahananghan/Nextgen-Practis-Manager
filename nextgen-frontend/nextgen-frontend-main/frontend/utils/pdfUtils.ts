import jsPDF from 'jspdf';

interface ProposalData {
  id?: string;
  title?: string;
  client_name?: string;
  client_email?: string;
  contact_name?: string;
  cover_message?: string;
  total_value?: string;
  subtotal?: string;
  gst_amount?: string;
  expiry_date?: string;
  service_lines?: any[];
  billing_settings?: any;
  firm_name?: string;
  firm_details?: {
    name?: string;
    abn?: string;
    address?: string;
  };
  letter?: string;
  terms?: string;
  acceptedDate?: string;
  client?: string;
  clientEmail?: string;
  value?: string;
  description?: string;
  billingType?: string;
  signature_data?: {
    file?: string;
    name?: string;
    type?: string;
  };
}

export const generateProposalPDF = async (proposal: ProposalData, isSigned: boolean = false, signatureBase64?: string) => {
  try {
    const doc = new jsPDF();
    
    // Set up PDF document
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 31, 61);
    doc.text(proposal.firm_name || 'Practis Manager', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(136, 136, 136);
    doc.text('Chartered Accountants · Adelaide SA', margin, yPosition);
    yPosition += 15;
    
    // Proposal title
    doc.setFontSize(14);
    doc.setTextColor(15, 31, 61);
    doc.text(isSigned ? 'Engagement Letter' : 'Proposal', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;
    
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    const splitTitle = doc.splitTextToSize(proposal.title || 'Proposal', 80);
    doc.text(splitTitle, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += splitTitle.length * 5 + 5;
    
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text(isSigned ? 'Status: Accepted' : 'Status: Accepted', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 20;
    
    // Divider
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;
    
    // Client Info
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Prepared For', margin, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(85, 85, 85);
    doc.setFont(undefined, 'normal');
    doc.text(proposal.client_name || proposal.client || 'Client', margin, yPosition);
    yPosition += 5;
    doc.text(proposal.client_email || proposal.clientEmail || '', margin, yPosition);
    yPosition += 5;
    if (proposal.contact_name) {
      doc.text(proposal.contact_name, margin, yPosition);
      yPosition += 5;
    }
    
    // Proposal Details
    yPosition = margin;
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Proposal Details', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(85, 85, 85);
    doc.setFont(undefined, 'normal');
    const acceptedDate = isSigned 
      ? new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : (proposal.acceptedDate || '---');
    doc.text(`Accepted: ${acceptedDate}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 5;
    if (isSigned) {
      doc.text(`Reference: ${proposal.id || 'N/A'}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 5;
    } else {
      doc.text(`Expiry: ${proposal.expiry_date || '---'}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 5;
    }
    const totalValue = proposal.total_value || proposal.value || '$0.00';
    doc.text(`Total: ${totalValue}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;
    
    // Cover message
    if (proposal.cover_message) {
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setTextColor(15, 31, 61);
      doc.setFont(undefined, 'bold');
      doc.text('Cover Message', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(85, 85, 85);
      doc.setFont(undefined, 'normal');
      const splitMessage = doc.splitTextToSize(`"${proposal.cover_message}"`, pageWidth - 40);
      doc.text(splitMessage, margin, yPosition);
      yPosition += splitMessage.length * 5 + 10;
    }
    
    // Description (for internal proposals)
    if (!isSigned && proposal.description) {
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setTextColor(15, 31, 61);
      doc.setFont(undefined, 'bold');
      doc.text('Description', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(85, 85, 85);
      doc.setFont(undefined, 'normal');
      const splitDescription = doc.splitTextToSize(proposal.description, pageWidth - 40);
      doc.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }
    
    // Services Table
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Services', margin, yPosition);
    yPosition += 10;
    
    // Table header
    doc.setFillColor(245, 245, 255);
    doc.rect(margin, yPosition - 5, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Service', margin + 2, yPosition);
    doc.text('Type', margin + 50, yPosition);
    doc.text('Qty', margin + 90, yPosition);
    doc.text('Rate', margin + 120, yPosition);
    doc.text('Total', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;
    
    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setTextColor(85, 85, 85);
    
    if (proposal.service_lines && proposal.service_lines.length > 0) {
      proposal.service_lines.forEach((line: any, index: number) => {
        checkPageBreak(10);
        
        const serviceName = line.service || '';
        const serviceType = line.type || 'Fixed';
        const quantity = (line.quantity || 1).toString();
        const rate = `$${line.rate ? parseFloat(line.rate).toFixed(2) : '0.00'}`;
        const amount = `$${line.amount || line.total ? parseFloat(line.amount || line.total).toFixed(2) : '0.00'}`;
        
        doc.text(serviceName, margin + 2, yPosition);
        doc.text(serviceType, margin + 50, yPosition);
        doc.text(quantity, margin + 90, yPosition);
        doc.text(rate, margin + 120, yPosition);
        doc.text(amount, pageWidth - margin, yPosition, { align: 'right' });
        
        if (line.description) {
          yPosition += 4;
          doc.setFontSize(8);
          doc.setTextColor(136, 136, 136);
          const splitDesc = doc.splitTextToSize(line.description, pageWidth - 160);
          doc.text(splitDesc, margin + 2, yPosition);
          yPosition += splitDesc.length * 4 + 2;
          doc.setFontSize(9);
          doc.setTextColor(85, 85, 85);
        } else {
          yPosition += 7;
        }
      });
    }
    
    // Summary
    checkPageBreak(40);
    yPosition += 10;
    doc.setFillColor(245, 245, 255);
    doc.rect(margin, yPosition - 5, pageWidth - 40, 35, 'F');
    
    const subtotal = proposal.subtotal || (totalValue && totalValue !== '$0.00' ? (parseFloat(totalValue.replace(/[$,]/g, '')) / 1.1).toFixed(2) : '0.00');
    const gst = proposal.gst_amount || (totalValue && totalValue !== '$0.00' ? ((parseFloat(totalValue.replace(/[$,]/g, '')) / 1.1) * 0.1).toFixed(2) : '0.00');
    
    doc.setFontSize(10);
    doc.setTextColor(136, 136, 136);
    doc.text('Subtotal (ex. GST)', margin + 5, yPosition);
    doc.text(`$${subtotal}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
    
    doc.text('GST (10%)', margin + 5, yPosition);
    doc.text(`$${gst}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
    
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Total', margin + 5, yPosition);
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text(totalValue, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;
    
    // Billing Info
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.setFont(undefined, 'bold');
    doc.text('Billing Information', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(136, 136, 136);
    doc.setFont(undefined, 'normal');
    const billingType = isSigned 
      ? (proposal.billing_settings?.type === 'recurring' ? 'Recurring' : 'One-off')
      : (proposal.billingType || 'Fixed fee');
    doc.text('Billing Type:', margin + 5, yPosition);
    doc.text(billingType, margin + 40, yPosition);
    yPosition += 8;
    
    if ((isSigned && proposal.billing_settings?.type === 'recurring') || (!isSigned && proposal.billingType === 'Recurring')) {
      const cycle = isSigned ? (proposal.billing_settings?.frequency || 'Monthly') : 'Monthly';
      doc.text('Cycle:', margin + 5, yPosition);
      doc.text(cycle, margin + 40, yPosition);
      yPosition += 8;
    }
    
    const paymentMethod = isSigned 
      ? (proposal.billing_settings?.payment_method || 'Direct debit')
      : 'Direct debit';
    doc.text('Payment:', margin + 5, yPosition);
    doc.text(paymentMethod, margin + 40, yPosition);
    yPosition += 15;
    
    // Signature Section (only for signed PDFs)
    if (isSigned) {
      checkPageBreak(80);
      doc.setDrawColor(199, 210, 254);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setTextColor(15, 31, 61);
      doc.setFont(undefined, 'bold');
      doc.text('Signature', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(85, 85, 85);
      doc.setFont(undefined, 'normal');
      doc.text(`Accepted by: ${proposal.contact_name || proposal.client_name || 'Client'}`, margin, yPosition);
      yPosition += 8;

      doc.text(`Date: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`, margin, yPosition);
      yPosition += 8;

      doc.text(`Time: ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`, margin, yPosition);
      yPosition += 8;

      // doc.text(`Reference: ${proposal.id || 'N/A'}`, margin, yPosition);
      // yPosition += 15;

      // Add signature image if available
      if (signatureBase64) {
        try {
          // Signature box
          doc.setDrawColor(199, 210, 254);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPosition, 60, 30);

          // Add signature image inside the box
          doc.addImage(signatureBase64, 'PNG', margin + 3, yPosition + 3, 54, 24);

          yPosition += 35;

          // Signature info below
          doc.setFontSize(9);
          doc.setTextColor(136, 136, 136);
          doc.setFont(undefined, 'normal');
          doc.text('Electronically signed', margin, yPosition);
          yPosition += 5;
          doc.text(`via Practis Manager System`, margin, yPosition);
          yPosition += 5;
          doc.text(`on ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`, margin, yPosition);
          yPosition += 15;
        } catch (error) {
          console.error('Error adding signature to PDF:', error);
          // Fallback to text if image fails
          doc.setFontSize(10);
          doc.setTextColor(136, 136, 136);
          doc.text('Signature: Electronically signed', margin, yPosition);
          yPosition += 20;
        }
      } else {
        // Fallback text if no signature
        doc.setFontSize(9);
        doc.setTextColor(136, 136, 136);
        doc.text('Electronically signed via Practis Manager System', margin, yPosition);
        yPosition += 5;
        doc.text(`on ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`, margin, yPosition);
        yPosition += 20;
      }

      // Legal notice
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      const legalText = 'This signature constitutes a legally binding agreement under the Electronic Transactions Act 1999 (Cth)';
      const splitLegal = doc.splitTextToSize(legalText, pageWidth - 40);
      doc.text(splitLegal, margin, yPosition);
      yPosition += splitLegal.length * 4 + 10;
    }
    
    // Footer
    checkPageBreak(50);
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(136, 136, 136);
    doc.text(proposal.firm_name || 'Practis Manager', margin, yPosition);
    doc.text('Chartered Accountants', margin, yPosition + 5);
    doc.text('Adelaide SA, Australia', margin, yPosition + 10);
    
    doc.text('Contact', pageWidth - margin, yPosition, { align: 'right' });
    doc.text('info@practismanager.com', pageWidth - margin, yPosition + 5, { align: 'right' });
    doc.text('+61 8 1234 5678', pageWidth - margin, yPosition + 10, { align: 'right' });
    
    yPosition += 20;
    doc.setDrawColor(238, 242, 255);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(136, 136, 136);
    const footerText = isSigned
      ? `This engagement letter was accepted on ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : `This proposal was accepted on ${proposal.acceptedDate || '---'}`;
    doc.text(footerText, pageWidth / 2, yPosition, { align: 'center' });
    doc.text('Generated by Practis Management System', pageWidth / 2, yPosition + 5, { align: 'center' });
    
    // Save the PDF
    const clientName = (proposal.client_name || proposal.client)?.replace(/[^a-z0-9]/gi, '_') || 'client';
    const proposalTitle = proposal.title?.replace(/[^a-z0-9]/gi, '_') || 'proposal';
    const suffix = isSigned ? '_signed' : '_accepted';
    doc.save(`${clientName}_${proposalTitle}${suffix}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
