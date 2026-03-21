import path from 'path'
import fs from 'fs'
import ApiResponse from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import asyncHandler from '../middleware/asyncHandler.js'

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded')

  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const fileUrl = `/uploads/${req.file.filename}`
  return ApiResponse.created(res, { message: 'File uploaded', data: { url: fileUrl, filename: req.file.filename } })
})
