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
    // Self-contained styles, NO external CSS, NO Tailwind classes.
    // Using inline styles ensuring 100% compability with html2canvas.
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket</title>
      <style>
        /* Reset defaults to avoid browser inconsistencies */
        body { margin: 0; padding: 20px; font-family: 'Courier New', Courier, monospace; background: #ffffff; }
        * { box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div id="ticket-content" style="background: white; padding: 40px; width: 600px; border: 4px double #00205B; position: relative; color: #333333; margin: 0 auto;">
        
        <div style="text-align: center; border-bottom: 2px solid #00205B; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 24px; font-weight: 900; color: #00205B; text-transform: uppercase; letter-spacing: 2px;">Smart Rail Management System</div>
          <div style="font-size: 16px; font-weight: bold; color: #666666; margin-top: 10px; text-transform: uppercase;">Official Exchange Receipt</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px;">
          <span style="font-weight: bold; color: #888888; text-transform: uppercase;">Passenger Name</span>
          <span style="font-weight: bold; color: #000000;">${userName}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px;">
          <span style="font-weight: bold; color: #888888; text-transform: uppercase;">PNR Number</span>
          <span style="font-weight: bold; color: #000000;">${userPnr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; border-top: 1px dotted #cccccc; padding-top: 15px;">
          <span style="font-weight: bold; color: #888888; text-transform: uppercase;">Exchange ID</span>
          <span style="font-weight: bold; color: #000000;">#${ex.exchangeId.slice(-8).toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px;">
          <span style="font-weight: bold; color: #888888; text-transform: uppercase;">Date & Time</span>
          <span style="font-weight: bold; color: #000000;">${new Date(ex.expiresAt!).toLocaleString()}</span>
        </div>

        <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 25px; margin: 30px 0; text-align: center; border-radius: 10px;">
          <div style="font-weight: bold; color: #888888; text-transform: uppercase; margin-bottom: 10px; font-size: 12px;">Seat Exchange Confirmed</div>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
             <div style="text-align: right;">
                <div style="font-size: 12px; color: #666666; text-transform: uppercase; font-weight: bold;">Old Seat</div> 
                <div style="font-size: 28px; font-weight: 900; color: #64748b;">${ex.startSeat}</div>
                <div style="font-size: 12px; color: #ef4444; font-weight: bold;">${startCoachLabel}</div>
             </div>
             
             <div style="font-size: 30px; color: #00205B;">➜</div>
             
             <div style="text-align: left;">
                <div style="font-size: 12px; color: #666666; text-transform: uppercase; font-weight: bold;">New Seat</div>
                <div style="font-size: 28px; font-weight: 900; color: #00205B;">${ex.endSeat}</div>
                <div style="font-size: 12px; color: #22c55e; font-weight: bold;">${endCoachLabel}</div>
             </div>
          </div>
          
          <div style="font-size: 12px; color: #666666; margin-top: 15px;">
            Class ${userClass}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
           <span style="font-weight: bold; color: #888888; text-transform: uppercase;">Reason</span>
           <span style="font-weight: bold; color: #333333;">${ex.requester?.reason || 'Mutual Agreement'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
           <span style="font-weight: bold; color: #888888; text-transform: uppercase;">Preferences</span>
           <span style="font-weight: bold; color: #333333;">${ex.requester?.preference || 'N/A'}</span>
        </div>

        <div style="position: absolute; bottom: 60px; right: 40px; border: 4px double #22c55e; color: #22c55e; padding: 10px 20px; font-weight: 900; text-transform: uppercase; font-size: 16px; transform: rotate(-15deg); letter-spacing: 2px; text-align: center; opacity: 0.8;">
          Verified<br>Smart Rail
          <div style="font-size: 24px;">✔</div>
        </div>

        <div style="margin-top: 50px; font-size: 10px; text-align: center; color: #aaaaaa; border-top: 1px solid #eeeeee; padding-top: 15px;">
          This is a system-generated receipt for a third-party exchange.<br>
          Authorized by IRCTC Smart Seat System.
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
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
