import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Define a minimal interface for what we need, or import form types if possible.
// To avoid circular dependencies or complex imports, we'll define a local interface matches ExchangeData
interface ExchangeDataForPdf {
  exchangeId: string;
  expiresAt?: string;
  startSeat?: number;
  endSeat?: number;
  startCoach?: string;
  endCoach?: string;
  requester?: {
    reason?: string;
    preference?: string;
  };
}

interface GenerateTicketParams {
  exchange: ExchangeDataForPdf;
  userName: string;
  userPnr: string;
  userClass: string;
  userCoach: string;
}

export const generateTicketPdf = async ({
  exchange,
  userName,
  userPnr,
  userClass,
  userCoach,
}: GenerateTicketParams): Promise<void> => {
  console.log("Starting PDF generation (Utility/Iframe Mode) for:", exchange.exchangeId);

  // 1. Create a hidden Iframe to isolate styles (Fixes 'oklch' error and Tailwind conflicts)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '800px'; // Ensure sufficient width for the ticket
  iframe.style.height = '1200px';
  iframe.style.opacity = '0'; // Invisible to user
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1000';
  document.body.appendChild(iframe);

  // 2. Prepare Data
  const ex = exchange;
  const startCoachLabel = ex.startCoach ? `(Coach ${ex.startCoach})` : ex.startSeat ? `(Coach ${userCoach})` : '';
  const endCoachLabel = ex.endCoach ? `(Coach ${ex.endCoach})` : `(Coach ${userCoach})`;

  // 3. Define Ticket HTML
  // Official Indian Railway Theme: Monospace font, simple borders, grid layout.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket</title>
      <style>
        /* Reset defaults to avoid browser inconsistencies */
        body { margin: 0; padding: 20px; font-family: 'Courier New', Courier, monospace; background: #ffffff; }
        * { box-sizing: border-box; }
        .label { font-size: 10px; font-weight: bold; color: #1e293b; text-transform: uppercase; }
        .value { font-size: 14px; font-weight: bold; color: #000; }
        .row { display: flex; justify-content: space-between; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div id="ticket-content" style="background: #bfdbfe; padding: 30px; width: 480px; border: 2px dashed #1e293b; border-radius: 6px; position: relative; color: #1e293b; margin: 0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        
        <div style="text-align: center; border-bottom: 2px dashed #1e293b; padding-bottom: 20px; margin-bottom: 25px;">
          <div style="font-size: 20px; font-weight: 800; color: #1e3578ff; text-transform: uppercase; letter-spacing: 1px;">Smart Rail</div>
          <div style="font-size: 12px; font-weight: 600; color: #3069b7ff; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Seat Exchange Receipt</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
          <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase; letter-spacing: 0.5px;">Passenger</span>
          <span style="font-weight: 700; color: #1e293b;">${userName}</span>
            </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
          <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase; letter-spacing: 0.5px;">PNR</span>
          <span style="font-weight: 700; color: #1e293b;">${userPnr}</span>
            </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
          <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase; letter-spacing: 0.5px;">Ref ID</span>
          <span style="font-weight: 700; color: #1e293b;">#${ex.exchangeId.slice(-8).toUpperCase()}</span>
          </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
          <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase; letter-spacing: 0.5px;">Time</span>
          <span style="font-weight: 700; color: #1e293b;">${new Date(ex.expiresAt!).toLocaleString()}</span>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 25px 0; text-align: center; border-radius: 12px;">
          <div style="font-weight: 700; color:#3069b7ff; text-transform: uppercase; margin-bottom: 15px; font-size: 10px; letter-spacing: 1px;">Seat Exchange Confirmed</div>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
             <div style="text-align: right;">
                <div style="font-size: 10px; color: #1e293b; text-transform: uppercase; font-weight: 700;">Old</div> 
                <div style="font-size: 24px; font-weight: 800; color:#3069b7ff;">${ex.startSeat}</div>
                <div style="font-size: 10px; color: #ef4444; font-weight: 700;">${startCoachLabel}</div>
             </div>
             
             <div style="font-size: 20px; color: #3b82f6;">➜</div>
             
             <div style="text-align: left;">
                <div style="font-size: 10px; color: #047857; text-transform: uppercase; font-weight: 700;">New</div>
                <div style="font-size: 24px; font-weight: 800; color: #3b82f6;">${ex.endSeat}</div>
                <div style="font-size: 10px; color: #047857; font-weight: 700;">${endCoachLabel}</div>
             </div>
          </div>
          
          <div style="font-size: 11px; color: #1e293b; margin-top: 15px; font-weight: 500;">
             Class ${userClass}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; border-top: 2px dashed #1e293b; padding-top: 15ßpx;">
           <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase;">Reason</span>
           <span style="font-weight: 600; color: #1e293b;">${ex.requester?.reason || 'Mutual Agreement'}</span>
           </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
           <span style="font-weight: 600; color:#3069b7ff; text-transform: uppercase;">Preference</span>
           <span style="font-weight: 600; color: #1e293b;">${ex.requester?.preference || 'N/A'}</span>
        </div>

        <div style="position: absolute; bottom: 60px; right: 160px; border: 2px double #1d4ed8; color: #1d4ed8; padding: 5px 10px; font-weight: 800; text-transform: uppercase; font-family: sans-serif; transform: rotate(-8deg); text-align: center; opacity: 0.85; border-radius: 6px; background: rgba(255, 255, 255, 0.95); mix-blend-mode: multiply;">
          <div style="font-size: 8px; letter-spacing: 2px; margin-bottom: 1px;">Smart Rail</div>
       
          <div style="font-size: 18px; letter-spacing: 3px; margin-bottom: 2px;">VERIFIED</div>
          <div style="font-size: 24px; line-height: 1; margin: 2px 0;">✔</div>
          <div style="font-size: 9px;">ID: ${ex.exchangeId.slice(-6).toUpperCase()}</div>
        </div>

        <div style="margin-top: 40px; font-size: 9px; text-align: center; color: #64748b; border-top:2px dashed #1e293b; padding-top: 15px;">
          <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">System Generated Receipt • Smart Rail</div>
          This is a third-party exchange for passenger convenient journey only.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // 4. Write to Iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error("Iframe document not accessible");

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // 5. Wait for Render
    // Small delay to ensure styles and fonts are applied
    await new Promise(resolve => setTimeout(resolve, 500));

    const element = doc.getElementById('ticket-content');
    if (!element) throw new Error("Ticket content not found in iframe");

    // 6. Generate Canvas
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: true,
      backgroundColor: '#ffffff'
    });
    console.log("Canvas generated from Iframe successfully");

    // 7. Save PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Calculate size maintaining aspect ratio
    const imgProps = pdf.getImageProperties(imgData);

    // Use smaller width on PDF (e.g., 70% of A4 width or fixed mm)
    // A4 width ~210mm. Let's make ticket ~100mm wide (small) or just fit nicely with margins.
    // User asked for "small size". Let's stick to a reasonable visual width.
    const desiredWidth = 140; // mm (about 2/3 of page width)
    const pdfHeight = (imgProps.height * desiredWidth) / imgProps.width;

    // Center it horizontally with margins? Or top-left?
    // "margin from top left right" -> x=15, y=15
    const marginX = 15;
    const marginY = 15;

    pdf.addImage(imgData, 'PNG', marginX, marginY, desiredWidth, pdfHeight);
    pdf.save(`SmartRail_Ticket_${ex.exchangeId.slice(-6).toUpperCase()}.pdf`);

  } catch (err) {
    console.error("PDF Generation failed in utility:", err);
    alert("Failed to generate PDF ticket. Please try again.");
  } finally {
    // 8. Cleanup
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
};
