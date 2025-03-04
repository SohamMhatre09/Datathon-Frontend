import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_emails(email_list, subject, message, sender_email, sender_password):
    try:
        # Gmail SMTP Server
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Start server
        server = smtplib.SMTP(smtp_server, port)
        server.starttls()
        server.login(sender_email, sender_password)

        for email in email_list:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = email
            msg['Subject'] = subject

            # Email body
            msg.attach(MIMEText(message, 'plain'))

            # Send mail
            server.sendmail(sender_email, email, msg.as_string())
            print(f"Email sent to {email}")

        server.quit()
        print("All emails sent successfully!")

    except Exception as e:
        print(f"Error: {e}")

# Usage
email_list = ['sohammhatrewhatsapp@gmail.com']
subject = 'Test Email'
message = 'Hello, this is a test email from Python!'
sender_email = 'ichbinsoham@gmail.com'
sender_password = 'your_app_password'  # App password from Google

send_emails(email_list, subject, message, sender_email, sender_password)
