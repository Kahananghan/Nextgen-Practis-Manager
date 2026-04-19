  // Template data
export  const letterTemplates = [
    {
      id: 'standard_company',
      name: 'Standard Engagement Letter — Company',
      content: `Dear {client_name},

Thank you for engaging {firm_name} to provide accounting and taxation services. This letter sets out the terms of our engagement effective {start_date}.

Scope of Services
We will provide the following services as outlined in the attached fee schedule: {service_summary}.

Our Fees
Our fees for the services described above will be {total_value} (inclusive of GST). Invoices will be issued as agreed and are payable within 14 days of invoice date.

Your Responsibilities
You agree to provide us with all information, records and documents we require to complete the services in a timely manner.

Please review and sign this engagement letter to confirm your acceptance of these terms.

Yours sincerely,
{firm_name}`
    },
    {
      id: 'standard_individual',
      name: 'Standard Engagement Letter — Individual',
      content: `Dear {client_name},

Thank you for engaging {firm_name} to provide accounting and taxation services. This letter sets out the terms of our engagement effective {start_date}.

Scope of Services
We will provide the following services as outlined in the attached fee schedule: {service_summary}.

Our Fees
Our fees for the services described above will be {total_value} (inclusive of GST). Invoices will be issued as agreed and are payable within 14 days of invoice date.

Your Responsibilities
You agree to provide us with all information, records and documents we require to complete the services in a timely manner.

Please review and sign this engagement letter to confirm your acceptance of these terms.

Yours sincerely,
{firm_name}`
    },
    {
      id: 'smsf',
      name: 'SMSF Engagement Letter',
      content: `Dear {client_name},

Thank you for engaging {firm_name} to provide accounting and taxation services in accordance with SMSF standards.

Scope of Services
We will provide the following services as outlined in the attached fee schedule: {service_summary}.

Our Fees
Our fees for the services described above will be {total_value} (inclusive of GST). Invoices will be issued as agreed and are payable within 14 days of invoice date.

Your Responsibilities
You agree to provide us with all information, records and documents we require to complete the services in a timely manner.

Please review and sign this engagement letter to confirm your acceptance of these terms.

Yours sincerely,
{firm_name}`
    },
    {
      id: 'custom',
      name: 'Custom Template',
      content: ''
    }
  ];

export  const termsTemplates = [
    {
      id: 'standard_firm',
      name: 'Standard T&Cs — Accounting Firm (default)',
      content: `1. Engagement
These terms and conditions govern the provision of professional accounting services by {firm_name} ABN 12 345 678 901 (we, us, our) to the client named in this proposal (you).

2. Services
We will provide the services as described in the engagement letter and any additional services requested outside of the agreed scope will be subject to a separate fee arrangement.

3. Client obligations
You are responsible for the accuracy and completeness of all information provided to us. We will rely on the information you provide without independent verification.

4. Fees and payment
Our fees are as set out in this proposal. Invoices are due within 14 days. We reserve the right to suspend services if invoices remain unpaid beyond 30 days.

5. Confidentiality
We will maintain the confidentiality of your information in accordance with the professional standards applicable to our practice.

6. Limitation of liability
To the extent permitted by law, our liability for any claims arising from our services shall be limited to the fees paid by you for those services.

{firm_name}`
    },
    {
      id: 'caanz',
      name: 'CAANZ Standard T&Cs',
      content: `1. Engagement
These terms and conditions govern the provision of professional accounting services by {firm_name} ABN 12 345 678 901 (we, us, our) to the client named in this proposal (you).

2. Services
We will provide the services as described in the engagement letter and any additional services requested outside of the agreed scope will be subject to a separate fee arrangement.

3. Client obligations
You are responsible for the accuracy and completeness of all information provided to us. We will rely on the information you provide without independent verification.

4. Fees and payment
Our fees are as set out in this proposal. Invoices are due within 14 days. We reserve the right to suspend services if invoices remain unpaid beyond 30 days.

5. Confidentiality
We will maintain the confidentiality of your information in accordance with the professional standards applicable to our practice.

6. Limitation of liability
To the extent permitted by law, our liability for any claims arising from our services shall be limited to the fees paid by you for those services.

{firm_name}`
    },
    {
      id: 'custom',
      name: 'Custom T&Cs',
      content: ''
    }
  ];
