export interface ParsedCSVRow {
  [key: string]: string;
}

/**
 * Parses CSV or TSV text content into an array of key-value objects.
 * Handles quoted fields and commas inside quotes.
 */
export function parseCSV(text: string): ParsedCSVRow[] {
  if (!text || !text.trim()) return [];

  // Remove UTF-8 BOM if present
  let cleanText = text.replace(/^\uFEFF/, '').trim();

  // Normalize line endings (\r\n and \r to \n)
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Auto-detect delimiter from header line (comma, semicolon, or tab)
  const headerLine = lines[0];
  let delimiter = ',';
  if ((headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((headerLine.match(/\t/g) || []).length > (headerLine.match(/,/g) || []).length) {
    delimiter = '\t';
  }

  // Parse header line
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const results: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === 0) continue;

    const row: ParsedCSVRow = {};
    headers.forEach((header, index) => {
      if (header) {
        row[header] = values[index] !== undefined ? values[index].trim() : '';
      }
    });

    results.push(row);
  }

  return results;
}

function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Download a CSV file in browser
 */
export function downloadCSVFile(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Sample Student CSV Template (Matching official APS ERP Format)
 */
export function getSampleStudentCSV(): string {
  const headers = [
    'Admission No',
    'Student Name',
    'Date of Birth',
    'Class',
    'Section',
    'Roll No',
    'Gender',
    'House',
    'Admission Category',
    'Father Name',
    'Father Mobile No',
    'Mother Name',
    'Mother Mobile No',
    'Father Email',
    'Mother Email',
    'Father Occupation',
    'Mother Occupation',
    'Sibling 1',
    'Sibling 2',
    'Route No',
    'Blood Group',
    'Date of Admission',
    'Date of Leaving',
    'Status',
    'Address'
  ];

  const sampleRows = [
    [
      'APS-2025-001',
      'Aarav Sharma',
      '2008-05-14',
      '11',
      'A',
      '1',
      'M',
      'Cariappa',
      'Serving Army',
      'Col. Vikram Sharma',
      '9876543210',
      'Mrs. Anita Sharma',
      '9876543211',
      'vikram.sharma@army.in',
      'anita.sharma@gmail.com',
      'Army Officer',
      'Teacher',
      'Riya Sharma (Class 8)',
      'None',
      'R-12',
      'O+',
      '2018-04-01',
      '2018-04-05',
      'Active',
      'Quarter 104-B, Army Officers Colony, Cantt'
    ],
    [
      'APS-2025-002',
      'Ananya Verma',
      '2009-08-22',
      '10',
      'B',
      '2',
      'F',
      'Manekshaw',
      'Ex-Servicemen',
      'Sub. Major R. K. Verma',
      '9812345678',
      'Mrs. Sunita Verma',
      '9812345679',
      'rkverma@exserv.in',
      'sunita.verma@gmail.com',
      'Defense Contractor',
      'Homemaker',
      'Karan Verma (Class 12)',
      'None',
      'R-05',
      'B+',
      '2019-04-01',
      '2019-04-02',
      'Active',
      'House 45, Defense Enclave, Cantt'
    ],
    [
      'APS-2025-003',
      'Rohan Gupta',
      '2010-03-10',
      '9',
      'A',
      '3',
      'M',
      'Thimayya',
      'Civilian',
      'Dr. Alok Gupta',
      '9988776655',
      'Dr. Priya Gupta',
      '9988776656',
      'alok.gupta@med.org',
      'priya.gupta@med.org',
      'Doctor',
      'Professor',
      'None',
      'None',
      'R-08',
      'A+',
      '2021-04-01',
      '2021-04-03',
      'Active',
      'Flat 302, Green Park Apartments, City'
    ]
  ];

  return [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
}

/**
 * Generate Sample Teacher / Staff CSV Template (Matching Official APS Staff ERP Format)
 */
export function getSampleTeacherCSV(): string {
  const headers = [
    'S No',
    'EMP ID',
    'DOJ',
    'DOC',
    'EMP NAM',
    'APPT',
    'EMP TYPE',
    'BANK ACC',
    'IFSC No.',
    'PAY',
    'REMARKS'
  ];

  const sampleRows = [
    [
      '1',
      'TEA-101',
      '2010-07-01',
      '2012-07-01',
      'Col. R. S. Rathore',
      'Vice Principal',
      'Regular',
      '309812345678',
      'SBIN0001234',
      '78800-209200 Level 12',
      'HOD Senior Secondary & Vice Principal'
    ],
    [
      '2',
      'TEA-102',
      '2015-04-10',
      '2017-04-10',
      'Mrs. Sunita Sharma',
      'PGT Physics',
      'Regular',
      '309887654321',
      'SBIN0001234',
      '47600-151100 Level 8',
      'Science Dept Head'
    ],
    [
      '3',
      'TEA-103',
      '2018-09-01',
      '2019-09-01',
      'Mr. Vikramjit Singh',
      'Sports Officer',
      'Regular',
      '501234567890',
      'PUNB0005678',
      '44900-142400 Level 7',
      'NCC & Sports Head'
    ],
    [
      '4',
      'TEA-104',
      '2021-01-15',
      '2022-01-15',
      'Dr. Meenakshi Sundaram',
      'TGT English',
      'Contractual',
      '609876543210',
      'HDFC0001234',
      '35400-112400 Level 6',
      'Humanities Dept'
    ]
  ];

  return [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
}
