// functions/utils/receipt-generator.js
const PDFDocument = require('pdfkit');

/**
 * Creates a PDF receipt from order details
 * @param {Object} orderDetails - The order details
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function createReceiptPDF(orderDetails) {
  return new Promise((resolve, reject) => {
    try {
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });
      
      // Collect PDF in memory
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Format date
      const orderDate = orderDetails.date 
        ? new Date(orderDetails.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
      
      // Add header
      doc.fontSize(25)
        .text('SleepTech', { align: 'center' })
        .moveDown(0.5);
      
      doc.fontSize(16)
        .text('Receipt', { align: 'center' })
        .moveDown(1);
      
      // Add receipt details
      doc.fontSize(12);
      
      // Add order info
      doc.text(`Order Number: ST-${orderDetails.sessionId || 'N/A'}`)
        .moveDown(0.5);
      
      doc.text(`Date: ${orderDate}`)
        .moveDown(0.5);
      
      doc.text(`Customer: ${orderDetails.customerName || 'N/A'}`)
        .moveDown(0.5);
      
      doc.text(`Email: ${orderDetails.customerEmail || 'N/A'}`)
        .moveDown(1.5);
      
      // Add table header
      const tableTop = doc.y;
      const itemX = 50;
      const descriptionX = 150;
      const amountX = 400;
      
      doc.font('Helvetica-Bold')
        .text('Item', itemX, tableTop)
        .text('Description', descriptionX, tableTop)
        .text('Amount', amountX, tableTop)
        .moveDown();
      
      // Add horizontal line
      doc.moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(0.5);
      
      // Add item row
      doc.font('Helvetica')
        .text('1', itemX, doc.y)
        .text(orderDetails.productName || 'SleepTech Course', descriptionX, doc.y)
        .text(`$${orderDetails.amount || '99.00'}`, amountX, doc.y)
        .moveDown();
      
      // Add horizontal line
      doc.moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(0.5);
      
      // Add total
      doc.font('Helvetica-Bold')
        .text('Total', descriptionX, doc.y)
        .text(`$${orderDetails.amount || '99.00'}`, amountX, doc.y)
        .moveDown(2);
      
      // Add payment method
      doc.font('Helvetica')
        .text(`Payment Method: ${orderDetails.paymentMethod || 'Credit Card'}`)
        .moveDown(2);
      
      // Add footer
      doc.fontSize(10)
        .text('Thank you for your purchase!', { align: 'center' })
        .moveDown(0.5)
        .text('If you have any questions, please contact us at hello@risegg.net', { align: 'center' })
        .moveDown(0.5)
        .text('© 2025 SleepTech. All rights reserved.', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createReceiptPDF
};
