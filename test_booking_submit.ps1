# Test booking submission

## First, get a token as student
try {
    Write-Host "Getting student token..."
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body @{ email = "vignan123@gmail.com"; password = "Test1234" }
    $token = $loginResponse.message.accessToken
    Write-Host "Token received"
    
    ## Test booking submission
    Write-Host "Testing booking submission..."
    $bookingBody = @{
        slotId = "38dd006d-6efe-4488-9f2c-a7bb78fb6c90"  # Sarah Chen's 14:00 slot
        topic = "React hooks discussion"
    }
    
    $bookingResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings' -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -Body $bookingBody
    Write-Host "Booking Response:"
    $bookingResponse | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
