# WhatsApp Bulk Sender

A simple Node.js script to send messages (text and attachments) to multiple WhatsApp numbers using `whatsapp-web.js`.

## Prerequisites

- Node.js installed.
- A smartphone with WhatsApp.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Configure `config.json`:
    -   **numbers**: Array of phone numbers (include country code, no `+` or spaces, e.g., `"919876543210"`).
    -   **message**: The text message to send.
    -   **attachments**: Array of absolute paths to files (images, pdfs, etc.) to send. Leave empty `[]` if sending only text.

    Example `config.json`:
    ```json
    {
      "numbers": [
        "919876543210",
        "15551234567"
      ],
      "message": "Hello from Node.js!",
      "attachments": [
        "C:/Users/ASUS/Pictures/image.png",
        "C:/Users/ASUS/Documents/file.pdf"
      ]
    }
    ```

## Usage

1.  Run the script:
    ```bash
    node index.js
    ```

2.  A QR code will appear in the terminal.
3.  Open WhatsApp on your phone -> **Menu** (or Settings) -> **Linked Devices** -> **Link a Device**.
4.  Scan the QR code.
5.  The script will send messages to the configured numbers.

## Notes

-   **Ban Risk**: Sending bulk messages to people who haven't saved your number can lead to your WhatsApp account being banned. Use responsibly.
-   **Session**: The script stores session data locally (in `.wwebjs_auth`). You won't need to scan the QR code every time.
