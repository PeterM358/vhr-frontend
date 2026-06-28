/** Build invoice import preview state from a receiving batch (survives refresh). */

export function buildInvoicePreviewFromBatch(batch, uploadPreview = null) {
  if (uploadPreview) {
    return uploadPreview;
  }
  if (!batch || batch.source_type !== 'invoice_upload') {
    return null;
  }

  const linesParsed = batch.line_count ?? batch.lines?.length ?? 0;
  const status = batch.ocr_status || 'unknown';

  let message = '';
  if (status === 'ready' && linesParsed > 0) {
    message = `${linesParsed} line${linesParsed === 1 ? '' : 's'} parsed — review below and tap Edit on anything in red.`;
  } else if (status === 'no_text') {
    message =
      'No readable text in this file (scan/photo). Add parts manually or re-scan with a text PDF.';
  } else if (linesParsed === 0) {
    message = 'No line items matched this layout — add parts manually while viewing the PDF.';
  } else {
    message = 'Review parsed lines below.';
  }

  return {
    ocr_status: status,
    layout_id: '',
    lines_parsed: linesParsed,
    supplier_name: batch.supplier_name || '',
    invoice_number: batch.invoice_number || '',
    invoice_date: batch.invoice_date || null,
    message,
    has_file: Boolean(batch.source_file_stored && batch.source_file_url),
  };
}

export function isImageDocumentUrl(url) {
  if (!url) return false;
  const lower = String(url).split('?')[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|tiff?)$/.test(lower);
}

export function isPdfDocumentUrl(url) {
  if (!url) return false;
  const lower = String(url).split('?')[0].toLowerCase();
  return lower.endsWith('.pdf');
}
