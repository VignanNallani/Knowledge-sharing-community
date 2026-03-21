try {
    Write-Host "Testing public slots endpoint without authentication..."
    $response = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings/slots/212?date=2026-03-15' -Method Get -ContentType 'application/json'
    Write-Host "SUCCESS: Public API Response:"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR:" $_.Exception.Message
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
    Write-Host "Response:" $_.Exception.Response.GetResponseStream()
}
