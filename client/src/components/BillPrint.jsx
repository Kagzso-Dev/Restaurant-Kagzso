/**
 * BillPrint.jsx
 * Opens a new window and prints an 80mm thermal-style receipt.
 * Called from OrderDetailsModal when isPaid === true.
 */

export const printBill = (order, formatPrice, settings = {}) => {
    const isPaid = order.paymentStatus === 'paid';
    const restaurantName = settings.restaurantName || 'KAGZSO RESTAURANT';
    const address = settings.address || '';
    const gstNumber = settings.gstNumber || '';

    const date = new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const activeItems = order.items.filter(
        (item) => item.status !== 'CANCELLED' && item.status !== 'Cancelled'
    );

    const itemRows = activeItems
        .map(
            (item) => `
        <tr>
            <td style="padding:4px 0;font-size:11px;word-break:break-word;vertical-align:top;">${item.name}</td>
            <td style="padding:4px 0;font-size:11px;text-align:center;vertical-align:top;">${item.quantity}</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;vertical-align:top;">${formatPrice(item.price)}</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;font-weight:bold;vertical-align:top;">${formatPrice(item.price * item.quantity)}</td>
        </tr>`
        )
        .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bill — ${order.orderNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 72mm;
    margin: 0 auto;
    padding: 10px 5px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .dash   { border-top: 1px dashed #000; margin: 8px 0; }
  .solid  { border-top: 1px solid  #000; margin: 8px 0; }
  .row    { display:flex; justify-content:space-between; margin:4px 0; font-size:11px; }
  .grand  { display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:6px; }
  table   { width:100%; border-collapse:collapse; margin:6px 0; }
  th      { font-size:10px; text-align:left; padding:4px 0; border-bottom:1px dashed #000; font-weight:bold; }
  .badge  { display:inline-block; border:1.5px solid #000; padding:2px 10px; font-weight:bold; font-size:12px; letter-spacing:1px; margin-top:2px; }
  
  @page {
    margin: 0;
    size: 80mm auto;
  }
  @media print {
    body { width: 72mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="center bold" style="font-size:18px;letter-spacing:1px;text-transform:uppercase;">${restaurantName}</div>
${address ? `<div class="center" style="font-size:10px;margin-top:2px;max-width:200px;margin-left:auto;margin-right:auto;">${address}</div>` : ''}
${gstNumber ? `<div class="center" style="font-size:10px;margin-top:2px;font-weight:bold;">GSTIN: ${gstNumber}</div>` : ''}
<div class="solid"></div>

<div class="row"><span>Order ID</span><span class="bold">${order.orderNumber}</span></div>
<div class="row"><span>Token</span><span class="bold">#${order.tokenNumber || '—'}</span></div>
<div class="row"><span>Date &amp; Time</span><span>${date}</span></div>
<div class="row"><span>Type</span><span class="bold">${order.orderType === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY'}</span></div>
${order.orderType === 'dine-in'
    ? `<div class="row"><span>Table</span><span class="bold">Table ${order.tableId?.number || order.tableId || '—'}</span></div>`
    : ''}

<div class="dash"></div>

<table>
  <thead>
    <tr>
      <th style="width:45%;text-align:left;">ITEM</th>
      <th style="width:10%;text-align:center;">QTY</th>
      <th style="width:20%;text-align:right;">RATE</th>
      <th style="width:25%;text-align:right;">AMT</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<div class="dash"></div>

<div class="row"><span>Subtotal</span><span>${formatPrice(order.totalAmount)}</span></div>
<div class="row"><span>Taxes (GST)</span><span>${formatPrice(order.tax || 0)}</span></div>
${order.discount > 0
    ? `<div class="row"><span>Discount</span><span>&#8722; ${formatPrice(order.discount)}</span></div>`
    : ''}

<div class="solid"></div>
<div class="grand"><span>GRAND TOTAL</span><span>${formatPrice(order.finalAmount)}</span></div>

<div class="dash" style="margin-top:10px;"></div>

<div class="row" style="align-items:center;">
  <span class="bold">PAYMENT</span>
  <span class="badge">${isPaid ? 'PAID' : 'UNPAID'}</span>
</div>
${isPaid && order.paymentMethod
    ? `<div class="row"><span>Method</span><span class="bold">${order.paymentMethod.toUpperCase().replace('_', ' ')}</span></div>`
    : ''}
${order.paidAt
    ? `<div class="row"><span>Paid At</span><span>${new Date(order.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>`
    : ''}

<div class="solid"></div>
<div class="center" style="font-size:11px;margin:10px 0 2px;font-weight:bold;">THANK YOU FOR YOUR VISIT!</div>
<div class="center" style="font-size:10px;color:#555;">Please visit us again soon &#9829;</div>
<div class="center" style="font-size:8px;margin-top:15px;color:#999;letter-spacing:1px;">POWERED BY KAGZSO POS</div>

<script>
  window.onload = function() {
    window.focus();
    setTimeout(() => {
        window.print();
        window.onafterprint = function() { window.close(); };
        // Fallback for browsers that don't support onafterprint or if cancelled
        setTimeout(() => { if(!window.closed) {} }, 1000);
    }, 500);
  };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=450,height=700,scrollbars=yes');
    if (!win) {
        alert('Please allow pop-ups in your browser to print the bill.');
        return;
    }
    
    win.document.write(html);
    win.document.close();
};

