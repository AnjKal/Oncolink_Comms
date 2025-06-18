# Oncolink Communications Platform

[![Deployed on Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/)

A secure, real-time communication platform designed for oncology patients to connect with each other and their healthcare providers. The platform focuses on reducing patient isolation through secure peer-to-peer communication while maintaining robust channels for medical consultations and file sharing. All interactions are designed with privacy and security as top priorities.

<!-- Replace the URL below with your actual screenshot URL -->
<img src="YOUR_SCREENSHOT_URL" alt="Oncolink Platform Screenshot" width="800"/>

## Features

### Patient Support Network
- **Secure Text Chat**: Real-time end-to-end encrypted messaging between patients to foster connections and reduce isolation. Messages are encrypted on the client-side using RSA-2048 encryption, ensuring only the intended recipient can decrypt and read them.
- **Video Support Groups**: High-quality video calls with screen sharing capabilities for patient support groups and social interaction
- **Voice Chat**: Clear audio conversations for patients to connect and share experiences

### Medical Communication
- **File Sharing**: Secure document and image sharing with Cloudinary integration between patients and their doctors
- **Appointment Management**: Schedule, reschedule, and manage medical appointments with healthcare providers
- **Medical Query System**: Patients can submit medical queries directly to their doctors

### Security & Accessibility
- **User Authentication**: Secure login with JWT and role-based access control
- **Responsive Design**: Works on desktop and mobile devices for easy access from anywhere

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Deployment**: Can be deployed on any Node.js hosting service

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account (for file storage)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd oncolink-comms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   node server.js
   ```
   This will start the server and automatically open the application in your default browser at `http://localhost:3000`

## Sample Login Credentials

### Doctor Accounts:
- **Email:** doctor1@example.com  
  **Password:** doctor123

- **Email:** doctor2@example.com  
  **Password:** doctor456

### Patient Accounts:
- **Email:** patient1@example.com  
  **Password:** patient123

- **Email:** patient2@example.com  
  **Password:** patient456

## Configuration (Optional)

If you need to customize the configuration, you can create a `.env` file based on `.env.template` with your own settings.

## Project Structure

```
oncolink-comms/
├── config/                 # Configuration files
│   └── cloudinary.js       # Cloudinary configuration
├── middleware/             # Express middleware
│   └── auth.js             # Authentication middleware
├── models/                 # Database models
│   ├── user.js            # User model
│   ├── chat.js            # Chat model
│   ├── appointment.js     # Appointment model
│   └── file.js            # File model
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── images/            # Static images
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── chats.js           # Chat routes
│   └── appointments.js    # Appointment routes
├── utils/                  # Utility functions
│   └── fileUpload.js      # File upload helper
├── views/                  # HTML views
│   ├── doctor/            # Doctor-specific views
│   └── patient/           # Patient-specific views
├── .env.template          # Environment template
├── server.js              # Main application file
└── package.json           # Project configuration
```

## Available Scripts

- `node server.js` - Start the application
- `npm start` - Alias for `node server.js`
- `npm run dev` - Start the development server with nodemon (if configured)
- `npm test` - Run tests (to be implemented)

## Security Features

- **End-to-End Encryption**: All text messages are encrypted using RSA-2048 with OAEP padding and SHA-256 hashing
- **Secure Key Exchange**: Public/private key pairs are generated on the client-side for each session
- **Password Security**: All passwords are hashed using bcrypt before storage
- **Authentication**: JWT tokens are used for secure authentication
- **File Security**: File uploads are scanned for malicious content
- **Rate Limiting**: Protection against brute force attacks on authentication endpoints
- **CORS**: Properly configured to prevent cross-origin attacks
- **Environment Variables**: Sensitive configuration is stored securely in environment variables

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database hosting
- [Cloudinary](https://cloudinary.com/) for file storage
- [Socket.IO](https://socket.io/) for real-time communication
- [Express.js](https://expressjs.com/) for the web framework

## Support

For support, please contact [your-email@example.com](mailto:your-email@example.com) or open an issue in the repository.

---

*This project was developed as part of a university course on web technologies.*
