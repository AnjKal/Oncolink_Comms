# Cancer Patient Support Chat Tool (CN Component)

This tool is part of a larger project to predict the efficacy of drugs for cancer and to support patients by providing a safe, private space for communication and community building. The CN component focuses on real-time text and video chat for patients, helping them avoid isolation and interact with peers outside of mainstream media.

## Key Features and Advantages

1. **Privacy-Focused, Non-Mainstream Platform**  
   Designed specifically for cancer patients, providing a safe, private space away from mainstream social media, reducing exposure to misinformation, harassment, or unwanted attention.

2. **Real-Time Communication Using WebRTC**  
   - Utilizes WebRTC (Web Real-Time Communication) for peer-to-peer video and audio calls, ensuring low-latency, high-quality interactions without routing media through a central server.
   - WebRTC encrypts all media streams end-to-end (SRTP), so video and audio cannot be intercepted by intermediaries, enhancing patient privacy and data security.

3. **No Persistent Data Storage**  
   - Chat messages and video streams are not stored on the server, reducing the risk of data breaches and ensuring that sensitive patient conversations remain confidential and ephemeral.

4. **Minimal User Data Collection**  
   - Only usernames and session times are temporarily tracked for the purpose of displaying participants, with no requirement for personal information, email, or phone numbers.

5. **Open, Transparent Codebase**  
   - Built using open-source technologies (Node.js, Socket.IO, WebRTC), allowing for code audits and transparency, which is important for research and healthcare applications.

6. **User Empowerment and Control**  
   - Users can mute/unmute their microphone and turn their camera on/off at any time, giving them full control over their participation and privacy.
   - The interface clearly shows who is present in the chat, with join times, fostering a sense of community and trust.

7. **Protection Against Common Web Threats**  
   - All user-generated content is sanitized before display, preventing cross-site scripting (XSS) attacks.
   - No file uploads or external links are allowed in chat, reducing the risk of malware or phishing.

8. **No Third-Party Tracking or Ads**  
   - The platform does not use third-party analytics, cookies, or advertising, ensuring that patient data is not monetized or shared with external entities.

9. **Accessibility and Ease of Use**  
   - The interface is simple, intuitive, and accessible, lowering the barrier for patients who may not be tech-savvy or who are experiencing treatment side effects.

10. **Research and Clinical Integration**  
    - The tool can be integrated into broader research or clinical workflows, providing a secure channel for patient support, group therapy, or remote check-ins.

## Security and Suitability for Patients

- **WebRTC’s End-to-End Encryption:** Unlike many mainstream platforms, WebRTC ensures that only the participants in a call can access the audio/video streams.
- **No Centralized Media Storage:** Media is not stored or processed on a central server, reducing attack surfaces and regulatory burdens (e.g., HIPAA/GDPR).
- **Custom-Built for the Community:** The system is tailored for the needs of cancer patients, avoiding the distractions, risks, and privacy issues of general-purpose social media.
- **Open Source and Auditable:** Researchers and clinicians can verify the security and privacy properties of the system.

---

This CN component is a step toward safer, more supportive digital spaces for cancer patients, empowering them to connect and share in a secure, research-driven environment.
