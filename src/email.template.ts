export const htmlTemplate = (ticketNo) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Ticket</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .ticket {
      width: 600px;
      border: 1px solid #ddd;
      padding: 20px;
      box-sizing: border-box;
      margin: 20px auto;
      background-color: #f5f5f5;
    }
    .ticket h1,
    .ticket h3 {
      margin: 0;
      padding: 0;
    }
    .ticket h1 {
      font-size: 24px;
      text-align: center;
    }
    .ticket h3 {
      font-size: 18px;
      text-align: center;
    }
    .ticket-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .ticket-info p {
      margin: 0;
      padding: 0;
    }
    .ticket-details {
      border-top: 1px dashed #ddd;
      padding-top: 10px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <h1>[Event Name]</h1>
    <h3>[Date and Time]</h3>
    <div class="ticket-info">
      <p><b>Venue:</b> [Venue Name]</p>
      <p><b>Seat:</b> [Seat Number]</p>
    </div>
    <div class="ticket-info">
      <p><b>Ticket Holder:</b> [Ticket Holder Name]</p>
      <p><b>Ticket ID:</b> ${ticketNo} </p>
    </div>
    <div class="ticket-details">
      <h3>Additional Information</h3>
      <p>[Additional information or instructions about the event]</p>
    </div>
  </div>
</body>
</html>`;
