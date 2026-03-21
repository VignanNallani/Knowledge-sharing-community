import { useState } from 'react'
import api from '../lib/api'

export default function ImageUpload({ 
  onUploadSuccess, 
  onUploadError,
  currentImage,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
  buttonText = 'Upload Image',
  showPreview = true
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentImage || null)
  const [error, setError] = useState('')

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError('Only image files are allowed (jpg, jpeg, png, gif, webp)')
      onUploadError('Invalid file type')
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`)
      onUploadError('File too large')
      return
    }

    // Create preview
    if (showPreview) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
    }

    // Upload file
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await api.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const imageUrl = response.data.data.imageUrl
      setPreview(imageUrl)
      onUploadSuccess(imageUrl, response.data.data.profile)
      setError('')
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Upload failed'
      setError(errorMessage)
      onUploadError(errorMessage)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onUploadSuccess(null)
  }

  return (
    <div className={`image-upload ${className}`}>
      {showPreview && preview && (
        <div style={{ marginBottom: '12px' }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              width: '100%', 
              maxWidth: '200px', 
              height: '200px', 
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #374151'
            }} 
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        </div>
      )}
      
      <div style={{ position: 'relative' }}>
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        />
        <button
          type="button"
          disabled={uploading}
          style={{
            padding: '8px 16px',
            background: uploading ? '#6B7280' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {uploading ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #ffffff30', 
                borderTop: '2px solid white', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }}></div>
              Uploading...
            </>
          ) : (
            buttonText
          )}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          marginTop: '8px', 
          color: '#EF4444', 
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          {error}
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
