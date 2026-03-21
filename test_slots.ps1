$loginBody = @{
    email = "vignan123@gmail.com"
    password = "Test1234"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.message.accessToken

Write-Host "Testing slots API with token..."
$slotsResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings/slots/55' -Method Get -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "Response:"
$slotsResponse | ConvertTo-Json -Depth 3
