try {
    Write-Host "Testing public slots API..."
    $response = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings/slots/212?date=2026-03-15' -Method Get -ContentType 'application/json'
    Write-Host "API Response Status: $($response.StatusCode)"
    Write-Host "Response Data:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
