import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Triggers native high-fidelity vector PDF print dialog
 * This preserves perfect selectable text, font kerning, and crisp vectors
 */
export function printResume(): void {
  window.print();
}

/**
 * Generates and downloads a direct .pdf file using html2canvas & jsPDF
 */
export async function exportResumeToPdf(
  elementId: string,
  fileName: string = 'Resume.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Resume preview element with id "${elementId}" not found`);
  }

  // Create clone or canvas
  const canvas = await html2canvas(element, {
    scale: 2.5, // High DPI for retina / print sharpness
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  
  // Standard A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210;
  const pageHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Subsequent pages if long
  while (heightLeft > 5) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
