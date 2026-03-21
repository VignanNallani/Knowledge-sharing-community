# Test GET /api/v1/bookings/my endpoint

try {
    Write-Host "Testing GET /api/v1/bookings/my endpoint..."
    
    # This should return 401 without auth (route is working)
    $response = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings/my' -Method Get -Headers @{ 'Accept' = 'application/json' }
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Body: $($response.Content)"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
