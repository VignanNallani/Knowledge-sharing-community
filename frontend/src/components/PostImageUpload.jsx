import { useState } from 'react'
import api from '../lib/api'

export default function PostImageUpload({ 
  onImageUpload,
  currentImage,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  className = ''
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
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    setError('')

    try {
      // For posts, we'll handle the upload in the create post API
      // So we just return the file to the parent component
      onImageUpload(file)
      setError('')
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Upload failed'
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onImageUpload(null)
    // Reset file input
    const input = document.querySelector('input[type="file"]')
    if (input) input.value = ''
  }

  return (
    <div className={`post-image-upload ${className}`}>
      {preview && (
        <div style={{ marginBottom: '12px', position: 'relative' }}>
          <img 
            src={preview} 
            alt="Post preview" 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #374151'
            }} 
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '4px 8px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✕
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
            padding: '12px 20px',
            background: uploading ? '#6B7280' : '#1F2937',
            color: '#F9FAFB',
            border: '1px solid #374151',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          {uploading ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #ffffff30', 
                borderTop: '2px solid #F9FAFB', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }}></div>
              Uploading image...
            </>
          ) : (
            <>
              📷 Add Image
            </>
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
