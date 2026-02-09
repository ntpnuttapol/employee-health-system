// Thai Font Utility for jsPDF
// Uses Sarabun font from Google Fonts (subset for smaller file size)

// This is a simplified approach - we'll use a workaround 
// by rendering Thai text as Unicode-escaped strings and using available fonts

export const setupThaiFont = async (doc) => {
  // jsPDF doesn't support Thai natively without embedded fonts
  // For now, we'll use a fallback approach with proper character handling
  
  // Note: For full Thai support, you would need to:
  // 1. Download Sarabun-Regular.ttf from Google Fonts
  // 2. Convert it to base64 using jsPDF font converter
  // 3. Embed the base64 string here (usually ~300KB+)
  
  // Current workaround: Return false to indicate no Thai font available
  // The calling code should use English labels in PDF export
  return false;
};

// Thai to English label mapping for PDF exports
export const thaiToEnglishLabels = {
  // Health Dashboard
  'อันดับ': '#',
  'ชื่อ-นามสกุล': 'Name',
  'แผนก': 'Department',
  'ความดัน': 'Blood Pressure',
  'ชีพจร': 'Heart Rate',
  'น้ำตาล': 'Blood Sugar',
  'ความเสี่ยง': 'Risk Factors',
  'วันที่ตรวจ': 'Date',
  'วันที่': 'Date',
  'รหัสพนักงาน': 'Employee Code',
  'น้ำหนัก': 'Weight',
  'ส่วนสูง': 'Height',
  'หมายเหตุ': 'Notes',
  'ความดันสูงมาก (วิกฤต)': 'Critical High BP',
  'ความดันสูง': 'High BP',
  'ชีพจรช้าผิดปกติ': 'Low Heart Rate',
  'ชีพจรเร็วผิดปกติ': 'High Heart Rate',
  'น้ำตาลสูงมาก': 'Very High Sugar',
  'น้ำตาลสูง': 'High Sugar'
};

// Convert Thai risk labels to English for PDF
export const translateRisks = (thaiRisks) => {
  return thaiRisks.map(risk => thaiToEnglishLabels[risk] || risk);
};

// Format date for PDF (use English format)
export const formatDateForPDF = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTimeForPDF = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
