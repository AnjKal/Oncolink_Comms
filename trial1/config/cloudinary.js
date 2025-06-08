const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Custom storage engine for Cloudinary
const storage = {
  _handleFile: function (req, file, cb) {
    // Generate a unique public_id
    const public_id = `oncolink/${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`;
    
    // Determine resource type based on mimetype
    const resource_type = file.mimetype.startsWith('image/') ? 'image' : 'raw';
    
    // Upload to Cloudinary
    const upload_stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resource_type,
        public_id: public_id,
        folder: 'oncolink',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        format: file.mimetype.split('/')[1] || 'jpg'
      },
      function(error, result) {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return cb(error);
        }
        
        // Return file info to be stored in req.file
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          mimetype: file.mimetype,
          originalname: file.originalname
        });
      }
    );
    
    // Pipe the file data to Cloudinary
    file.stream.pipe(upload_stream);
  },
  
  _removeFile: function (req, file, cb) {
    // Optional: Implement file deletion if needed
    cb(null);
  }
};

module.exports = { cloudinary, storage };
