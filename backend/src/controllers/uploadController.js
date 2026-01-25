import path from 'path'
import fs from 'fs'

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    // Ensure uploads dir exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    // File is already saved by multer to uploads/
    const fileUrl = `/uploads/${req.file.filename}`
    res.status(201).json({ url: fileUrl, filename: req.file.filename })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
}
